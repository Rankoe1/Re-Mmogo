//these are the routes that handle all member related operations
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticateToken, requireSignatory, requireGroupAccess } = require('../middleware/auth');
const { body } = require('express-validator');

const addMemberValidation = [
  body('email').isEmail().normalizeEmail(),
  body('full_name').notEmpty().trim(),
  body('is_signatory').optional().isBoolean()
];

router.post('/:groupId/members', authenticateToken, requireSignatory, addMemberValidation, memberController.addMember);
router.put('/:groupId/members/:memberId', authenticateToken, requireSignatory, memberController.updateMember);
router.delete('/:groupId/members/:memberId', authenticateToken, requireSignatory, memberController.removeMember);
router.put('/:groupId/members/:memberId/status', authenticateToken, requireSignatory, memberController.updateMemberStatus);
router.get('/:groupId/members/:memberId/contributions', authenticateToken, requireGroupAccess, memberController.getMemberContributions);
router.get('/:groupId/members/:memberId/loans', authenticateToken, requireGroupAccess, memberController.getMemberLoans);
router.get('/:groupId/members/:memberId/statement', authenticateToken, requireGroupAccess, memberController.getMemberStatement);

module.exports = router;