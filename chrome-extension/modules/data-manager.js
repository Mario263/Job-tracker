// Data management for chrome extension

const DataManager = {
  primaryApiUrl: 'http://localhost:3001',
  frontendUrl: 'http://localhost:8080',

  // Cloud-only save functionality
  async saveApplication(openTracker = false) {
    console.log('saveApplication called with openTracker:', openTracker);
    const formData = this.collectFormData();
    console.log('Form data collected:', formData);
    
    if (!formData.jobTitle || !formData.company) {
      UIManager.showStatus('Please fill in required fields (Job Title and Company)', 'error');
      return;
    }

    UIManager.showStatus('Saving application...', 'loading');

    try {
      // Notify website about new application
      console.log('Notifying website about new application...');
      await this.notifyWebsiteOfNewApplication(formData);
      
      // Save directly to cloud API only
      let apiSaveSuccess = false;
      
      try {
        console.log('Attempting cloud API save to:', this.primaryApiUrl);
        const result = await this.saveViaBackgroundScript(formData);
        if (result.success) {
          apiSaveSuccess = true;
          UIManager.showStatus('✅ Application saved to cloud!', 'success');
        } else {
          throw new Error(result.error || 'Background script save failed');
        }
      } catch (error) {
        console.warn('Background API save failed:', error);
        try {
          await this.saveToAPI(this.primaryApiUrl, formData);
          apiSaveSuccess = true;
          UIManager.showStatus('✅ Application saved to cloud!', 'success');
        } catch (directError) {
          console.error('Cloud API save failed:', directError);
          if (directError.message.includes('Authentication required')) {
            UIManager.showStatus('❌ Please sign in to Job Tracker to save applications', 'error');
          } else if (directError.message.includes('timeout') || directError.message.includes('offline')) {
            UIManager.showStatus('❌ Connection failed - please check your internet connection', 'error');
          } else {
            UIManager.showStatus('❌ Failed to save to cloud - please try again', 'error');
          }
          return; // Don't proceed if save failed
        }
      }

      // Only close modal and open tracker if save was successful
      if (apiSaveSuccess) {
        setTimeout(() => {
          const modal = document.getElementById('job-tracker-modal');
          if (modal) {
            modal.remove();
          }
          
          if (openTracker) {
            console.log('Opening tracker at:', this.frontendUrl);
            this.openTrackerWithNewApplication(formData);
          }
        }, 2000);
      }

    } catch (error) {
      console.error('Save failed:', error);
      UIManager.showStatus('❌ Failed to save application', 'error');
    }
  },

  collectFormData() {
    return {
      jobTitle: document.getElementById('jt-jobTitle').value.trim(),
      company: document.getElementById('jt-company').value.trim(),
      jobPortal: document.getElementById('jt-jobPortal').value,
      status: document.getElementById('jt-status').value,
      location: document.getElementById('jt-location').value.trim(),
      priority: document.getElementById('jt-priority').value,
      jobType: document.getElementById('jt-jobType').value,
      salaryRange: document.getElementById('jt-salaryRange').value.trim(),
      notes: document.getElementById('jt-notes').value.trim(),
      jobUrl: window.currentJobData?.jobUrl || window.location.href,
      applicationDate: new Date().toISOString().split('T')[0],
      dateAdded: new Date().toISOString(),
      id: Date.now() + Math.random(),
      resumeVersion: '',
      followUpDate: ''
    };
  },

  // This is a cloud-only application - no local storage functionality

  // Notification system
  async notifyWebsiteOfNewApplication(applicationData) {
    try {
      // Check if extension context is valid
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          action: 'notifyApplicationAdded',
          application: applicationData,
          frontendUrl: this.frontendUrl
        }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated. Please reload the extension.');
            } else {
              console.log('Background script communication failed:', chrome.runtime.lastError.message);
            }
          } else {
            console.log('✅ Notified background script about new application');
          }
        });
      } else {
        console.warn('⚠️ Extension context invalid or unavailable, skipping background notification');
      }
      
      // Trigger storage event for immediate sync
      const event = new CustomEvent('applicationAdded', {
        detail: applicationData
      });
      window.dispatchEvent(event);
      
      console.log('✅ Application notification sent');
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('⚠️ Extension context invalidated. Please reload the extension.');
      } else {
        console.warn('Failed to notify website:', error);
      }
    }
  },

  // Save via background script
  async saveViaBackgroundScript(applicationData) {
    return new Promise((resolve, reject) => {
      // Check if extension context is valid
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        reject(new Error('Extension context invalidated. Please reload the extension.'));
        return;
      }

      try {
        chrome.runtime.sendMessage({
          action: 'saveApplication',
          data: applicationData
        }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              reject(new Error('Extension context invalidated. Please reload the extension.'));
            } else {
              reject(new Error(chrome.runtime.lastError.message));
            }
            return;
          }
          resolve(response);
        });
      } catch (error) {
        if (error.message && error.message.includes('Extension context invalidated')) {
          reject(new Error('Extension context invalidated. Please reload the extension.'));
        } else {
          reject(error);
        }
      }
    });
  },

  // Enhanced API save with better error handling
  async saveToAPI(apiUrl, applicationData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Get auth token from storage
      let authToken = null;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.runtime && chrome.runtime.id) {
        try {
          const result = await chrome.storage.local.get(['authToken']);
          authToken = result.authToken;
        } catch (error) {
          if (error.message && error.message.includes('Extension context invalidated')) {
            console.warn('⚠️ Extension context invalidated, cannot get auth token');
          } else {
            console.warn('Could not get auth token from storage:', error);
          }
        }
      } else {
        console.warn('⚠️ Extension context invalid or chrome.storage unavailable');
      }

      if (!authToken) {
        throw new Error('Authentication required. Please sign in to Job Tracker.');
      }

      const response = await fetch(`${apiUrl}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(applicationData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Application saved to API:', result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server may be offline');
      }
      throw error;
    }
  },

  // Open tracker and highlight the new application
  async openTrackerWithNewApplication(applicationData) {
    try {
      const trackerWindow = window.open(this.frontendUrl, '_blank');
      
      setTimeout(() => {
        if (trackerWindow && !trackerWindow.closed) {
          try {
            trackerWindow.postMessage({
              type: 'NEW_APPLICATION_FROM_EXTENSION',
              application: applicationData
            }, '*');
            console.log('✅ Sent application data to tracker window');
          } catch (error) {
            console.warn('Could not send data to tracker window:', error);
          }
        }
      }, 3000);
      
      // Check if extension context is valid before sending message
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          action: 'notifyApplicationAdded',
          application: applicationData,
          frontendUrl: this.frontendUrl
        }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated. Please reload the extension.');
            } else {
              console.log('Background script notification failed:', chrome.runtime.lastError.message);
            }
          }
        });
      } else {
        console.warn('⚠️ Extension context invalid or unavailable, skipping background notification');
      }
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('⚠️ Extension context invalidated. Please reload the extension.');
      } else {
        console.error('Failed to open tracker:', error);
      }
      // Fallback: still try to open the tracker
      window.open(this.frontendUrl, '_blank');
    }
  }
};

window.DataManager = DataManager;