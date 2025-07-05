// Job Tracker - Startup and Routing
// Handles initial app routing and authentication

(function() {
  'use strict';
  
  console.log('🚀 Job Tracker Starting...');
  
  // Check if we're on the signin page
  const isSignInPage = window.location.pathname.includes('signin');
  
  // If we're on the signin page, check if user is already authenticated
  if (isSignInPage) {
    const token = localStorage.getItem('jobTracker_token');
    if (token) {
      console.log('🔄 User already authenticated, redirecting to main app...');
      window.location.href = '/';
      return;
    }
  }
  
  // If we're on the main app, the auth-check.js will handle authentication
  // This script just provides fallback routing
  
  console.log('✅ Startup complete');
  
})();