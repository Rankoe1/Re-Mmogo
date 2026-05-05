// these are the controller functions that handle all the member related operations
const { validationResult } = require('express-validator');
const { getDb } = require('../database/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.addMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { email, full_name, is_signatory } = req.body;
    const groupId = req.params.groupId;

    // Check if group exists
    const group = await db.get('SELECT id FROM groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user already exists
    let user = await User.findByEmail(email);

    if (!user) {
      // Create new user with default password
      const defaultPassword = 'Member@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const result = await db.run(
        `INSERT INTO users (email, password, full_name, is_signatory, group_id)
         VALUES (?, ?, ?, ?, ?)`,
        [email, hashedPassword, full_name, is_signatory || 0, groupId]
      );

      user = { id: result.lastID };
    } else {
      // Update existing user's group
      await db.run('UPDATE users SET group_id = ?, is_signatory = ? WHERE id = ?',
        [groupId, is_signatory || 0, user.id]);
    }

    // Check if already a member
    const existingMember = await db.get(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, user.id]
    );

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Get member count for member number
    const memberCount = await db.get('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?', [groupId]);
    const memberNumber = `MEM${groupId}${(memberCount.count + 1).toString().padStart(3, '0')}`;

    // Add to group members
    await db.run(
      `INSERT INTO group_members (group_id, user_id, member_number, status)
       VALUES (?, ?, ?, ?)`,
      [groupId, user.id, memberNumber, 'active']
    );

    res.status(201).json({
      message: 'Member added successfully',
      member: {
        user_id: user.id,
        email,
        full_name,
        member_number: memberNumber,
        is_signatory: is_signatory || 0
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Error adding member' });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const db = getDb();
    const { memberId } = req.params;
    const { full_name, is_signatory } = req.body;

    await db.run(
      'UPDATE users SET full_name = ?, is_signatory = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [full_name, is_signatory || 0, memberId]
    );

    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Error updating member' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const db = getDb();
    const { memberId, groupId } = req.params;

    // Check if member has any outstanding loans
    const outstandingLoans = await db.get(
      'SELECT COUNT(*) as count FROM loans WHERE member_id = ? AND status IN ("active", "pending")',
      [memberId]
    );

    if (outstandingLoans.count > 0) {
      return res.status(400).json({ error: 'Cannot remove member with outstanding loans' });
    }

    // Update group_members status to inactive
    await db.run(
      'UPDATE group_members SET status = "inactive" WHERE group_id = ? AND user_id = ?',
      [groupId, memberId]
    );

    // Update user's group_id
    await db.run('UPDATE users SET group_id = NULL WHERE id = ?', [memberId]);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Error removing member' });
  }
};

exports.updateMemberStatus = async (req, res) => {
  try {
    const db = getDb();
    const { memberId, groupId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.run(
      'UPDATE group_members SET status = ? WHERE group_id = ? AND user_id = ?',
      [status, groupId, memberId]
    );

    res.json({ message: `Member status updated to ${status}` });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error updating member status' });
  }
};

exports.getMemberContributions = async (req, res) => {
  try {
    const db = getDb();
    const { memberId, groupId } = req.params;

    const contributions = await db.all(
      `SELECT * FROM contributions 
       WHERE member_id = ? AND group_id = ?
       ORDER BY year DESC, month DESC`,
      [memberId, groupId]
    );

    const summary = await db.get(
      `SELECT 
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        COUNT(*) as total_contributions
       FROM contributions 
       WHERE member_id = ? AND group_id = ?`,
      [memberId, groupId]
    );

    res.json({ contributions, summary });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ error: 'Error fetching contributions' });
  }
};

exports.getMemberLoans = async (req, res) => {
  try {
    const db = getDb();
    const { memberId, groupId } = req.params;

    const loans = await db.all(
      `SELECT l.*, 
              COUNT(lp.id) as payment_count,
              SUM(lp.amount) as total_paid
       FROM loans l
       LEFT JOIN loan_payments lp ON l.id = lp.loan_id AND lp.status = 'approved'
       WHERE l.member_id = ? AND l.group_id = ?
       GROUP BY l.id
       ORDER BY l.application_date DESC`,
      [memberId, groupId]
    );

    res.json(loans);
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Error fetching loans' });
  }
};

exports.getMemberStatement = async (req, res) => {
  try {
    const db = getDb();
    const { memberId, groupId } = req.params;
    const { year } = req.query;

    let query = `
      SELECT 'contribution' as type, id, amount, payment_date as date, status, notes, NULL as loan_id
      FROM contributions
      WHERE member_id = ? AND group_id = ?
    `;
    let params = [memberId, groupId];

    if (year) {
      query += ` AND year = ?`;
      params.push(year);
    }

    query += `
      UNION ALL
      SELECT 'loan_payment' as type, id, amount, payment_date as date, status, notes, loan_id
      FROM loan_payments
      WHERE member_id = ? AND group_id = ?
    `;
    params.push(memberId, groupId);

    if (year) {
      query += ` AND strftime('%Y', payment_date) = ?`;
      params.push(year);
    }

    query += ` ORDER BY date DESC`;

    const statement = await db.all(query, params);

    // Get member info
    const member = await db.get(
      `SELECT u.full_name, u.email, gm.member_number, gm.total_contributions, gm.total_interest_earned
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE u.id = ? AND gm.group_id = ?`,
      [memberId, groupId]
    );

    res.json({ member, statement });
  } catch (error) {
    console.error('Get statement error:', error);
    res.status(500).json({ error: 'Error fetching member statement' });
  }
  exports.getAllMembers = async (req, res) => {
    try {
      const db = getDb();
      let members;

      if (req.user.role === 'admin') {
        members = await db.all(
          `SELECT u.id, u.full_name, u.email, u.is_signatory, u.group_id,
                gm.member_number, gm.status, g.name as group_name
         FROM users u
         LEFT JOIN group_members gm ON u.id = gm.user_id AND gm.status = 'active'
         LEFT JOIN groups g ON gm.group_id = g.id
         WHERE u.role != 'admin'
         ORDER BY u.full_name`
        );
      } else {
        members = await db.all(
          `SELECT u.id, u.full_name, u.email, u.is_signatory, u.group_id,
                gm.member_number, gm.status, g.name as group_name
         FROM users u
         JOIN group_members gm ON u.id = gm.user_id
         JOIN groups g ON gm.group_id = g.id
         WHERE gm.group_id = ? AND gm.status = 'active'
         ORDER BY u.full_name`,
          [req.user.group_id]
        );
      }

      res.json(members);
    } catch (error) {
      console.error('Get all members error:', error);
      res.status(500).json({ error: 'Error fetching members' });
    }
  };
};