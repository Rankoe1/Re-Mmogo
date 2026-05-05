// the routes that handle all report related operations
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireGroupAccess } = require('../middleware/auth');

router.get('/:groupId/year-end', authenticateToken, requireGroupAccess, reportController.getYearEndReport);
router.get('/:groupId/member-ranking', authenticateToken, requireGroupAccess, reportController.getMemberRanking);
router.get('/:groupId/interest-report', authenticateToken, requireGroupAccess, reportController.getInterestReport);
router.get('/:groupId/contribution-report', authenticateToken, requireGroupAccess, reportController.getContributionReport);
router.get('/:groupId/loan-report', authenticateToken, requireGroupAccess, reportController.getLoanReport);

module.exports = router;