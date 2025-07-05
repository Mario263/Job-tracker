const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased to 10 for better UX
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// More restrictive limiter for failed attempts
const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour for repeated failures
  message: {
    success: false,
    message: 'Account temporarily locked due to multiple failed attempts. Please try again in 1 hour.'
  },
  skip: (req, res) => res.statusCode < 400, // Only count failed requests
});

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Helper function to send response with user data and token
const sendAuthResponse = (res, user, message) => {
  const token = generateToken(user._id);
  
  res.status(200).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      settings: user.settings,
      memberSince: user.createdAt
    }
  });
};

// Sign Up Route
router.post('/signup', authLimiter, strictAuthLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input sanitization and validation
    const sanitizedName = name?.trim();
    const sanitizedEmail = email?.trim().toLowerCase();
    const sanitizedPassword = password?.trim();

    // Comprehensive validation
    if (!sanitizedName || !sanitizedEmail || !sanitizedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Name validation
    if (sanitizedName.length < 2 || sanitizedName.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters'
      });
    }

    // Email validation (more comprehensive)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Password validation (comprehensive)
    if (sanitizedPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty123', 'password123'];
    if (weakPasswords.includes(sanitizedPassword.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a stronger password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(sanitizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name: sanitizedName,
      email: sanitizedEmail,
      password: sanitizedPassword
    });

    await user.save();
    await user.updateLastLogin();

    console.log(`✅ New user registered: ${user.email}`);
    sendAuthResponse(res, user, 'Account created successfully! Welcome to Job Tracker!');

  } catch (error) {
    console.error('❌ Sign up error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error'
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// Sign In Route
router.post('/signin', authLimiter, strictAuthLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input sanitization and validation
    const sanitizedEmail = email?.trim().toLowerCase();
    const sanitizedPassword = password?.trim();

    if (!sanitizedEmail || !sanitizedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Find user by email
    const user = await User.findByEmail(sanitizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(sanitizedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await user.updateLastLogin();

    console.log(`✅ User signed in: ${user.email}`);
    sendAuthResponse(res, user, 'Sign in successful! Welcome back!');

  } catch (error) {
    console.error('❌ Sign in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// Verify Token Route (for checking if user is still authenticated)
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        settings: user.settings,
        memberSince: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Sign Out Route (client-side token removal, server just confirms)
router.post('/signout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Signed out successfully'
  });
});

// Change Password Route
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { currentPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password changed for user: ${user.email}`);
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

module.exports = router;