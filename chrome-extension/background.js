// background.js - Extension background service worker

class JobTrackerBackground {
  constructor() {
    // Determine API URL based on environment
    this.apiUrl = this.determineApiUrl();
    
    this.init();
  }
  
  determineApiUrl() {
    // For development, always use localhost for now
    // To use production, manually change this URL
    return 'http://localhost:3001';
  }

  init() {
    console.log('🚀 Initializing Job Tracker Background Service Worker...');
    console.log('🔗 API URL configured as:', this.apiUrl);
    
    this.setupEventListeners();
    this.setupPeriodicHealthCheck();
    this.setupContextMenus();
    
    // Test connection immediately
    this.testCloudConnection();
    
    // Try to sync auth token from main app immediately and periodically
    setTimeout(() => {
      this.syncAuthToken();
    }, 1000);
    
    // Try again after 5 seconds in case main app wasn't ready
    setTimeout(() => {
      this.syncAuthToken();
    }, 5000);
    
    console.log('✅ Job Tracker Extension Background Service Worker initialized');
  }

  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onFirstInstall();
      } else if (details.reason === 'update') {
        this.onUpdate();
      }
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle tab updates to inject content script and sync auth
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.checkAndInjectContentScript(tabId, tab.url);
        
        // Check if this is a main app tab and sync token
        if (tab.url && (tab.url.includes('localhost:8080') || tab.url.includes('.vercel.app'))) {
          console.log('Main app tab loaded, syncing auth token...');
          setTimeout(() => {
            this.syncAuthToken();
          }, 3000); // Wait for app to load
        }
      }
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.settings) {
        console.log('Extension settings updated');
      }
    });
  }

  async onFirstInstall() {
    console.log('Job Tracker Extension installed for the first time');
    
    // Set default settings
    await chrome.storage.local.set({
      settings: {
        notifications: true,
        autoDetectApply: true,
        quickSaveEnabled: true,
        apiUrl: this.apiUrl
      }
    });

    // Test connection to cloud API
    await this.testCloudConnection();

    // Open welcome page - update with your actual frontend URL
    chrome.tabs.create({
      url: 'http://localhost:8080' // Local frontend server
    });
  }

  async onUpdate() {
    console.log('Job Tracker Extension updated');
    
    // Migrate data if needed
    await this.migrateData();
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'notifyApplicationAdded':
          await this.handleApplicationNotification(message.application, message.frontendUrl);
          sendResponse({ success: true });
          break;

        case 'saveApplication':
          const result = await this.saveApplication(message.data);
          sendResponse({ success: true, data: result });
          break;

        case 'setAuthToken':
          await this.setAuthToken(message.token);
          sendResponse({ success: true });
          break;

        case 'removeAuthToken':
          await this.removeAuthToken();
          sendResponse({ success: true });
          break;

        case 'syncAuthToken':
          const token = await this.syncAuthToken();
          sendResponse({ success: true, token });
          break;

        case 'getApplications':
          const apps = await this.getApplications();
          sendResponse({ success: true, data: apps });
          break;

        case 'testConnection':
          const isConnected = await this.testCloudConnection();
          sendResponse({ success: true, connected: isConnected });
          break;

        case 'showJobTracker':
          // Forward message to content script
          if (sender.tab) {
            chrome.tabs.sendMessage(sender.tab.id, message);
          }
          sendResponse({ success: true });
          break;

        case 'ping':
          sendResponse({ success: true, message: 'Extension is active' });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async checkAndInjectContentScript(tabId, url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const jobSites = [
        'linkedin.com', 'indeed.com', 'glassdoor.com', 
        'angel.co', 'wellfound.com', 'ziprecruiter.com',
        'jobvite.com', 'workday.com', 'lever.co', 'greenhouse.io'
      ];

      if (jobSites.some(site => hostname.includes(site))) {
        // Check if content script is already injected
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
          // Content script not present, inject it
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });

          await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['content.css']
          });

          console.log('Content script injected into:', hostname);
        }
      }
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }

  async saveApplication(applicationData) {
    try {
      console.log('🔄 Attempting to save application to:', `${this.apiUrl}/api/applications`);
      console.log('📤 Application data:', applicationData);
      
      // Get auth token from storage
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ No authentication token found');
        throw new Error('Authentication required. Please sign in to Job Tracker.');
      }
      
      // Save directly to cloud API
      const response = await fetch(`${this.apiUrl}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...applicationData,
          dateAdded: new Date().toISOString()
        })
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const savedApplication = await response.json();
      console.log('✅ Application saved to cloud:', savedApplication);
      
      return savedApplication;
    } catch (error) {
      console.error('❌ Failed to save application to cloud:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    }
  }

  async getApplications() {
    try {
      // Get auth token from storage
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ No authentication token found');
        return [];
      }
      
      const response = await fetch(`${this.apiUrl}/api/applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data || [];
    } catch (error) {
      console.error('Failed to get applications from cloud:', error);
      return [];
    }
  }

  async testCloudConnection() {
    try {
      console.log('🔄 Testing connection to:', `${this.apiUrl}/api/health`);
      
      // Add /api prefix to the health endpoint
      const response = await fetch(`${this.apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });
      
      console.log('📥 Health check response status:', response.status);
      console.log('📥 Health check response ok:', response.ok);

      if (response.ok) {
        const health = await response.json();
        console.log('✅ Cloud API connection verified:', health);
        return true;
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.warn('⚠️ API health check timed out - server may be starting up');
      } else {
        console.warn('⚠️ Cloud API connection check failed:', error.message);
      }
      return false;
    }
  }

  async handleApplicationNotification(applicationData, frontendUrl) {
    try {
      console.log('🔔 Handling application notification for:', applicationData.jobTitle);
      
      // Find open job tracker tabs - specifically look for localhost:8080
      const queries = [
        chrome.tabs.query({ url: 'http://localhost:8080/*' }),
        chrome.tabs.query({ url: 'http://localhost:8080' }),
        chrome.tabs.query({ url: 'file://*index.html*' })
      ];
      
      const tabResults = await Promise.all(queries);
      const allTabs = tabResults.flat();
      
      // Filter tabs that contain the job tracker
      const trackerTabs = allTabs.filter(tab => 
        tab.url && (
          tab.url.includes('localhost:8080') || 
          tab.url.includes('index.html') || 
          tab.url.includes('job-tracker')
        )
      );
      
      console.log(`Found ${trackerTabs.length} potential job tracker tabs`);
      
      for (const tab of trackerTabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'applicationAdded',
            application: applicationData
          });
          console.log('✅ Notified tab about new application:', tab.id, tab.url);
        } catch (tabError) {
          console.log('Could not notify tab:', tab.id, tabError.message);
        }
      }
      
      // Also try to refresh all tabs that might be the job tracker
      if (trackerTabs.length === 0) {
        console.log('No tracker tabs found, application will sync when tracker is opened');
      }
      
      console.log('✅ Application notification completed');
    } catch (error) {
      console.warn('Failed to handle application notification:', error);
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      return result.settings || {
        notifications: true,
        autoDetectApply: true,
        quickSaveEnabled: true,
        apiUrl: this.apiUrl
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  // Authentication token management
  async getAuthToken() {
    try {
      const result = await chrome.storage.local.get(['authToken']);
      return result.authToken;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      await chrome.storage.local.set({ authToken: token });
      console.log('✅ Auth token stored in extension');
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  }

  async removeAuthToken() {
    try {
      await chrome.storage.local.remove(['authToken']);
      console.log('✅ Auth token removed from extension');
    } catch (error) {
      console.error('Failed to remove auth token:', error);
    }
  }

  // Sync auth token from main app
  async syncAuthToken() {
    try {
      console.log('🔄 Attempting to sync auth token from main app...');
      
      // Check if main app is open and get token from it via messaging
      const tabs = await chrome.tabs.query({});
      const mainAppTabs = tabs.filter(tab => 
        tab.url && (
          tab.url.includes('localhost:8080') || 
          tab.url.includes('127.0.0.1:8080') ||
          tab.url.includes('.vercel.app')
        )
      );
      
      console.log(`Found ${mainAppTabs.length} potential main app tabs`);
      
      for (const tab of mainAppTabs) {
        try {
          console.log('Trying to get token from tab:', tab.url);
          
          // Try to message the main app tab directly
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getAuthToken'
          });
          
          if (response && response.token) {
            await this.setAuthToken(response.token);
            console.log('✅ Auth token synced from main app via messaging');
            
            // Also store user data if available
            if (response.user) {
              await chrome.storage.local.set({ 
                userData: typeof response.user === 'string' ? JSON.parse(response.user) : response.user
              });
            }
            
            return response.token;
          }
        } catch (error) {
          console.log('Could not sync token from tab via messaging:', tab.id, error.message);
          
          // Fallback: try content script injection if messaging fails
          try {
            if (tab.url.includes('localhost:8080') || tab.url.includes('127.0.0.1:8080')) {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  try {
                    return {
                      token: localStorage.getItem('jobTracker_token'),
                      user: localStorage.getItem('jobTracker_user')
                    };
                  } catch (e) {
                    return null;
                  }
                }
              });
              
              if (results && results[0] && results[0].result && results[0].result.token) {
                const tokenData = results[0].result;
                await this.setAuthToken(tokenData.token);
                console.log('✅ Auth token synced from main app via scripting fallback');
                
                if (tokenData.user) {
                  await chrome.storage.local.set({ 
                    userData: JSON.parse(tokenData.user)
                  });
                }
                
                return tokenData.token;
              }
            }
          } catch (scriptError) {
            console.log('Scripting fallback also failed:', scriptError.message);
          }
        }
      }
      
      console.warn('⚠️ No main app tabs found with valid tokens');
      return null;
    } catch (error) {
      console.error('Failed to sync auth token:', error);
      return null;
    }
  }

  setupPeriodicHealthCheck() {
    // Check API health every 30 minutes
    setInterval(() => {
      this.testCloudConnection();
    }, 30 * 60 * 1000);
    
    // Sync auth token every 5 minutes if not present
    setInterval(async () => {
      const currentToken = await this.getAuthToken();
      if (!currentToken) {
        console.log('🔄 No auth token found, attempting periodic sync...');
        this.syncAuthToken();
      }
    }, 5 * 60 * 1000);
  }

  async migrateData() {
    try {
      // Check if migration is needed
      const result = await chrome.storage.local.get(['version']);
      const currentVersion = chrome.runtime.getManifest().version;
      
      if (result.version !== currentVersion) {
        console.log('Migrating data to version:', currentVersion);
        
        // Perform any necessary data migrations here
        // For example, updating data structure for new features
        
        await chrome.storage.local.set({ version: currentVersion });
        console.log('Data migration completed');
      }
    } catch (error) {
      console.error('Data migration failed:', error);
    }
  }

  // Notification system
  async showNotification(title, message, type = 'basic') {
    try {
      const settings = await this.getSettings();
      if (!settings.notifications) return;

      await chrome.notifications.create({
        type: type,
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Context menu setup
  async setupContextMenus() {
    try {
      chrome.contextMenus.removeAll();
      
      chrome.contextMenus.create({
        id: 'trackJob',
        title: 'Track this job with Job Tracker',
        contexts: ['page', 'selection'],
        documentUrlPatterns: [
          '*://*.linkedin.com/*',
          '*://*.indeed.com/*',
          '*://*.glassdoor.com/*',
          '*://*.angel.co/*',
          '*://*.wellfound.com/*',
          '*://*.ziprecruiter.com/*'
        ]
      });

      chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'trackJob') {
          chrome.tabs.sendMessage(tab.id, { action: 'showJobTracker' });
        }
      });
    } catch (error) {
      console.error('Failed to setup context menus:', error);
    }
  }
}

// Initialize background service
new JobTrackerBackground();
