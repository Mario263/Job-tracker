// UI management for chrome extension

const UIManager = {
  addFloatingButton() {
    // Remove existing button if any
    const existingButton = document.getElementById('job-tracker-floating-btn');
    if (existingButton) {
      existingButton.remove();
    }

    const button = document.createElement('div');
    button.id = 'job-tracker-floating-btn';
    button.className = 'job-tracker-floating-btn';
    button.innerHTML = `
      <div class="job-tracker-btn-content">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
        <span>Track Job</span>
      </div>
    `;
    
    button.addEventListener('click', () => {
      console.log('Floating button clicked');
      this.showJobTracker();
    });
    
    button.title = 'Job Tracker Extension - Click to track this job';
    document.body.appendChild(button);
    console.log('Floating button added to page');
  },

  showJobTracker() {
    console.log('Showing job tracker modal...');
    
    // Remove existing modal if any
    const existingModal = document.getElementById('job-tracker-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'job-tracker-modal';
    modal.className = 'job-tracker-modal';
    modal.innerHTML = this.createModalHTML();
    
    document.body.appendChild(modal);
    this.setupModalEvents(modal);
    
    // Ensure form fields are editable after a short delay
    setTimeout(() => {
      this.prefillForm();
    }, 100);
  },

  createModalHTML() {
    const jobData = window.currentJobData || {};
    
    return `
      <div class="job-tracker-overlay">
        <div class="job-tracker-content">
          <div class="job-tracker-header">
            <h3>📊 Job Tracker - Add Application</h3>
            <button class="job-tracker-close" id="job-tracker-close">×</button>
          </div>
          
          <div class="job-tracker-body">
            <div class="job-tracker-section">
              <h4>🔍 Auto-Detected Information</h4>
              <div class="job-tracker-detected">
                <div><strong>Job Title:</strong> <span id="detected-title">${jobData.jobTitle || 'Not detected'}</span></div>
                <div><strong>Company:</strong> <span id="detected-company">${jobData.company || 'Not detected'}</span></div>
                <div><strong>Location:</strong> <span id="detected-location">${jobData.location || 'Not detected'}</span></div>
                <div><strong>Portal:</strong> <span id="detected-portal">${jobData.jobPortal || 'Not detected'}</span></div>
              </div>
            </div>

            <form id="job-tracker-form" class="job-tracker-form">
              <div class="job-tracker-grid">
                <div class="job-tracker-field">
                  <label>Job Title *</label>
                  <input type="text" id="jt-jobTitle" required>
                </div>
                
                <div class="job-tracker-field">
                  <label>Company *</label>
                  <input type="text" id="jt-company" required>
                </div>
                
                <div class="job-tracker-field">
                  <label>Job Portal</label>
                  <select id="jt-jobPortal">
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Glassdoor">Glassdoor</option>
                    <option value="AngelList">AngelList</option>
                    <option value="ZipRecruiter">ZipRecruiter</option>
                    <option value="Company Website">Company Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div class="job-tracker-field">
                  <label>Status</label>
                  <select id="jt-status">
                    <option value="Applied">Applied</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Phone Screen">Phone Screen</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                
                <div class="job-tracker-field">
                  <label>Location</label>
                  <input type="text" id="jt-location">
                </div>
                
                <div class="job-tracker-field">
                  <label>Priority</label>
                  <select id="jt-priority">
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                
                <div class="job-tracker-field">
                  <label>Job Type</label>
                  <select id="jt-jobType">
                    <option value="">Select Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                
                <div class="job-tracker-field">
                  <label>Salary Range</label>
                  <input type="text" id="jt-salaryRange" placeholder="e.g., $80k-$100k">
                </div>
              </div>
              
              <div class="job-tracker-field-full">
                <label>Notes</label>
                <textarea id="jt-notes" rows="3" placeholder="Additional notes about this application..."></textarea>
              </div>
              
              <div class="job-tracker-actions">
                <button type="button" id="jt-save" class="job-tracker-btn-primary">💾 Save Application</button>
                <button type="button" id="jt-save-open" class="job-tracker-btn-secondary">💾📱 Save & Open Tracker</button>
                <button type="button" id="jt-cancel" class="job-tracker-btn-cancel">Cancel</button>
              </div>
            </form>
          </div>
          
          <div class="job-tracker-status" id="jt-status-message" style="display: none;"></div>
        </div>
      </div>
    `;
  },

  setupModalEvents(modal) {
    // Close modal
    modal.querySelector('#job-tracker-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#jt-cancel').addEventListener('click', () => {
      modal.remove();
    });

    // Close on overlay click
    modal.querySelector('.job-tracker-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('job-tracker-overlay')) {
        modal.remove();
      }
    });

    // Save application
    modal.querySelector('#jt-save').addEventListener('click', () => {
      if (window.DataManager) {
        window.DataManager.saveApplication(false);
      }
    });

    // Save and open tracker
    modal.querySelector('#jt-save-open').addEventListener('click', () => {
      if (window.DataManager) {
        window.DataManager.saveApplication(true);
      }
    });

    // Prevent form submission
    modal.querySelector('#job-tracker-form').addEventListener('submit', (e) => {
      e.preventDefault();
    });

    // Pre-fill form
    this.prefillForm();
  },

  prefillForm() {
    console.log('🔧 Prefilling and enabling form fields...');
    const jobData = window.currentJobData || {};
    
    // First ensure all form fields are interactive regardless of prefill data
    const allFormFields = document.querySelectorAll('#job-tracker-form input, #job-tracker-form select, #job-tracker-form textarea');
    console.log(`Found ${allFormFields.length} form fields to enable`);
    
    allFormFields.forEach((field, index) => {
      field.disabled = false;
      field.readOnly = false;
      field.style.pointerEvents = 'auto';
      field.style.cursor = field.tagName === 'SELECT' ? 'pointer' : 'text';
      field.style.opacity = '1';
      field.style.backgroundColor = field.tagName === 'SELECT' ? '#fff' : '#fff';
      console.log(`Enabled field ${index + 1}: ${field.id || field.name || 'unnamed'}`);
    });
    
    // Then prefill with detected data
    const formData = {
      'jt-jobTitle': jobData.jobTitle,
      'jt-company': jobData.company,
      'jt-jobPortal': jobData.jobPortal || this.detectJobPortal(),
      'jt-location': jobData.location,
      'jt-jobType': jobData.jobType,
      'jt-salaryRange': jobData.salaryRange
    };

    Object.entries(formData).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element && value) {
        element.value = value;
        console.log(`Prefilled ${id} with: ${value}`);
      }
    });

    // Set job URL in hidden field
    const jobUrlInput = document.getElementById('jt-jobUrl');
    if (jobUrlInput) {
      jobUrlInput.value = jobData.jobUrl || window.location.href;
    } else {
      // Create hidden field for job URL
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'jt-jobUrl';
      hiddenInput.value = jobData.jobUrl || window.location.href;
      const form = document.getElementById('job-tracker-form');
      if (form) {
        form.appendChild(hiddenInput);
      }
    }
    
    console.log('✅ Form prefill and enabling completed');
  },
  
  detectJobPortal() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('indeed')) return 'Indeed';
    if (hostname.includes('glassdoor')) return 'Glassdoor';
    if (hostname.includes('angel') || hostname.includes('wellfound')) return 'AngelList';
    if (hostname.includes('ziprecruiter')) return 'ZipRecruiter';
    return 'Other';
  },

  showStatus(message, type) {
    const statusEl = document.getElementById('jt-status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `job-tracker-status ${type}`;
      statusEl.style.display = 'block';
    }
  },

  showQuickSavePrompt() {
    // Don't show if modal is open
    if (document.getElementById('job-tracker-modal')) {
      return;
    }

    // Quick notification to save the application
    const notification = document.createElement('div');
    notification.className = 'job-tracker-notification';
    notification.innerHTML = `
      <div class="job-tracker-notification-content">
        <div class="job-tracker-notification-text">
          <strong>Job application submitted!</strong>
          <p>Would you like to track this application?</p>
        </div>
        <div class="job-tracker-notification-actions">
          <button class="job-tracker-btn-small job-tracker-btn-primary" id="quick-track">
            📊 Track It
          </button>
          <button class="job-tracker-btn-small job-tracker-btn-cancel" id="quick-dismiss">
            ✕
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 8000);

    // Event listeners
    notification.querySelector('#quick-track').addEventListener('click', () => {
      notification.remove();
      this.showJobTracker();
    });

    notification.querySelector('#quick-dismiss').addEventListener('click', () => {
      notification.remove();
    });
  }
};

window.UIManager = UIManager;