-- Complete database schema for re_mmogo.db

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  is_signatory BOOLEAN DEFAULT 0,
  group_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) UNIQUE,
  description TEXT,
  monthly_contribution DECIMAL(10,2) DEFAULT 1000.00,
  interest_rate DECIMAL(5,2) DEFAULT 20.00,
  target_interest DECIMAL(10,2) DEFAULT 5000.00,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

  -- Members table 
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20),
      member_number VARCHAR(50) UNIQUE,
      join_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'active',
      total_contributions DECIMAL(10,2) DEFAULT 0,
      total_interest_earned DECIMAL(10,2) DEFAULT 0,
      address TEXT,
      occupation VARCHAR(100),
      id_number VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      UNIQUE(email, group_id)
    );
    
--membership table

CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      member_number VARCHAR(50) UNIQUE,
      join_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'active',
      total_contributions DECIMAL(10,2) DEFAULT 0,
      total_interest_earned DECIMAL(10,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    );

 -- Contributions table
     CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      month INTEGER,
      year INTEGER,
      payment_date DATE,
      proof_of_payment VARCHAR(500),
      status VARCHAR(50) DEFAULT 'pending',
      approved_by INTEGER,
      approved_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 20.00,
  term_months INTEGER DEFAULT 6,
  status VARCHAR(50) DEFAULT 'pending',
  application_date DATE DEFAULT CURRENT_DATE,
  approval_date DATE,
  approved_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Loan payments table
   CREATE TABLE IF NOT EXISTS loan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      interest_paid DECIMAL(10,2),
      principal_paid DECIMAL(10,2),
      payment_date DATE,
      proof_of_payment VARCHAR(500),
      status VARCHAR(50) DEFAULT 'pending',
      approved_by INTEGER,
      approved_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );
-- Audit logs table
   CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action VARCHAR(255),
      entity_type VARCHAR(100),
      entity_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
  
-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_contributions_group_member ON contributions(group_id, member_id);
CREATE INDEX idx_loans_group_status ON loans(group_id, status);
CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);