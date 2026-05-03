// these are the controller functions that handle all report related operations
const { getDb } = require('../database/database');

exports.getYearEndReport = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    const { year } = req.query;
    const reportYear = year || new Date().getFullYear();
    
    // Get all members with their totals
    const members = await db.all(
      `SELECT 
         u.id,
         u.full_name,
         gm.member_number,
         COALESCE(gm.total_contributions, 0) as total_contributions,
         COALESCE(gm.total_interest_earned, 0) as total_interest_earned,
         (SELECT COUNT(*) FROM loans l WHERE l.member_id = u.id AND l.status = 'completed') as loans_completed,
         (SELECT COALESCE(SUM(l.principal_amount), 0) FROM loans l WHERE l.member_id = u.id AND l.status = 'completed') as total_loans_taken
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY gm.total_interest_earned DESC`,
      [groupId]
    );
    
    // Calculate what each member gets at year end
    const totalContributions = members.reduce((sum, m) => sum + (m.total_contributions || 0), 0);
    const totalInterest = members.reduce((sum, m) => sum + (m.total_interest_earned || 0), 0);
    
    const membersWithPayout = members.map(member => {
      // Each member gets their contributions back plus share of interest
      const interestShare = totalInterest > 0 
        ? (member.total_interest_earned / totalInterest) * totalInterest 
        : 0;
      
      return {
        ...member,
        yearly_payout: member.total_contributions + interestShare,
        interest_share: interestShare,
        meets_target: (member.total_interest_earned || 0) >= 5000 // P5000 target as per requirements
      };
    });
    
    const report = {
      year: reportYear,
      group_id: groupId,
      total_members: members.length,
      total_contributions: totalContributions,
      total_interest_earned: totalInterest,
      members: membersWithPayout,
      members_meeting_target: membersWithPayout.filter(m => m.meets_target).length,
      generated_at: new Date()
    };
    
    res.json(report);
  } catch (error) {
    console.error('Year end report error:', error);
    res.status(500).json({ error: 'Error generating year-end report' });
  }
};

exports.getMemberRanking = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    
    // Ranking by interest earned
    const interestRanking = await db.all(
      `SELECT 
         u.id,
         u.full_name,
         gm.member_number,
         gm.total_interest_earned,
         gm.total_contributions
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY gm.total_interest_earned DESC`,
      [groupId]
    );
    
    // Ranking by contributions
    const contributionRanking = await db.all(
      `SELECT 
         u.id,
         u.full_name,
         gm.member_number,
         gm.total_contributions,
         gm.total_interest_earned
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY gm.total_contributions DESC`,
      [groupId]
    );
    
    res.json({
      most_interest: interestRanking[0] || null,
      least_interest: interestRanking[interestRanking.length - 1] || null,
      highest_contributor: contributionRanking[0] || null,
      full_rankings: {
        by_interest: interestRanking,
        by_contributions: contributionRanking
      }
    });
  } catch (error) {
    console.error('Member ranking error:', error);
    res.status(500).json({ error: 'Error generating member ranking' });
  }
};

exports.getInterestReport = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    const { year } = req.query;
    
    let yearCondition = '';
    let params = [groupId];
    
    if (year) {
      yearCondition = 'AND strftime("%Y", lp.approved_at) = ?';
      params.push(year);
    }
    
    const interestReport = await db.all(
      `SELECT 
         u.id,
         u.full_name,
         gm.member_number,
         COALESCE(SUM(lp.interest_paid), 0) as total_interest,
         COUNT(DISTINCT lp.loan_id) as number_of_loans
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       LEFT JOIN loan_payments lp ON u.id = lp.member_id AND lp.status = 'approved' ${yearCondition}
       WHERE gm.group_id = ? AND gm.status = 'active'
       GROUP BY u.id
       ORDER BY total_interest DESC`,
      [...params, groupId]
    );
    
    const summary = {
      total_interest: interestReport.reduce((sum, m) => sum + m.total_interest, 0),
      average_interest_per_member: interestReport.reduce((sum, m) => sum + m.total_interest, 0) / interestReport.length,
      members_above_target: interestReport.filter(m => m.total_interest >= 5000).length
    };
    
    res.json({ members: interestReport, summary });
  } catch (error) {
    console.error('Interest report error:', error);
    res.status(500).json({ error: 'Error generating interest report' });
  }
};

exports.getContributionReport = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    const { year } = req.query;
    const reportYear = year || new Date().getFullYear();
    
    // Monthly contribution summary
    const monthlySummary = await db.all(
      `SELECT 
         month,
         COUNT(*) as number_of_contributions,
         SUM(amount) as total_amount,
         SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
       FROM contributions
       WHERE group_id = ? AND year = ?
       GROUP BY month
       ORDER BY month`,
      [groupId, reportYear]
    );
    
    // Member contribution summary
    const memberSummary = await db.all(
      `SELECT 
         u.full_name,
         gm.member_number,
         COUNT(c.id) as contribution_count,
         SUM(c.amount) as total_contributed,
         CASE WHEN SUM(c.amount) >= 12000 THEN 'Full' ELSE 'Partial' END as status
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       LEFT JOIN contributions c ON u.id = c.member_id AND c.year = ? AND c.status = 'approved'
       WHERE gm.group_id = ? AND gm.status = 'active'
       GROUP BY u.id
       ORDER BY total_contributed DESC`,
      [reportYear, groupId]
    );
    
    res.json({
      year: reportYear,
      monthly_breakdown: monthlySummary,
      member_breakdown: memberSummary,
      total_contributions: memberSummary.reduce((sum, m) => sum + m.total_contributed, 0)
    });
  } catch (error) {
    console.error('Contribution report error:', error);
    res.status(500).json({ error: 'Error generating contribution report' });
  }
};

exports.getLoanReport = async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.groupId;
    
    // Active loans summary
    const activeLoans = await db.all(
      `SELECT 
         u.full_name,
         gm.member_number,
         l.principal_amount,
         l.balance,
         l.interest_rate,
         l.application_date,
         l.disbursement_date,
         (l.principal_amount - l.balance) as amount_paid
       FROM loans l
       JOIN users u ON l.member_id = u.id
       JOIN group_members gm ON u.id = gm.user_id
       WHERE l.group_id = ? AND l.status = 'active'
       ORDER BY l.application_date DESC`,
      [groupId]
    );
    
    // Loan performance
    const performance = await db.get(
      `SELECT 
         COUNT(*) as total_loans,
         SUM(principal_amount) as total_principal,
         SUM(balance) as outstanding_balance,
         AVG(principal_amount) as average_loan_size,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
         COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans_count
       FROM loans
       WHERE group_id = ?`
      [groupId]
    );
    
    res.json({
      active_loans: activeLoans,
      performance: {
        ...performance,
        repayment_rate: performance.total_principal > 0 
          ? ((performance.total_principal - performance.outstanding_balance) / performance.total_principal) * 100 
          : 0
      }
    });
  } catch (error) {
    console.error('Loan report error:', error);
    res.status(500).json({ error: 'Error generating loan report' });
  }
};