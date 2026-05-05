// these are the controller functions that handle all group related operations
const { validationResult } = require('express-validator');
const { getDb } = require('../database/database');

exports.createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { name, registration_number, description, monthly_contribution, interest_rate, target_interest } = req.body;
    
    const result = await db.run(
      `INSERT INTO groups (name, registration_number, description, monthly_contribution, interest_rate, target_interest, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, registration_number || null, description || null, monthly_contribution || 1000, interest_rate || 20, target_interest || 5000, req.user.id]
    );
    
    // Add creator as group member
    await db.run(
      `INSERT INTO group_members (group_id, user_id, member_number, status)
       VALUES (?, ?, ?, ?)`,
      [result.lastID, req.user.id, `MEM${result.lastID}001`, 'active']
    );
    
    // Update user's group_id
    await db.run('UPDATE users SET group_id = ? WHERE id = ?', [result.lastID, req.user.id]);
    
    const group = await db.get('SELECT * FROM groups WHERE id = ?', [result.lastID]);
    
    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Error creating group' });
  }
};

exports.getUserGroups = async (req, res) => {
  try {
    const db = getDb();
    
    let groups;
    if (req.user.role === 'admin') {
      groups = await db.all('SELECT * FROM groups ORDER BY created_at DESC');
    } else {
      groups = await db.all(
        `SELECT g.* FROM groups g
         INNER JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ?
         ORDER BY g.created_at DESC`,
        [req.user.id]
      );
    }
    
    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Error fetching groups' });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const db = getDb();
    const group = await db.get('SELECT * FROM groups WHERE id = ?', [req.params.groupId]);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Error fetching group' });
  }
};

exports.updateGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { name, description, monthly_contribution, interest_rate, target_interest } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (monthly_contribution) { updates.push('monthly_contribution = ?'); values.push(monthly_contribution); }
    if (interest_rate) { updates.push('interest_rate = ?'); values.push(interest_rate); }
    if (target_interest) { updates.push('target_interest = ?'); values.push(target_interest); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.groupId);
    
    await db.run(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const updatedGroup = await db.get('SELECT * FROM groups WHERE id = ?', [req.params.groupId]);
    res.json({ message: 'Group updated successfully', group: updatedGroup });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Error updating group' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const db = getDb();
    const group = await db.get('SELECT id FROM groups WHERE id = ?', [req.params.groupId]);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    await db.run('DELETE FROM groups WHERE id = ?', [req.params.groupId]);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Error deleting group' });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const db = getDb();
    const members = await db.all(
      `SELECT u.id, u.email, u.full_name, u.is_signatory, gm.member_number, gm.join_date, gm.status,
              gm.total_contributions, gm.total_interest_earned
       FROM users u
       INNER JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ?
       ORDER BY gm.join_date DESC`,
      [req.params.groupId]
    );
    
    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Error fetching members' });
  }
};

exports.getGroupSummary = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    
    // Get total members
    const memberCount = await db.get('SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = "active"', [groupId]);
    
    // Get total contributions
    const totalContributions = await db.get(
      `SELECT SUM(amount) as total FROM contributions WHERE group_id = ? AND status = 'approved'`,
      [groupId]
    );
    
    // Get active loans
    const activeLoans = await db.get(
      `SELECT COUNT(*) as count, SUM(balance) as total_balance FROM loans WHERE group_id = ? AND status = 'active'`,
      [groupId]
    );
    
    // Get pending approvals
    const pendingContributions = await db.get(
      `SELECT COUNT(*) as count FROM contributions WHERE group_id = ? AND status = 'pending'`,
      [groupId]
    );
    
    const pendingLoans = await db.get(
      `SELECT COUNT(*) as count FROM loans WHERE group_id = ? AND status = 'pending'`,
      [groupId]
    );
    
    // Get total interest earned
    const totalInterest = await db.get(
      `SELECT SUM(interest_paid) as total FROM loan_payments WHERE status = 'approved'`,
      []
    );
    
    res.json({
      total_members: memberCount?.count || 0,
      total_contributions: totalContributions?.total || 0,
      active_loans: activeLoans?.count || 0,
      total_loan_balance: activeLoans?.total_balance || 0,
      pending_approvals: {
        contributions: pendingContributions?.count || 0,
        loans: pendingLoans?.count || 0
      },
      total_interest_earned: totalInterest?.total || 0
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Error fetching group summary' });
  }
};