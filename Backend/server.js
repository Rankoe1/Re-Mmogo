const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./database/database');

const app = express();

// Basic middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Re-Mmogo API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      groups: '/api/groups',
      members: '/api/members',
      contributions: '/api/contributions',
      loans: '/api/loans',
      reports: '/api/reports',
      uploads: '/api/uploads'
    }
  });
});

// Simple test route to verify API works
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Routes - wrapped in try-catch to prevent crashes
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('Auth routes loaded');
} catch (err) {
  console.error('Failed to load auth routes:', err.message);
}

try {
  app.use('/api/groups', require('./routes/groups'));
  console.log('Group routes loaded');
} catch (err) {
  console.error('Failed to load group routes:', err.message);
}

try {
  app.use('/api/members', require('./routes/members'));
  console.log('Member routes loaded');
} catch (err) {
  console.error('Failed to load member routes:', err.message);
}

try {
  app.use('/api/contributions', require('./routes/contributions'));
  console.log('Contribution routes loaded');
} catch (err) {
  console.error('Failed to load contribution routes:', err.message);
}

try {
  app.use('/api/loans', require('./routes/loans'));
  console.log('Loan routes loaded');
} catch (err) {
  console.error('Failed to load loan routes:', err.message);
}

try {
  app.use('/api/reports', require('./routes/reports'));
  console.log('Report routes loaded');
} catch (err) {
  console.error('Failed to load report routes:', err.message);
}

try {
  app.use('/api/uploads', require('./routes/uploads'));
  console.log('Upload routes loaded');
} catch (err) {
  console.error('Failed to load upload routes:', err.message);
}

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;

// Initialize database and start listening
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Test API: http://localhost:${PORT}/api/test`);
      console.log('Ready to accept requests');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close other applications using this port.`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    console.error('Please check your database configuration');
    process.exit(1);
  });

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
});
