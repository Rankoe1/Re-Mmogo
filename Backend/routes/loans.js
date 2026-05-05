// these are the routes that handle all loan related operations
const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authenticateToken, requireSignatory, requireGroupAccess } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { body } = require('express-validator');

const createLoanValidation = [
  body('principal_amount').isFloat({ min: 0 }).withMessage('Principal amount must be positive'),
  body('notes').optional().trim()
];

const paymentValidation = [
  body('amount').isFloat({ min: 0 }).withMessage('Payment amount must be positive')
];

router.get('/', authenticateToken, loanController.getAllLoans);
router.post('/:groupId/loans', authenticateToken, createLoanValidation, loanController.applyForLoan);
router.get('/:groupId/loans', authenticateToken, requireGroupAccess, loanController.getGroupLoans);
router.get('/:groupId/loans/pending', authenticateToken, requireSignatory, loanController.getPendingLoans);
router.put('/:groupId/loans/:loanId/approve', authenticateToken, requireSignatory, loanController.approveLoan);
router.put('/:groupId/loans/:loanId/disburse', authenticateToken, requireSignatory, loanController.disburseLoan);
router.post('/:groupId/loans/:loanId/payments', authenticateToken, upload.single('proof'), paymentValidation, loanController.makeLoanPayment);
router.get('/:groupId/loans/:loanId/payments', authenticateToken, requireGroupAccess, loanController.getLoanPayments);
router.put('/:groupId/loans/payments/:paymentId/approve', authenticateToken, requireSignatory, loanController.approveLoanPayment);

module.exports = router;