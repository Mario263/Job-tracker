// Load environment configuration
const { getConfig, isDevelopment } = require('./config/environment');
const config = getConfig();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Import routes
const authRouter = require('./routes/auth');
const applicationsRouter = require('./routes/applications');
const contactsRouter = require('./routes/contacts');
const resumesRouter = require('./routes/resumes');

// Import middleware
const { authenticate, optionalAuth } = require('./middleware/auth');

// CORS configuration
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    mongodb: 'Connected',
    mode: 'Cloud-only',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Job Tracker API is running!',
    endpoints: {
      health: '/api/health',
      applications: '/api/applications',
      contacts: '/api/contacts',
      resumes: '/api/resumes'
    },
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/applications', authenticate, applicationsRouter);
app.use('/api/contacts', authenticate, contactsRouter);
app.use('/api/resumes', authenticate, resumesRouter);


// Initialize database connection
async function initializeDatabase() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Initialize database connection
initializeDatabase();

// Error handlers
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// For Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For local development
  app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`🌐 CORS Origin: ${config.security.corsOrigin}`);
  });
}

module.exports = app;