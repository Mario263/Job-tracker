// Data management for chrome extension

const DataManager = {
  primaryApiUrl: 'http://localhost:3001',
  frontendUrl: 'http://localhost:8080',

  // Enhanced save functionality
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
      // Always save to local storage first
      console.log('Saving to local storage...');
      await this.saveToLocalStorage(formData);
      console.log('Local storage save completed');
      
      // Notify website immediately
      console.log('Notifying website about new application...');
      await this.notifyWebsiteOfNewApplication(formData);
      
      // Try to save to API
      let apiSaveSuccess = false;
      
      try {
        console.log('Attempting API save to:', this.primaryApiUrl);
        const result = await this.saveViaBackgroundScript(formData);
        if (result.success) {
          apiSaveSuccess = true;
          UIManager.showStatus('✅ Application saved and synced to cloud!', 'success');
        } else {
          throw new Error(result.error || 'Background script save failed');
        }
      } catch (error) {
        console.warn('API save failed:', error);
        try {
          await this.saveToAPI(this.primaryApiUrl, formData);
          apiSaveSuccess = true;
          UIManager.showStatus('✅ Application saved and synced to cloud!', 'success');
        } catch (directError) {
          console.warn('Direct API save also failed:', directError);
          UIManager.showStatus('✅ Application saved locally - will sync when online', 'success');
        }
      }

      // Close modal after delay
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

  // Enhanced Chrome extension storage
  async saveToLocalStorage(applicationData) {
    console.log('Attempting to save application data:', applicationData.jobTitle);
    
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.storage) {
          console.log('Chrome storage not available, using localStorage fallback');
          this.saveToLocalStorageFallback(applicationData);
          resolve();
          return;
        }
        
        chrome.storage.local.get(['jobApplications'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Chrome storage error:', chrome.runtime.lastError.message);
            this.saveToLocalStorageFallback(applicationData);
            resolve();
            return;
          }
          
          const applications = result.jobApplications || [];
          applications.push(applicationData);
          
          chrome.storage.local.set({ 
            jobApplications: applications,
            lastSync: new Date().toISOString()
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn('Chrome storage set error:', chrome.runtime.lastError.message);
              this.saveToLocalStorageFallback(applicationData);
              resolve();
              return;
            }
            console.log('✅ Application saved to Chrome storage:', applicationData.jobTitle);
            resolve();
          });
        });
      } catch (error) {
        console.warn('Chrome storage exception, using fallback:', error);
        this.saveToLocalStorageFallback(applicationData);
        resolve();
      }
    });
  },

  saveToLocalStorageFallback(applicationData) {
    try {
      const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
      applications.push(applicationData);
      localStorage.setItem('jobApplications', JSON.stringify(applications));
      localStorage.setItem('lastSync', new Date().toISOString());
      console.log('✅ Application saved to localStorage:', applicationData.jobTitle);
    } catch (localStorageError) {
      console.error('LocalStorage save failed:', localStorageError);
      throw localStorageError;
    }
  },

  // Notification system
  async notifyWebsiteOfNewApplication(applicationData) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'notifyApplicationAdded',
          application: applicationData,
          frontendUrl: this.frontendUrl
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Background script communication failed:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ Notified background script about new application');
          }
        });
      }
      
      // Trigger storage event for immediate sync
      const event = new CustomEvent('applicationAdded', {
        detail: applicationData
      });
      window.dispatchEvent(event);
      
      console.log('✅ Application notification sent');
    } catch (error) {
      console.warn('Failed to notify website:', error);
    }
  },

  // Save via background script
  async saveViaBackgroundScript(applicationData) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        reject(new Error('Chrome runtime not available'));
        return;
      }

      chrome.runtime.sendMessage({
        action: 'saveApplication',
        data: applicationData
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  },

  // Enhanced API save with better error handling
  async saveToAPI(apiUrl, applicationData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Get auth token from storage
      let authToken = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          const result = await chrome.storage.local.get(['authToken']);
          authToken = result.authToken;
        } catch (error) {
          console.warn('Could not get auth token from storage:', error);
        }
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
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'notifyApplicationAdded',
          application: applicationData,
          frontendUrl: this.frontendUrl
        });
      }
      
    } catch (error) {
      console.error('Failed to open tracker:', error);
      window.open(this.frontendUrl, '_blank');
    }
  }
};

window.DataManager = DataManager;