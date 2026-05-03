// these are the validation rules for the various endpoints in the application
const { body } = require('express-validator');

const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email');

const validatePassword = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

const validateAmount = body('amount')
  .isFloat({ min: 0 })
  .withMessage('Amount must be a positive number');

const validateGroupId = body('group_id')
  .isInt({ min: 1 })
  .withMessage('Valid group ID is required');

const validateMemberId = body('member_id')
  .isInt({ min: 1 })
  .withMessage('Valid member ID is required');

const validateLoanId = body('loan_id')
  .isInt({ min: 1 })
  .withMessage('Valid loan ID is required');

const validateMonth = body('month')
  .optional()
  .isInt({ min: 1, max: 12 })
  .withMessage('Month must be between 1 and 12');

const validateYear = body('year')
  .optional()
  .isInt({ min: 2020, max: 2030 })
  .withMessage('Year must be between 2020 and 2030');

module.exports = {
  validateEmail,
  validatePassword,
  validateAmount,
  validateGroupId,
  validateMemberId,
  validateLoanId,
  validateMonth,
  validateYear
};