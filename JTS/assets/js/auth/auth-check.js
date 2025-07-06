// Authentication Check Module
// Handles user authentication state and redirects

(function() {
  'use strict';
  
  console.log('🔐 Loading Authentication Check Module...');
  
  // API Configuration
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : 'https://your-production-api.vercel.app/api';
  
  // Check if user is authenticated
  async function checkAuthentication() {
    const token = localStorage.getItem('jobTracker_token');
    const userStr = localStorage.getItem('jobTracker_user');
    
    if (!token || !userStr) {
      redirectToSignIn();
      return false;
    }
    
    try {
      // Verify token with server
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update user data in localStorage
        localStorage.setItem('jobTracker_user', JSON.stringify(data.user));
        
        // Set up API headers for future requests
        setupAPIHeaders(token);
        
        // Show welcome message
        const user = data.user;
        console.log(`✅ Welcome back, ${user.name}!`);
        
        // Update UI with user info if elements exist
        updateUserUI(user);
        
        return true;
      } else {
        console.log('❌ Token invalid or expired');
        clearAuthData();
        redirectToSignIn();
        return false;
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Don't redirect on network errors, allow offline usage
      return true;
    }
  }
  
  // Set up API headers for authenticated requests
  function setupAPIHeaders(token) {
    // Store token for API service if it exists
    if (window.apiService && window.apiService.setAuthToken) {
      window.apiService.setAuthToken(token);
    }
    
    // Send token to Chrome extension if available
    sendTokenToExtension(token);
    
    // Override fetch to include auth header
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Only add auth header for API requests
      if (url.includes('/api/')) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return originalFetch(url, options);
    };
  }
  
  // Send authentication token to Chrome extension
  function sendTokenToExtension(token) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({ 
          action: 'setAuthToken', 
          token: token 
        }, (response) => {
          if (!chrome.runtime.lastError) {
            console.log('🔐 Auth token sent to extension successfully');
          }
        });
      } catch (error) {
        console.log('📱 Could not send auth token to extension:', error);
      }
    }
  }
  
  // Update UI with user information
  function updateUserUI(user) {
    // Update any user info elements
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(el => {
      el.textContent = user.name;
    });
    
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    userEmailElements.forEach(el => {
      el.textContent = user.email;
    });
    
    // Add user greeting to header if it exists
    const header = document.querySelector('.header h1');
    if (header && !header.dataset.userGreetingAdded) {
      const greeting = document.createElement('div');
      greeting.style.fontSize = '0.8rem';
      greeting.style.opacity = '0.8';
      greeting.style.marginTop = '0.5rem';
      greeting.textContent = `Welcome back, ${user.name}!`;
      header.appendChild(greeting);
      header.dataset.userGreetingAdded = 'true';
    }
  }
  
  // Clear authentication data
  function clearAuthData() {
    localStorage.removeItem('jobTracker_token');
    localStorage.removeItem('jobTracker_user');
  }
  
  // Redirect to sign-in page
  function redirectToSignIn() {
    // Check if we're already on the signin page
    if (window.location.pathname.includes('signin')) {
      return;
    }
    
    console.log('🔄 Redirecting to sign-in page...');
    window.location.href = './signin.html';
  }
  
  // Sign out function
  function signOut() {
    clearAuthData();
    
    // Notify Chrome extension to clear its data
    notifyExtensionSignOut();
    
    // Call sign out API
    const token = localStorage.getItem('jobTracker_token');
    if (token) {
      fetch(`${API_BASE_URL}/auth/signout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(() => {
        // Ignore errors on sign out
      });
    }
    
    // Show message and redirect
    if (window.showSuccessMessage) {
      window.showSuccessMessage('Signed out successfully!');
    }
    
    setTimeout(() => {
      redirectToSignIn();
    }, 1000);
  }
  
  // Notify Chrome extension when user signs out
  function notifyExtensionSignOut() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          action: 'userSignedOut'
        }, (response) => {
          if (!chrome.runtime.lastError) {
            console.log('✅ Extension notified of sign out');
          }
        });
      } catch (error) {
        console.log('📱 Could not notify extension of sign out:', error);
      }
    }
  }
  
  // Add sign out button to the interface
  function addSignOutButton() {
    // Add sign out option to header if it doesn't exist
    const header = document.querySelector('.header');
    if (header && !document.getElementById('signout-btn')) {
      const signOutBtn = document.createElement('button');
      signOutBtn.id = 'signout-btn';
      signOutBtn.className = 'btn btn-secondary';
      signOutBtn.style.position = 'absolute';
      signOutBtn.style.top = '1rem';
      signOutBtn.style.right = '1rem';
      signOutBtn.style.fontSize = '0.9rem';
      signOutBtn.style.padding = '0.5rem 1rem';
      signOutBtn.style.zIndex = '101';
      signOutBtn.textContent = '🚪 Sign Out';
      signOutBtn.onclick = signOut;
      
      header.style.position = 'relative';
      header.appendChild(signOutBtn);
    }
  }
  
  // Get current user data
  function getCurrentUser() {
    const userStr = localStorage.getItem('jobTracker_user');
    return userStr ? JSON.parse(userStr) : null;
  }
  
  // Export functions
  window.AuthCheck = {
    checkAuthentication,
    signOut,
    getCurrentUser,
    clearAuthData
  };
  
  // Auto-check authentication when module loads
  document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {
      addSignOutButton();
    }
  });
  
  // If DOM is already loaded, check immediately
  if (document.readyState === 'loading') {
    // Already set up event listener above
  } else {
    checkAuthentication().then(isAuthenticated => {
      if (isAuthenticated) {
        addSignOutButton();
      }
    });
  }
  
  console.log('🔐 Authentication check module loaded successfully');
  
})();