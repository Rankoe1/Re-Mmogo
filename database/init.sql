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

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_contributions_group_member ON contributions(group_id, member_id);
CREATE INDEX idx_loans_group_status ON loans(group_id, status);
CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);