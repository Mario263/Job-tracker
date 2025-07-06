// Chrome Extension Popup - Fixed to match HTML elements

class ExtensionPopup {
  constructor() {
    this.currentTab = null;
    this.jobData = {};
    this.authToken = null;
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Extension Popup...');
    
    try {
      await this.getCurrentTab();
      await this.loadAuthToken();
      
      // If no token found, force sync immediately
      if (!this.authToken) {
        console.log('🔄 No token found in popup, forcing sync...');
        
        // Try multiple sync methods
        const syncResponse = await chrome.runtime.sendMessage({
          action: 'syncAuthToken'
        });
        
        if (syncResponse?.token) {
          this.authToken = syncResponse.token;
          console.log('✅ Token synced in popup initialization');
        } else {
          // If background sync failed, try direct tab query
          console.log('🔄 Background sync failed, trying direct tab query...');
          try {
            const tabs = await chrome.tabs.query({});
            const mainAppTabs = tabs.filter(tab => 
              tab.url && tab.url.includes('localhost:8080')
            );
            
            for (const tab of mainAppTabs) {
              try {
                if (!chrome.runtime || !chrome.runtime.id) {
                  console.warn('⚠️ Extension context invalid, cannot message tabs');
                  break;
                }
                
                const response = await chrome.tabs.sendMessage(tab.id, {
                  action: 'getAuthToken'
                });
                
                if (response?.token) {
                  this.authToken = response.token;
                  // Store it for the background script too
                  if (chrome.runtime && chrome.runtime.id) {
                    try {
                      await chrome.storage.local.set({ authToken: response.token });
                      console.log('✅ Token synced directly from main app tab');
                    } catch (storageError) {
                      if (storageError.message && storageError.message.includes('Extension context invalidated')) {
                        console.warn('⚠️ Extension context invalidated, cannot store token');
                      } else {
                        console.warn('Failed to store token:', storageError);
                      }
                    }
                  }
                  break;
                }
              } catch (tabError) {
                if (tabError.message && tabError.message.includes('Extension context invalidated')) {
                  console.warn('⚠️ Extension context invalidated, cannot message tabs');
                  break;
                } else {
                  console.log('Could not message tab:', tab.id);
                }
              }
            }
          } catch (error) {
            console.log('Direct tab query failed:', error);
          }
        }
      }
      
      await this.loadJobData();
      await this.loadStats();
      this.setupEventListeners();
      this.updateUI();
      this.checkConnection();
      
      console.log('✅ Extension Popup initialized');
    } catch (error) {
      console.error('❌ Failed to initialize popup:', error);
      this.showError('Failed to initialize extension');
    }
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  async loadAuthToken() {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        const result = await chrome.storage.local.get(['authToken']);
        this.authToken = result.authToken;
        console.log('🔐 Auth token loaded:', this.authToken ? 'Found' : 'Not found');
      } else {
        console.warn('⚠️ Extension context invalid, cannot load auth token');
      }
      
      // If no token, try to sync from main app
      if (!this.authToken) {
        console.log('🔄 No token found, attempting sync from main app...');
        if (chrome.runtime && chrome.runtime.id) {
          try {
            const syncResponse = await chrome.runtime.sendMessage({
              action: 'syncAuthToken'
            });
            
            if (syncResponse?.token) {
              this.authToken = syncResponse.token;
              console.log('✅ Token synced from main app');
            } else {
              console.log('⚠️ Could not sync token from main app');
            }
          } catch (syncError) {
            if (syncError.message && syncError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated, cannot sync token');
            } else {
              console.log('⚠️ Could not sync token from main app:', syncError);
            }
          }
        }
      }
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('⚠️ Extension context invalidated, cannot load auth token');
      } else {
        console.error('Failed to load auth token:', error);
      }
    }
  }

  async loadJobData() {
    if (!this.currentTab) return;
    
    try {
      // Try to get job data from content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, { 
        action: 'getJobData' 
      });
      this.jobData = response?.data || {};
    } catch (error) {
      console.log('Content script not available:', error);
      this.jobData = {};
    }
  }

  async loadStats() {
    try {
      if (!this.authToken) {
        document.getElementById('total-apps').textContent = '0';
        document.getElementById('this-week').textContent = '0';
        return;
      }

      if (!chrome.runtime || !chrome.runtime.id) {
        console.warn('⚠️ Extension context invalid, cannot load stats');
        document.getElementById('total-apps').textContent = '-';
        document.getElementById('this-week').textContent = '-';
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        action: 'getApplications'
      });
      
      if (response?.success && response.data) {
        const apps = response.data;
        document.getElementById('total-apps').textContent = apps.length;
        
        // Calculate this week's applications
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeek = apps.filter(app => new Date(app.dateAdded) > oneWeekAgo);
        document.getElementById('this-week').textContent = thisWeek.length;
        
        this.updateRecentActivity(apps.slice(0, 3));
      } else {
        document.getElementById('total-apps').textContent = '0';
        document.getElementById('this-week').textContent = '0';
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      document.getElementById('total-apps').textContent = '-';
      document.getElementById('this-week').textContent = '-';
    }
  }

  setupEventListeners() {
    // Track current job button
    const trackBtn = document.getElementById('track-current');
    if (trackBtn) {
      trackBtn.addEventListener('click', () => {
        this.trackCurrentJob();
      });
    }

    // Open tracker button  
    const openBtn = document.getElementById('open-tracker');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.openJobTracker();
      });
    }

    // View applications button
    const viewBtn = document.getElementById('view-applications');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        this.openJobTracker();
      });
    }

    // Settings link
    const settingsLink = document.getElementById('settings-link');
    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSettings();
      });
    }

    // Help link
    const helpLink = document.getElementById('help-link');
    if (helpLink) {
      helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openHelp();
      });
    }
  }

  updateUI() {
    // Update page status
    const pageStatus = document.getElementById('page-status');
    if (pageStatus) {
      const hostname = this.currentTab?.url ? new URL(this.currentTab.url).hostname : 'unknown';
      
      if (this.isJobSite(hostname)) {
        if (this.jobData.jobTitle || this.jobData.company) {
          pageStatus.innerHTML = `
            ✅ Job detected on ${hostname}<br>
            <strong>${this.jobData.jobTitle || 'Unknown Title'}</strong><br>
            <em>${this.jobData.company || 'Unknown Company'}</em>
          `;
        } else {
          // Try to extract job data immediately
          this.extractJobDataFromPage();
          pageStatus.textContent = `🔍 Scanning ${hostname} for job details...`;
        }
      } else {
        pageStatus.textContent = `ℹ️ Not a recognized job site (${hostname})`;
      }
    }

    // Update track button
    this.updateTrackButton();
  }

  updateRecentActivity(apps) {
    const recentList = document.getElementById('recent-list');
    if (!recentList) return;

    if (apps.length === 0) {
      recentList.innerHTML = '<div class="activity-item">No recent applications</div>';
      return;
    }

    const html = apps.map(app => `
      <div class="activity-item">
        <strong>${app.jobTitle}</strong> at ${app.company}<br>
        <small>${new Date(app.dateAdded).toLocaleDateString()}</small>
      </div>
    `).join('');

    recentList.innerHTML = html;
  }

  async trackCurrentJob() {
    if (!this.currentTab) return;
    
    try {
      this.showLoading('Tracking job...');
      
      // First try to get fresh job data
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractJobData'
      });
      
      if (response?.data) {
        this.jobData = response.data;
      }

      // Save the job data
      if (!chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context invalidated. Please reload the extension.');
      }
      
      const saveResponse = await chrome.runtime.sendMessage({
        action: 'saveApplication',
        data: {
          jobTitle: this.jobData.jobTitle || 'Unknown Position',
          company: this.jobData.company || 'Unknown Company',
          location: this.jobData.location || '',
          description: this.jobData.description || '',
          jobUrl: this.currentTab.url,
          status: 'Applied',
          priority: 'Medium'
        }
      });
      
      if (saveResponse?.success) {
        this.showSuccess('✅ Job tracked successfully!');
        await this.loadStats(); // Refresh stats
        setTimeout(() => window.close(), 2000);
      } else {
        throw new Error(saveResponse?.error || 'Failed to save application');
      }
    } catch (error) {
      console.error('Failed to track job:', error);
      this.showError(`❌ ${error.message}`);
    }
  }

  async openJobTracker() {
    try {
      await chrome.tabs.create({
        url: 'http://localhost:8080',
        active: true
      });
      window.close();
    } catch (error) {
      console.error('Failed to open tracker:', error);
      this.showError('Failed to open job tracker');
    }
  }

  async checkConnection() {
    try {
      if (!chrome.runtime || !chrome.runtime.id) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
          statusEl.className = 'status-indicator status-offline';
          statusEl.innerHTML = '<div class="status-dot"></div><span>❌ Extension context invalid</span>';
        }
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        action: 'testConnection'
      });
      
      const statusEl = document.getElementById('connection-status');
      if (!statusEl) return;

      if (this.authToken && response?.connected) {
        // Try to get user data
        let userName = 'User';
        if (chrome.runtime && chrome.runtime.id) {
          try {
            const userData = await chrome.storage.local.get(['userData']);
            userName = userData.userData?.name || 'User';
          } catch (userDataError) {
            if (userDataError.message && userDataError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated, using default username');
            } else {
              console.warn('Failed to get user data:', userDataError);
            }
          }
        }
        
        statusEl.className = 'status-indicator status-connected';
        statusEl.innerHTML = `<div class="status-dot"></div><span>✅ Signed in as ${userName}</span>`;
      } else if (response?.connected) {
        statusEl.className = 'status-indicator status-offline';
        statusEl.innerHTML = '<div class="status-dot"></div><span>⚠️ Connected but not signed in</span>';
        
        // Try to sync token automatically
        console.log('Not authenticated, attempting token sync...');
        if (!chrome.runtime || !chrome.runtime.id) {
          console.warn('⚠️ Extension context invalid, cannot sync token');
          return;
        }
        
        const syncResponse = await chrome.runtime.sendMessage({
          action: 'syncAuthToken'
        });
        
        if (syncResponse?.token) {
          this.authToken = syncResponse.token;
          statusEl.className = 'status-indicator status-connected';
          statusEl.innerHTML = '<div class="status-dot"></div><span>✅ Authentication synced</span>';
          
          // Reload stats and update UI
          await this.loadStats();
          this.updateTrackButton();
        }
      } else {
        statusEl.className = 'status-indicator status-offline';
        statusEl.innerHTML = '<div class="status-dot"></div><span>❌ Offline - Check connection</span>';
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      const statusEl = document.getElementById('connection-status');
      if (statusEl) {
        statusEl.className = 'status-indicator status-offline';
        statusEl.innerHTML = '<div class="status-dot"></div><span>❌ Connection failed</span>';
      }
    }
  }

  openSettings() {
    chrome.tabs.create({ url: 'http://localhost:8080/signin.html' });
  }

  openHelp() {
    chrome.tabs.create({ url: 'http://localhost:8080' });
  }

  async extractJobDataFromPage() {
    if (!this.currentTab) return;
    
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractJobData'
      });
      
      if (response?.data) {
        this.jobData = response.data;
        console.log('✅ Job data extracted:', this.jobData);
        
        // Update UI with new data
        const pageStatus = document.getElementById('page-status');
        if (pageStatus && (this.jobData.jobTitle || this.jobData.company)) {
          const hostname = new URL(this.currentTab.url).hostname;
          pageStatus.innerHTML = `
            ✅ Job detected on ${hostname}<br>
            <strong>${this.jobData.jobTitle || 'Unknown Title'}</strong><br>
            <em>${this.jobData.company || 'Unknown Company'}</em>
          `;
          
          // Update button state
          this.updateTrackButton();
        }
      }
    } catch (error) {
      console.log('Could not extract job data:', error);
    }
  }

  updateTrackButton() {
    const trackBtn = document.getElementById('track-current');
    if (trackBtn) {
      if (!this.authToken) {
        trackBtn.disabled = true;
        trackBtn.textContent = '🔒 Sign in Required';
        trackBtn.style.background = '#95a5a6';
      } else if (this.jobData.jobTitle || this.jobData.company) {
        trackBtn.disabled = false;
        trackBtn.textContent = '📊 Track This Job';
        trackBtn.style.background = 'linear-gradient(135deg, #27ae60, #229954)';
      } else {
        trackBtn.disabled = true;
        trackBtn.textContent = '🔍 No Job Detected';
        trackBtn.style.background = '#95a5a6';
      }
    }
  }

  isJobSite(hostname) {
    const jobSites = [
      'linkedin.com', 'indeed.com', 'glassdoor.com', 
      'angel.co', 'wellfound.com', 'ziprecruiter.com',
      'jobvite.com', 'workday.com', 'lever.co', 'greenhouse.io'
    ];
    return jobSites.some(site => hostname.includes(site));
  }

  showLoading(message) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.className = 'status-indicator';
      statusEl.innerHTML = `<div class="status-dot"></div><span>🔄 ${message}</span>`;
    }
  }

  showSuccess(message) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.className = 'status-indicator status-connected';
      statusEl.innerHTML = `<div class="status-dot"></div><span>${message}</span>`;
    }
  }

  showError(message) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.className = 'status-indicator status-offline';
      statusEl.innerHTML = `<div class="status-dot"></div><span>${message}</span>`;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ExtensionPopup();
});