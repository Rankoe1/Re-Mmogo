// this file contains the authentication and authorization middleware functions for the application
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-only-secret');
    const db = getDb();
    const user = await db.get(
      'SELECT id, email, full_name, role, is_signatory, group_id FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const requireSignatory = async (req, res, next) => {
  if (!req.user.is_signatory && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Signatory access required' });
  }
  next();
};

const requireAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireGroupAccess = async (req, res, next) => {
  const groupId = parseInt(req.params.groupId) || parseInt(req.body.group_id);
  
  if (!groupId) {
    return res.status(400).json({ error: 'Group ID required' });
  }

  const db = getDb();
  
  // Check if user belongs to the group or is admin
  if (req.user.role === 'admin') {
    return next();
  }

  const membership = await db.get(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.user.id]
  );

  if (!membership && req.user.group_id !== groupId) {
    return res.status(403).json({ error: 'Access denied to this group' });
  }

  next();
};

module.exports = { authenticateToken, requireSignatory, requireAdmin, requireGroupAccess };
