// these are the routes that handle all contributuion related operations
const express = require('express');
const router = express.Router();
const contributionController = require('../controllers/contributionController');
const { authenticateToken, requireSignatory, requireGroupAccess } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { body } = require('express-validator');

const createContributionValidation = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('month').optional().isInt({ min: 1, max: 12 }),
  body('year').optional().isInt({ min: 2020, max: 2030 }),
  body('payment_date').optional().isDate()
];

router.get('/', authenticateToken, contributionController.getAllContributions);
router.post('/:groupId/contributions', authenticateToken, upload.single('proof'), createContributionValidation, contributionController.createContribution);
router.get('/:groupId/contributions', authenticateToken, requireGroupAccess, contributionController.getGroupContributions);
router.get('/:groupId/contributions/pending', authenticateToken, requireSignatory, contributionController.getPendingContributions);
router.put('/:groupId/contributions/:contributionId/approve', authenticateToken, requireSignatory, contributionController.approveContribution);
router.put('/:groupId/contributions/:contributionId/reject', authenticateToken, requireSignatory, contributionController.rejectContribution);
router.get('/:groupId/contributions/summary', authenticateToken, requireGroupAccess, contributionController.getContributionSummary);

module.exports = router;