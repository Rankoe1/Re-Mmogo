// the routes handling all group related operations 
const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken, requireAdmin, requireGroupAccess } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules
const createGroupValidation = [
  body('name').notEmpty().trim().withMessage('Group name is required'),
  body('registration_number').optional().trim(),
  body('description').optional().trim(),
  body('monthly_contribution').optional().isFloat({ min: 0 }),
  body('interest_rate').optional().isFloat({ min: 0, max: 100 }),
  body('target_interest').optional().isFloat({ min: 0 })
];

const updateGroupValidation = [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('monthly_contribution').optional().isFloat({ min: 0 }),
  body('interest_rate').optional().isFloat({ min: 0, max: 100 }),
  body('target_interest').optional().isFloat({ min: 0 })
];

// Routes
router.post('/', authenticateToken, createGroupValidation, groupController.createGroup);
router.get('/', authenticateToken, groupController.getUserGroups);
router.get('/:groupId', authenticateToken, requireGroupAccess, groupController.getGroupById);
router.put('/:groupId', authenticateToken, requireAdmin, updateGroupValidation, groupController.updateGroup);
router.delete('/:groupId', authenticateToken, requireAdmin, groupController.deleteGroup);
router.get('/:groupId/members', authenticateToken, requireGroupAccess, groupController.getGroupMembers);
router.get('/:groupId/summary', authenticateToken, requireGroupAccess, groupController.getGroupSummary);

module.exports = router;