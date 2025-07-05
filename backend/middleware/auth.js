const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Simple in-memory cache for user data (in production, use Redis)
const userCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      userCache.delete(key);
    }
  }
}, 60000); // Clean every minute

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check cache first
    const cacheKey = decoded.userId;
    const cached = userCache.get(cacheKey);
    let user;
    
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      // Use cached user data
      user = cached.user;
    } else {
      // Get user from database
      user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token or user not found.'
        });
      }
      
      // Cache the user data
      userCache.set(cacheKey, {
        user: user.toObject(),
        timestamp: Date.now()
      });
    }

    // Add user to request object
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      settings: user.settings
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please sign in again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          settings: user.settings
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};