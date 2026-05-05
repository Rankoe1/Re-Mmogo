const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;

const initializeDatabase = async () => {
  const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 're_mmogo.db');

  db = await open({
    filename: databasePath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  // Create all tables
  await createTables();
  
  // Insert default data
  await seedDefaultData();

  return db;
};

const createTables = async () => {
  // Users table - stores all user accounts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'member',
      is_signatory BOOLEAN DEFAULT 0,
      group_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Groups table - stores motshelo groups
  await db.exec(`
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
    )
  `);

  // Members table - stores member details (linked to users and groups)
  await db.exec(`
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
    )
  `);

  // Group Members table - Links users to groups
  await db.exec(`
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
    )
  `);

  // Contributions table - records monthly contributions
  await db.exec(`
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
    )
  `);

  // Loans table - records loan applications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      principal_amount DECIMAL(10,2) NOT NULL,
      balance DECIMAL(10,2) NOT NULL,
      interest_rate DECIMAL(5,2) DEFAULT 20.00,
      monthly_interest DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'pending',
      application_date DATE DEFAULT CURRENT_DATE,
      approval_date DATE,
      approved_by_signatory1 INTEGER,
      approved_by_signatory2 INTEGER,
      disbursement_date DATE,
      total_paid DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by_signatory1) REFERENCES users(id),
      FOREIGN KEY (approved_by_signatory2) REFERENCES users(id)
    )
  `);

  // Loan payments table - records loan repayments
  await db.exec(`
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
    )
  `);

  // Audit logs table - tracks all actions
  await db.exec(`
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
    )
  `);

  console.log('All database tables created successfully');
  console.log('- users table: stores user accounts');
  console.log('- groups table: stores motshelo groups');
  console.log('- group_members table: links users to groups (CRITICAL)');
  console.log('- contributions table: records monthly payments');
  console.log('- loans table: stores loan applications');
  console.log('- loan_payments table: tracks repayments');
  console.log('- audit_logs table: tracks user actions');
};

const seedDefaultData = async () => {
  // Check if admin user exists
  const adminExists = await db.get('SELECT id FROM users WHERE email = ?', ['admin@remmogo.com']);
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await db.run(
      'INSERT INTO users (email, password, full_name, role, is_signatory) VALUES (?, ?, ?, ?, ?)',
      ['admin@remmogo.com', hashedPassword, 'System Administrator', 'admin', 1]
    );
    console.log('Default admin user created');
  }

  // Create a demo group if none exists
  const groupExists = await db.get('SELECT id FROM groups LIMIT 1');
  if (!groupExists) {
    const adminUser = await db.get('SELECT id FROM users WHERE email = ?', ['admin@remmogo.com']);
    
    // Create demo group
    const result = await db.run(
      'INSERT INTO groups (name, registration_number, description, created_by) VALUES (?, ?, ?, ?)',
      ['Demo Motshelo Group', 'REG001', 'Demo group for testing purposes', adminUser.id]
    );
    
    // Add admin as a member of the group
    await db.run(
      `INSERT INTO group_members (group_id, user_id, member_number, status)
       VALUES (?, ?, ?, ?)`,
      [result.lastID, adminUser.id, 'MEM001', 'active']
    );
    
    // Update user's group_id
    await db.run('UPDATE users SET group_id = ? WHERE id = ?', [result.lastID, adminUser.id]);
    
    console.log('Demo group created with admin as member');
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
};

module.exports = { initializeDatabase, getDb };
