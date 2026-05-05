//these are the routes that handle all member related operations
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticateToken, requireSignatory, requireGroupAccess } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules for adding a member
const addMemberValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('full_name').notEmpty().trim().withMessage('Full name is required'),
  body('is_signatory').optional().isBoolean().withMessage('is_signatory must be boolean')
];

// Routes
router.post('/:groupId/members', 
  authenticateToken, 
  requireSignatory, 
  addMemberValidation, 
  memberController.addMember
);

router.get('/:groupId/members', 
  authenticateToken, 
  requireGroupAccess, 
  memberController.getGroupMembers
);

router.get('/:groupId/members/:memberId', 
  authenticateToken, 
  requireGroupAccess, 
  memberController.getMemberById
);

router.put('/:groupId/members/:memberId', 
  authenticateToken, 
  requireSignatory, 
  memberController.updateMember
);

router.delete('/:groupId/members/:memberId', 
  authenticateToken, 
  requireSignatory, 
  memberController.removeMember
);

router.put('/:groupId/members/:memberId/status', 
  authenticateToken, 
  requireSignatory, 
  memberController.updateMemberStatus
);

router.get('/:groupId/members/:memberId/contributions', 
  authenticateToken, 
  requireGroupAccess, 
  memberController.getMemberContributions
);

router.get('/:groupId/members/:memberId/loans', 
  authenticateToken, 
  requireGroupAccess, 
  memberController.getMemberLoans
);

module.exports = router;