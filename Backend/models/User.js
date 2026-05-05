// this file contains the user model that interacts with the tables and handles all user related database operations
const { getDb } = require('../database/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  static async create(userData) {
    const db = getDb();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const result = await db.run(
      `INSERT INTO users (email, password, full_name, role, is_signatory, group_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userData.email, hashedPassword, userData.full_name, userData.role || 'member', 
       userData.is_signatory || 0, userData.group_id || null]
    );
    
    return { id: result.lastID, ...userData, password: undefined };
  }

  static async findByEmail(email) {
    const db = getDb();
    return await db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findById(id) {
    const db = getDb();
    return await db.get(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_signatory, u.group_id, u.created_at,
              g.name as group_name
       FROM users u
       LEFT JOIN groups g ON u.group_id = g.id
       WHERE u.id = ?`,
      [id]
    );
  }

  static async update(id, updateData) {
    const db = getDb();
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'password') {
        const hashedPassword = await bcrypt.hash(value, 10);
        fields.push('password = ?');
        values.push(hashedPassword);
      } else if (key !== 'id' && key !== 'email') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    await db.run(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }

  static async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }

  static generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'development-only-secret', {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  }
}

module.exports = User;
