// Core API Service - Cloud-Only MongoDB Service
// Handles all API communication with MongoDB cloud database

class APIService {
  constructor() {
    // Environment detection and URL configuration
    this.baseURL = this.determineBaseURL();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.authToken = null;
    
    console.log('🚀 API Service initialized with base URL:', this.baseURL);
    
    // Test connection on initialization
    this.testConnection();
  }

  determineBaseURL() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    if (hostname === 'localhost') {
      // Development environment
      return port === '8080' ? 'http://localhost:3001' : 'http://localhost:3001';
    } else {
      // Production environment (Vercel)
      return window.location.origin;
    }
  }

  async testConnection() {
    try {
      await this.checkHealth();
      console.log('✅ Cloud database connection verified');
    } catch (error) {
      console.error('❌ Cloud database connection failed:', error.message);
      this.showConnectionError();
    }
  }

  showConnectionError() {
    if (window.showErrorMessage) {
      window.showErrorMessage('Unable to connect to cloud database. Please check your internet connection.');
    }
  }


  // Set authentication token
  setAuthToken(token) {
    this.authToken = token;
    console.log('🔐 Authentication token set for API service');
  }

  // Generic request handler with comprehensive error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authentication token if available
    if (this.authToken) {
      config.headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    config.signal = controller.signal;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔗 API Request (attempt ${attempt}): ${config.method || 'GET'} ${url}`);
        
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API Response: ${endpoint}`, data);
        return data;
        
      } catch (error) {
        console.warn(`⚠️ API attempt ${attempt} failed for ${endpoint}:`, error.message);
        
        if (attempt === this.retryAttempts) {
          console.error(`❌ All ${this.retryAttempts} attempts failed for ${endpoint}`);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  // Health check with connection validation
  async checkHealth() {
    try {
      const health = await this.request('/health');
      return health;
    } catch (error) {
      console.warn('🔴 Health check failed:', error.message);
      throw error;
    }
  }

  // Applications API - Cloud-only
  async getApplications() {
    try {
      const response = await this.request('/applications');
      return response.data || response;
    } catch (error) {
      console.error('❌ Failed to fetch applications:', error.message);
      throw error;
    }
  }

  async saveApplication(applicationData) {
    // Create a copy and ensure clean data for API
    const cleanData = { ...applicationData };
    delete cleanData.id; // Remove local ID to prevent ObjectId issues
    delete cleanData._id; // Remove any MongoDB ID
    
    try {
      const result = await this.request('/applications', {
        method: 'POST',
        body: JSON.stringify(cleanData)
      });
      
      console.log('☁️ Application saved to cloud');
      return result;
    } catch (error) {
      console.error('❌ Failed to save application:', error.message);
      throw error;
    }
  }

  async updateApplication(id, applicationData) {
    try {
      const result = await this.request(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(applicationData)
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to update application:', error);
      throw error;
    }
  }

  async deleteApplication(id) {
    try {
      const result = await this.request(`/applications/${id}`, {
        method: 'DELETE'
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to delete application:', error);
      throw error;
    }
  }

  // Contacts API - Cloud-only
  async getContacts() {
    try {
      const response = await this.request('/contacts');
      return response.data || response;
    } catch (error) {
      console.error('❌ Failed to fetch contacts:', error.message);
      throw error;
    }
  }

  async saveContact(contactData) {
    try {
      const result = await this.request('/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData)
      });
      
      console.log('☁️ Contact saved to cloud');
      return result;
    } catch (error) {
      console.error('❌ Failed to save contact:', error.message);
      throw error;
    }
  }

  async updateContact(id, contactData) {
    try {
      const result = await this.request(`/contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contactData)
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to update contact:', error);
      throw error;
    }
  }

  async deleteContact(id) {
    try {
      const result = await this.request(`/contacts/${id}`, {
        method: 'DELETE'
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to delete contact:', error);
      throw error;
    }
  }

  // Analytics and stats
  async getApplicationStats() {
    try {
      return await this.request('/applications/stats');
    } catch (error) {
      console.error('❌ Failed to fetch statistics:', error.message);
      throw error;
    }
  }

  // Bulk sync for Chrome extension data
  async syncData(data) {
    try {
      return await this.request('/sync', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('❌ Failed to bulk sync data:', error);
      throw error;
    }
  }

  // Resumes API - Cloud-only
  async getResumes() {
    try {
      const response = await this.request('/resumes');
      return response.data || response;
    } catch (error) {
      console.error('❌ Failed to fetch resumes:', error.message);
      throw error;
    }
  }

  async saveResume(resumeData) {
    try {
      const result = await this.request('/resumes', {
        method: 'POST',
        body: JSON.stringify(resumeData)
      });
      
      console.log('☁️ Resume saved to cloud');
      return result;
    } catch (error) {
      console.error('❌ Failed to save resume:', error.message);
      throw error;
    }
  }

  async updateResume(id, resumeData) {
    try {
      const result = await this.request(`/resumes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(resumeData)
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to update resume:', error);
      throw error;
    }
  }

  async deleteResume(id) {
    try {
      const result = await this.request(`/resumes/${id}`, {
        method: 'DELETE'
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to delete resume:', error);
      throw error;
    }
  }

  async setDefaultResume(id) {
    try {
      const result = await this.request(`/resumes/${id}/default`, {
        method: 'PATCH'
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to set default resume:', error);
      throw error;
    }
  }

  // Chrome extension compatibility - Cloud sync only
  async getChromeStorageData() {
    try {
      const [applications, contacts, resumes] = await Promise.all([
        this.getApplications(),
        this.getContacts(),
        this.getResumes()
      ]);
      
      return { applications, contacts, resumes };
    } catch (error) {
      console.error('❌ Failed to fetch data for Chrome extension:', error.message);
      throw error;
    }
  }
}

// Create global instance
window.apiService = new APIService();

console.log('🚀 Cloud-only API service loaded successfully');