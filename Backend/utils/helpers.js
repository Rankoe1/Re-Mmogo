// these are helper functions that can be used across the application
const calculateInterest = (principal, rate, months = 1) => {
  return (principal * rate * months) / 100;
};

const generateMemberNumber = (groupId, sequence) => {
  return `MEM${groupId}${sequence.toString().padStart(3, '0')}`;
};

const calculateLoanRepayment = (principal, monthlyPayment, interestRate) => {
  const monthlyInterest = interestRate / 100;
  const months = Math.ceil(Math.log(monthlyPayment / (monthlyPayment - principal * monthlyInterest)) / Math.log(1 + monthlyInterest));
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - principal;
  
  return { months, totalPayment, totalInterest };
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP' }).format(amount);
};

const validateProofFile = (file) => {
  if (!file) return true;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return allowedTypes.includes(file.mimetype) && file.size <= maxSize;
};

module.exports = {
  calculateInterest,
  generateMemberNumber,
  calculateLoanRepayment,
  formatCurrency,
  validateProofFile
};