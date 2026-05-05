// these are the controller functions that handle all the member related operations
const { validationResult } = require('express-validator');
const { getDb } = require('../database/database');
const User = require('../models/User');
const Member = require('../models/Member');
const bcrypt = require('bcryptjs');

exports.addMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { email, full_name, is_signatory } = req.body;
    const groupId = parseInt(req.params.groupId);
    
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
        [email, hashedPassword, full_name, is_signatory ? 1 : 0, groupId]
      );
      
      user = { id: result.lastID };
    } else {
      // Update existing user's group and signatory status
      await db.run(
        'UPDATE users SET group_id = ?, is_signatory = ? WHERE id = ?', 
        [groupId, is_signatory ? 1 : 0, user.id]
      );
    }
    
    // Add to group members using the Member model
    const member = await Member.addToGroup(groupId, user.id);
    
    // Get the complete member details
    const memberDetails = await Member.getMemberById(groupId, user.id);
    
    res.status(201).json({
      message: 'Member added successfully',
      member: memberDetails
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: error.message || 'Error adding member' });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    const { full_name, is_signatory, status } = req.body;
    
    const db = getDb();
    
    // Update user info
    if (full_name) {
      await db.run(
        'UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [full_name, memberId]
      );
    }
    
    // Update member info
    const updatedMember = await Member.updateMember(groupId, memberId, {
      is_signatory,
      status
    });
    
    res.json({
      message: 'Member updated successfully',
      member: updatedMember
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Error updating member' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    
    await Member.removeFromGroup(groupId, memberId);
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: error.message || 'Error removing member' });
  }
};

exports.updateMemberStatus = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updatedMember = await Member.updateMember(groupId, memberId, { status });
    
    res.json({
      message: `Member status updated to ${status}`,
      member: updatedMember
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error updating member status' });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    
    const members = await Member.getGroupMembers(groupId);
    
    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Error fetching members' });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    
    const member = await Member.getMemberById(groupId, memberId);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const stats = await Member.getMemberStats(groupId, memberId);
    
    res.json({ ...member, stats });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Error fetching member' });
  }
};

exports.getMemberContributions = async (req, res) => {
  try {
    const db = getDb();
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    
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
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    
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