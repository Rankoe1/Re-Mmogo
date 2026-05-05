// these are the controller functions that handle all loan related operations
const { validationResult } = require('express-validator');
const { getDb } = require('../database/database');

exports.applyForLoan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { principal_amount, notes } = req.body;
    const groupId = req.params.groupId;
    const memberId = req.user.id;

    // Check if member has sufficient contributions
    const contributions = await db.get(
      `SELECT SUM(amount) as total FROM contributions 
       WHERE member_id = ? AND group_id = ? AND status = 'approved'`,
      [memberId, groupId]
    );

    // Basic rule: Loan cannot exceed total contributions (optional rule)
    if ((contributions.total || 0) < principal_amount * 0.5) {
      return res.status(400).json({ error: 'Loan amount too high relative to contributions' });
    }

    const interestRate = 20; // 20% monthly interest as per requirements

    const result = await db.run(
      `INSERT INTO loans (group_id, member_id, principal_amount, balance, interest_rate, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [groupId, memberId, principal_amount, principal_amount, interestRate, notes || null, 'pending']
    );

    res.status(201).json({
      message: 'Loan application submitted, pending approval',
      loan_id: result.lastID
    });
  } catch (error) {
    console.error('Apply for loan error:', error);
    res.status(500).json({ error: 'Error applying for loan' });
  }
};

exports.getGroupLoans = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    const { status } = req.query;

    let query = `
      SELECT l.*, u.full_name as member_name, gm.member_number,
             s1.full_name as signatory1_name,
             s2.full_name as signatory2_name
      FROM loans l
      JOIN users u ON l.member_id = u.id
      JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN users s1 ON l.approved_by_signatory1 = s1.id
      LEFT JOIN users s2 ON l.approved_by_signatory2 = s2.id
      WHERE l.group_id = ?
    `;
    let params = [groupId];

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY l.application_date DESC`;

    const loans = await db.all(query, params);
    res.json(loans);
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Error fetching loans' });
  }
};

exports.getPendingLoans = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;

    const pending = await db.all(
      `SELECT l.*, u.full_name as member_name, gm.member_number
       FROM loans l
       JOIN users u ON l.member_id = u.id
       JOIN group_members gm ON u.id = gm.user_id
       WHERE l.group_id = ? AND l.status = 'pending'
       ORDER BY l.application_date ASC`,
      [groupId]
    );

    res.json(pending);
  } catch (error) {
    console.error('Get pending loans error:', error);
    res.status(500).json({ error: 'Error fetching pending loans' });
  }
};

exports.approveLoan = async (req, res) => {
  try {
    const db = getDb();
    const { loanId, groupId } = req.params;

    const loan = await db.get(
      'SELECT * FROM loans WHERE id = ? AND group_id = ?',
      [loanId, groupId]
    );

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Loan already processed' });
    }

    // Check which signatory is approving
    const signatoryNumber = loan.approved_by_signatory1 ? 2 : 1;

    if (signatoryNumber === 1) {
      await db.run(
        'UPDATE loans SET approved_by_signatory1 = ? WHERE id = ?',
        [req.user.id, loanId]
      );

      res.json({ message: 'First approval completed. Waiting for second signatory.' });
    } else {
      await db.run(
        'UPDATE loans SET approved_by_signatory2 = ?, approval_date = CURRENT_DATE, status = "approved" WHERE id = ?',
        [req.user.id, loanId]
      );

      res.json({ message: 'Loan fully approved and ready for disbursement' });
    }
  } catch (error) {
    console.error('Approve loan error:', error);
    res.status(500).json({ error: 'Error approving loan' });
  }
};

exports.disburseLoan = async (req, res) => {
  try {
    const db = getDb();
    const { loanId, groupId } = req.params;

    const loan = await db.get(
      'SELECT * FROM loans WHERE id = ? AND group_id = ? AND status = "approved"',
      [loanId, groupId]
    );

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found or not approved' });
    }

    await db.run(
      `UPDATE loans 
       SET status = 'active', disbursement_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [loanId]
    );

    res.json({ message: 'Loan disbursed successfully' });
  } catch (error) {
    console.error('Disburse loan error:', error);
    res.status(500).json({ error: 'Error disbursing loan' });
  }
};

exports.makeLoanPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { amount, notes } = req.body;
    const { loanId, groupId } = req.params;
    const memberId = req.user.id;

    const loan = await db.get(
      'SELECT * FROM loans WHERE id = ? AND member_id = ? AND status = "active"',
      [loanId, memberId]
    );

    if (!loan) {
      return res.status(404).json({ error: 'Active loan not found' });
    }

    // Calculate interest and principal portions
    const monthlyInterest = (loan.balance * loan.interest_rate) / 100;
    let interestPaid = Math.min(amount, monthlyInterest);
    let principalPaid = amount - interestPaid;

    if (principalPaid > loan.balance) {
      principalPaid = loan.balance;
      interestPaid = amount - principalPaid;
    }

    const proofPath = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await db.run(
      `INSERT INTO loan_payments (loan_id, member_id, amount, interest_paid, principal_paid, 
                                  payment_date, proof_of_payment, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loanId, memberId, amount, interestPaid, principalPaid, new Date().toISOString().split('T')[0],
        proofPath, notes || null, 'pending']
    );

    res.status(201).json({
      message: 'Payment recorded, pending approval',
      payment_id: result.lastID,
      breakdown: {
        total: amount,
        interest: interestPaid,
        principal: principalPaid
      }
    });
  } catch (error) {
    console.error('Make payment error:', error);
    res.status(500).json({ error: 'Error recording payment' });
  }
};

exports.getLoanPayments = async (req, res) => {
  try {
    const db = getDb();
    const { loanId, groupId } = req.params;

    const payments = await db.all(
      `SELECT lp.*, u.full_name as approved_by_name
       FROM loan_payments lp
       LEFT JOIN users u ON lp.approved_by = u.id
       WHERE lp.loan_id = ?
       ORDER BY lp.payment_date DESC`,
      [loanId]
    );

    const summary = await db.get(
      `SELECT 
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'approved' THEN interest_paid ELSE 0 END) as total_interest_paid,
        SUM(CASE WHEN status = 'approved' THEN principal_paid ELSE 0 END) as total_principal_paid,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments
       FROM loan_payments
       WHERE loan_id = ?`,
      [loanId]
    );

    res.json({ payments, summary });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Error fetching payments' });
  }
};

exports.approveLoanPayment = async (req, res) => {
  try {
    const db = getDb();
    const { paymentId, groupId } = req.params;

    const payment = await db.get(
      `SELECT lp.*, l.member_id, l.balance as loan_balance, l.id as loan_id
       FROM loan_payments lp
       JOIN loans l ON lp.loan_id = l.id
       WHERE lp.id = ? AND lp.status = 'pending'`,
      [paymentId]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found or already processed' });
    }

    // Approve payment
    await db.run(
      `UPDATE loan_payments 
       SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, paymentId]
    );

    // Update loan balance
    const newBalance = payment.loan_balance - payment.principal_paid;

    await db.run(
      `UPDATE loans 
       SET balance = ?, total_paid = total_paid + ?, 
           status = CASE WHEN ? <= 0 THEN 'completed' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newBalance, payment.amount, newBalance, payment.loan_id]
    );

    // Update member's interest earned for reports
    if (payment.interest_paid > 0) {
      await db.run(
        `UPDATE group_members 
         SET total_interest_earned = total_interest_earned + ?
         WHERE user_id = ? AND group_id = ?`,
        [payment.interest_paid, payment.member_id, groupId]
      );
    }

    res.json({ message: 'Payment approved successfully' });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Error approving payment' });
  }
};

exports.getAllLoans = async (req, res) => {
  try {
    const db = getDb();
    let loans;

    if (req.user.role === 'admin') {
      loans = await db.all(
        `SELECT l.*, u.full_name, u.email, g.name as group_name
       FROM loans l
       JOIN users u ON l.member_id = u.id
       JOIN groups g ON l.group_id = g.id
       ORDER BY l.application_date DESC`
      );
    } else {
      loans = await db.all(
        `SELECT l.*, u.full_name, u.email, g.name as group_name
       FROM loans l
       JOIN users u ON l.member_id = u.id
       JOIN groups g ON l.group_id = g.id
       WHERE l.group_id = ?
       ORDER BY l.application_date DESC`,
        [req.user.group_id]
      );
    }

    res.json(loans);
  } catch (error) {
    console.error('Get all loans error:', error);
    res.status(500).json({ error: 'Error fetching loans' });
  }
};
