const { getDb } = require('../database/database');

class Member {
  // Add a user to a group as a member
  static async addToGroup(groupId, userId, memberNumber = null) {
    const db = getDb();
    
    // Check if already a member
    const existing = await db.get(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (existing) {
      throw new Error('User is already a member of this group');
    }
    
    // Generate member number if not provided
    if (!memberNumber) {
      const count = await db.get(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
        [groupId]
      );
      memberNumber = `MEM${groupId}${(count.count + 1).toString().padStart(3, '0')}`;
    }
    
    const result = await db.run(
      `INSERT INTO group_members (group_id, user_id, member_number, status)
       VALUES (?, ?, ?, ?)`,
      [groupId, userId, memberNumber, 'active']
    );
    
    // Update user's group_id
    await db.run('UPDATE users SET group_id = ? WHERE id = ?', [groupId, userId]);
    
    return { id: result.lastID, group_id: groupId, user_id: userId, member_number: memberNumber };
  }
  
  // Remove a member from a group
  static async removeFromGroup(groupId, userId) {
    const db = getDb();
    
    // Check if member has outstanding loans
    const outstandingLoans = await db.get(
      `SELECT COUNT(*) as count FROM loans 
       WHERE group_id = ? AND member_id = ? AND status IN ('active', 'pending')`,
      [groupId, userId]
    );
    
    if (outstandingLoans.count > 0) {
      throw new Error('Cannot remove member with outstanding loans');
    }
    
    // Update status to inactive instead of deleting
    await db.run(
      `UPDATE group_members 
       SET status = 'inactive' 
       WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );
    
    // Update user's group_id
    await db.run('UPDATE users SET group_id = NULL WHERE id = ?', [userId]);
    
    return true;
  }
  
  // Get all members of a group
  static async getGroupMembers(groupId) {
    const db = getDb();
    
    return await db.all(
      `SELECT 
         u.id,
         u.email,
         u.full_name,
         u.is_signatory,
         u.role,
         gm.member_number,
         gm.join_date,
         gm.status,
         gm.total_contributions,
         gm.total_interest_earned
       FROM users u
       INNER JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY gm.join_date DESC`,
      [groupId]
    );
  }
  
  // Get a single member by ID
  static async getMemberById(groupId, userId) {
    const db = getDb();
    
    return await db.get(
      `SELECT 
         u.id,
         u.email,
         u.full_name,
         u.is_signatory,
         u.role,
         gm.member_number,
         gm.join_date,
         gm.status,
         gm.total_contributions,
         gm.total_interest_earned
       FROM users u
       INNER JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND u.id = ?`,
      [groupId, userId]
    );
  }
  
  // Update member information
  static async updateMember(groupId, userId, updateData) {
    const db = getDb();
    const { is_signatory, status } = updateData;
    
    if (is_signatory !== undefined) {
      await db.run(
        'UPDATE users SET is_signatory = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [is_signatory ? 1 : 0, userId]
      );
    }
    
    if (status !== undefined) {
      await db.run(
        'UPDATE group_members SET status = ? WHERE group_id = ? AND user_id = ?',
        [status, groupId, userId]
      );
    }
    
    return await this.getMemberById(groupId, userId);
  }
  
  // Update member's total contributions
  static async updateContributions(userId, amount) {
    const db = getDb();
    
    await db.run(
      `UPDATE group_members 
       SET total_contributions = total_contributions + ?
       WHERE user_id = ?`,
      [amount, userId]
    );
  }
  
  // Update member's total interest earned
  static async updateInterestEarned(userId, interest) {
    const db = getDb();
    
    await db.run(
      `UPDATE group_members 
       SET total_interest_earned = total_interest_earned + ?
       WHERE user_id = ?`,
      [interest, userId]
    );
  }
  
  // Check if user is a member of a group - FIXED
  static async isMember(groupId, userId) {
    const db = getDb();
    
    const member = await db.get(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = "active"',
      [groupId, userId]
    );
    
    // Returns true if member exists, false if not
    return !!member;
  }
  
  // Get member statistics
  static async getMemberStats(groupId, userId) {
    const db = getDb();
    
    const stats = await db.get(
      `SELECT 
         (SELECT COUNT(*) FROM contributions WHERE group_id = ? AND member_id = ? AND status = 'approved') as contribution_count,
         (SELECT SUM(amount) FROM contributions WHERE group_id = ? AND member_id = ? AND status = 'approved') as total_contributed,
         (SELECT COUNT(*) FROM loans WHERE group_id = ? AND member_id = ? AND status = 'active') as active_loans,
         (SELECT SUM(balance) FROM loans WHERE group_id = ? AND member_id = ? AND status = 'active') as loan_balance
       `,
      [groupId, userId, groupId, userId, groupId, userId, groupId, userId]
    );
    
    return stats;
  }
}

module.exports = Member;