// app.js - Enhanced Job Tracker with Modern UI and API Integration

// Global state management
window.jobTracker = {
  applications: [],
  contacts: [],
  resumes: [],
  currentTab: 'applications'
};

// Global custom confirmation dialog
window.showCustomConfirmDialog = function(title, message, onConfirm) {
  // Remove existing modal if any
  const existingModal = document.getElementById('custom-confirm-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'custom-confirm-modal';
  modal.className = 'custom-confirm-modal';
  modal.innerHTML = `
    <div class="custom-confirm-overlay">
      <div class="custom-confirm-content">
        <div class="custom-confirm-header">
          <h4>${escapeHtml(title)}</h4>
        </div>
        <div class="custom-confirm-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="custom-confirm-actions">
          <button class="btn btn-danger" id="confirm-yes">Yes, Delete</button>
          <button class="btn btn-secondary" id="confirm-no">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  modal.querySelector('#confirm-yes').addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
  
  modal.querySelector('#confirm-no').addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on overlay click
  modal.querySelector('.custom-confirm-overlay').addEventListener('click', (e) => {
    if (e.target.classList.contains('custom-confirm-overlay')) {
      modal.remove();
    }
  });
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
};

// Global escape HTML function
window.escapeHtml = function(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing Job Tracker with Apple-inspired design...');
  
  try {
    // Wait for authentication before initializing app
    console.log('🔐 Waiting for authentication check...');
    await waitForAuthentication();
    
    // Initialize all components
    await initializeApp();
    console.log('✅ Job Tracker initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Job Tracker:', error);
    showErrorMessage('Failed to initialize application. Please refresh the page.');
  }
});

// Wait for authentication to complete
async function waitForAuthentication() {
  return new Promise((resolve) => {
    const checkAuth = () => {
      // Check if auth module is loaded and user is authenticated
      const token = localStorage.getItem('jobTracker_token');
      const hasApiService = window.apiService && window.apiService.setAuthToken;
      
      if (token && hasApiService) {
        // Set up API authentication first
        window.apiService.setAuthToken(token);
        console.log('🔐 Authentication token set for API service');
        resolve();
      } else if (!token) {
        // No token - user needs to sign in
        console.log('🔐 No authentication token found');
        resolve(); // Still resolve to allow redirect to signin
      } else {
        // Wait for API service to load
        setTimeout(checkAuth, 100);
      }
    };
    checkAuth();
  });
}

// Main initialization function
async function initializeApp() {
  // Check API health and load data
  await loadAllData();
  
  // Initialize UI components
  await initializeUI();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set default values
  setDefaultValues();
  
  // Update analytics
  updateAnalytics();
}

// Load all data from cloud API
async function loadAllData() {
  try {
    console.log('Loading data from cloud...');
    
    if (!window.apiService) {
      throw new Error('API service not available');
    }
    
    // Load applications from cloud
    try {
      window.jobTracker.applications = await window.apiService.getApplications();
      console.log(`✅ Loaded ${window.jobTracker.applications.length} applications from cloud`);
    } catch (error) {
      console.error('Failed to load applications:', error.message);
      window.jobTracker.applications = [];
      showErrorMessage('Failed to load applications. Please check your connection.');
    }
    
    // Load contacts from cloud
    try {
      window.jobTracker.contacts = await window.apiService.getContacts();
      console.log(`✅ Loaded ${window.jobTracker.contacts.length} contacts from cloud`);
    } catch (error) {
      console.error('Failed to load contacts:', error.message);
      window.jobTracker.contacts = [];
      showErrorMessage('Failed to load contacts. Please check your connection.');
    }
    
    // Initialize empty resumes array (file-based, not stored in cloud)
    window.jobTracker.resumes = [];
    
    // Update global references for backward compatibility
    window.applications = window.jobTracker.applications;
    window.contacts = window.jobTracker.contacts;
    window.resumes = window.jobTracker.resumes;
    
  } catch (error) {
    console.error('Error loading data:', error);
    showErrorMessage('Failed to connect to cloud database. Please check your internet connection.');
    
    // Initialize empty arrays if cloud connection fails
    window.jobTracker.applications = [];
    window.jobTracker.contacts = [];
    window.jobTracker.resumes = [];
  }
}

// Initialize UI components
async function initializeUI() {
  console.log('🎨 Initializing UI components...');
  
  // Initialize applications module first
  if (window.ApplicationsModule && window.ApplicationsModule.initialize) {
    console.log('📋 Initializing applications module...');
    await window.ApplicationsModule.initialize();
  }
  
  // Initialize other modules
  if (window.ContactsModule && window.ContactsModule.initialize) {
    console.log('👥 Initializing contacts module...');
    await window.ContactsModule.initialize();
  }
  
  if (window.ResumesModule && window.ResumesModule.initialize) {
    console.log('📄 Initializing resumes module...');
    await window.ResumesModule.initialize();
  }
  
  // Update resume dropdown
  if (window.ResumesModule && window.ResumesModule.updateResumeDropdown) {
    window.ResumesModule.updateResumeDropdown();
  }
  
  console.log('✅ UI components initialized');
}

// Enhanced tab switching with animations
function switchTab(tabName, tabElement) {
  console.log(`Switching to ${tabName} tab`);
  
  // Remove active class from all tabs and content
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Add active class to clicked tab
  tabElement.classList.add('active');
  
  // Show corresponding content with animation
  const targetContent = document.getElementById(tabName);
  if (targetContent) {
    setTimeout(() => {
      targetContent.classList.add('active');
      
      // Load tab-specific data if needed
      if (tabName === 'analytics') {
        updateAnalytics();
      } else if (tabName === 'contacts') {
        renderContacts();
      } else if (tabName === 'resumes') {
        renderResumes();
      }
    }, 100);
  }
  
  // Update global state
  window.jobTracker.currentTab = tabName;
}

// Setup event listeners
function setupEventListeners() {
  // Online/offline status
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOfflineStatus);
}

// Legacy function - now handled by ApplicationsModule
function renderApplications() {
  if (window.ApplicationsModule && window.ApplicationsModule.renderApplications) {
    return window.ApplicationsModule.renderApplications();
  } else if (window.renderApplications) {
    return window.renderApplications();
  }
}

// Legacy function - now handled by ContactsModule
function renderContacts() {
  if (window.ContactsModule && window.ContactsModule.renderContacts) {
    return window.ContactsModule.renderContacts();
  } else if (window.renderContacts) {
    return window.renderContacts();
  }
}

// Set default values for forms
function setDefaultValues() {
  // Set default application date to today
  const applicationDateInput = document.getElementById('applicationDate');
  if (applicationDateInput && !applicationDateInput.value) {
    applicationDateInput.value = new Date().toISOString().split('T')[0];
  }
  
  // Set default status
  const statusSelect = document.getElementById('status');
  if (statusSelect && !statusSelect.value) {
    statusSelect.value = 'Applied';
  }
  
  // Set default priority
  const prioritySelect = document.getElementById('priority');
  if (prioritySelect && !prioritySelect.value) {
    prioritySelect.value = 'Medium';
  }
}

// Legacy function - now handled by ApplicationsModule
// Kept for backward compatibility but delegates to module
async function addApplicationLegacy() {
  if (window.ApplicationsModule) {
    // Try different methods on the module
    if (typeof window.ApplicationsModule.addApplicationFromForm === 'function') {
      return await window.ApplicationsModule.addApplicationFromForm();
    } else if (typeof window.ApplicationsModule.addApplication === 'function') {
      // Get form data
      const applicationData = {
        jobTitle: document.getElementById('jobTitle').value.trim(),
        company: document.getElementById('company').value.trim(),
        jobPortal: document.getElementById('jobPortal').value,
        jobUrl: document.getElementById('jobUrl').value.trim(),
        applicationDate: document.getElementById('applicationDate').value || new Date().toISOString().split('T')[0],
        status: document.getElementById('status').value,
        resumeVersion: document.getElementById('resumeVersion').value,
        location: document.getElementById('location').value.trim(),
        salaryRange: document.getElementById('salaryRange').value.trim(),
        jobType: document.getElementById('jobType').value,
        priority: document.getElementById('priority').value,
        followUpDate: document.getElementById('followUpDate').value,
        notes: document.getElementById('notes').value.trim(),
        dateAdded: new Date().toISOString()
      };
      return await window.ApplicationsModule.addApplication(applicationData);
    }
  }
  showErrorMessage('Applications module not available');
}

// Enhanced analytics with modern charts
function updateAnalytics() {
  const applications = window.jobTracker.applications;
  
  if (applications.length === 0) {
    // Show empty state
    updateStatsCards({
      totalApps: 0,
      interviewRate: 0,
      responseRate: 0,
      offerRate: 0,
      avgResponseTime: 0,
      pendingFollowUps: 0
    });
    return;
  }
  
  // Calculate statistics
  const stats = calculateStats(applications);
  updateStatsCards(stats);
  
  // Update charts with animations
  updateCharts(applications);
}

// Calculate application statistics
function calculateStats(applications) {
  const total = applications.length;
  
  if (total === 0) {
    return {
      totalApps: 0,
      interviewRate: 0,
      responseRate: 0,
      offerRate: 0,
      avgResponseTime: 0,
      pendingFollowUps: 0
    };
  }
  
  // Count different statuses
  const statusCounts = {};
  applications.forEach(app => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
  });
  
  // Calculate rates
  const interviewStatuses = ['Phone Screen', 'Technical Assessment', 'Interview Scheduled', 'Final Interview'];
  const responseStatuses = ['Under Review', 'Phone Screen', 'Technical Assessment', 'Interview Scheduled', 'Final Interview', 'Offer', 'Rejected'];
  
  const interviewCount = interviewStatuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
  const responseCount = responseStatuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
  const offerCount = statusCounts['Offer'] || 0;
  
  // Calculate pending follow-ups
  const today = new Date();
  const pendingFollowUps = applications.filter(app => {
    if (!app.followUpDate) return false;
    const followUpDate = new Date(app.followUpDate);
    return followUpDate <= today && !['Offer', 'Rejected', 'Withdrawn'].includes(app.status);
  }).length;
  
  return {
    totalApps: total,
    interviewRate: Math.round((interviewCount / total) * 100),
    responseRate: Math.round((responseCount / total) * 100),
    offerRate: Math.round((offerCount / total) * 100),
    avgResponseTime: calculateAverageResponseTime(applications),
    pendingFollowUps: pendingFollowUps
  };
}

// Update stats cards with animation
function updateStatsCards(stats) {
  const statsElements = {
    totalApps: document.getElementById('totalApps'),
    interviewRate: document.getElementById('interviewRate'),
    responseRate: document.getElementById('responseRate'),
    offerRate: document.getElementById('offerRate'),
    avgResponseTime: document.getElementById('avgResponseTime'),
    pendingFollowUps: document.getElementById('pendingFollowUps')
  };
  
  Object.entries(stats).forEach(([key, value]) => {
    const element = statsElements[key];
    if (element) {
      // Animate number change
      animateNumber(element, value, key.includes('Rate') ? '%' : (key === 'avgResponseTime' ? ' days' : ''));
    }
  });
}

// Update charts with Chart.js
function updateCharts(applications) {
  updateStatusChart(applications);
  updateTimeChart(applications);
  updatePortalChart(applications);
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showSuccessMessage(message) {
  showMessage(message, 'success');
}

function showErrorMessage(message) {
  showMessage(message, 'error');
}

function showInfoMessage(message) {
  showMessage(message, 'info');
}

function showMessage(message, type = 'info') {
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `${type}-message`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 300px;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(messageEl);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    messageEl.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 300);
  }, 5000);
}

function animateNumber(element, targetValue, suffix = '') {
  const startValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const startTime = performance.now();
  
  function updateNumber(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
    
    element.textContent = currentValue + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  }
  
  requestAnimationFrame(updateNumber);
}

function calculateAverageResponseTime(applications) {
  const responseTimes = applications
    .filter(app => app.status !== 'Applied' && app.applicationDate)
    .map(app => {
      const appDate = new Date(app.applicationDate);
      const today = new Date();
      return Math.floor((today - appDate) / (1000 * 60 * 60 * 24));
    });
  
  if (responseTimes.length === 0) return 0;
  
  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(average);
}

function handleOnlineStatus() {
  window.jobTracker.isOnline = true;
  showInfoMessage('Back online! Syncing data...');
  
  // Try to sync pending data
  if (window.apiService && window.apiService.syncPendingData) {
    window.apiService.syncPendingData();
  }
}

function handleOfflineStatus() {
  window.jobTracker.isOnline = false;
  showInfoMessage('Working offline. Data will sync when connection is restored.');
}

// Legacy function - now handled by ApplicationsModule
function clearForm() {
  if (window.ApplicationsModule && window.ApplicationsModule.clearForm) {
    return window.ApplicationsModule.clearForm();
  } else if (window.clearForm) {
    return window.clearForm();
  }
}

// Make functions globally available
window.switchTab = switchTab;
window.updateAnalytics = updateAnalytics;

console.log('Enhanced Job Tracker app.js loaded successfully');
