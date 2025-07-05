// Applications Feature Module - Cloud-Only MongoDB Integration
// Manages job application CRUD operations with MongoDB cloud database

(function() {
  'use strict';
  
  console.log('📋 Loading Applications Module (Cloud-Only)...');
  
  // Module state
  let applications = [];
  let isInitialized = false;
  
  // Initialize the module
  async function initialize() {
    if (isInitialized) {
      console.log('✅ Applications module already initialized');
      return;
    }
    
    try {
      await loadApplications();
      setupEventListeners();
      setDefaultValues();
      
      isInitialized = true;
      console.log(`📋 Applications module initialized with ${applications.length} applications`);
    } catch (error) {
      console.error('❌ Failed to initialize applications module:', error);
      showErrorMessage('Failed to load applications. Please check your connection.');
    }
  }
  
  // Load applications from cloud API
  async function loadApplications() {
    try {
      if (!window.apiService) {
        throw new Error('API service not available');
      }
      
      console.log('🔄 Fetching applications from API...');
      applications = await window.apiService.getApplications();
      
      console.log('✅ Applications loaded:', applications);
      
      // Update global reference for backward compatibility
      window.applications = applications;
      window.jobTracker.applications = applications;
      
      renderApplications();
      
      if (typeof window.updateAnalytics === 'function') {
        window.updateAnalytics();
      }
      
    } catch (error) {
      console.error('❌ Error loading applications:', error);
      applications = [];
      window.applications = [];
      window.jobTracker.applications = [];
      throw error;
    }
  }
  
  // Add new application
  async function addApplication(applicationData) {
    try {
      if (!window.apiService) {
        throw new Error('API service not available');
      }
      
      // Validate required fields
      if (!applicationData.jobTitle || !applicationData.company) {
        throw new Error('Job Title and Company are required');
      }
      
      const savedApplication = await window.apiService.saveApplication(applicationData);
      
      // Add to local state
      applications.push(savedApplication);
      window.applications = applications;
      window.jobTracker.applications = applications;
      
      // Update UI
      renderApplications();
      if (typeof window.updateAnalytics === 'function') {
        window.updateAnalytics();
      }
      
      return savedApplication;
      
    } catch (error) {
      console.error('❌ Error adding application:', error);
      throw error;
    }
  }
  
  // Update existing application
  async function updateApplication(id, applicationData) {
    try {
      if (!window.apiService) {
        throw new Error('API service not available');
      }
      
      const updatedApplication = await window.apiService.updateApplication(id, applicationData);
      
      // Update local state
      const index = applications.findIndex(app => app._id === id);
      if (index !== -1) {
        applications[index] = { ...applications[index], ...updatedApplication };
        window.applications = applications;
        window.jobTracker.applications = applications;
      }
      
      // Update UI
      renderApplications();
      if (typeof window.updateAnalytics === 'function') {
        window.updateAnalytics();
      }
      
      return updatedApplication;
      
    } catch (error) {
      console.error('❌ Error updating application:', error);
      throw error;
    }
  }
  
  // Delete application
  async function deleteApplication(id) {
    try {
      if (!window.apiService) {
        throw new Error('API service not available');
      }
      
      await window.apiService.deleteApplication(id);
      
      // Remove from local state
      applications = applications.filter(app => app._id !== id);
      window.applications = applications;
      window.jobTracker.applications = applications;
      
      // Update UI
      renderApplications();
      if (typeof window.updateAnalytics === 'function') {
        window.updateAnalytics();
      }
      
    } catch (error) {
      console.error('❌ Error deleting application:', error);
      throw error;
    }
  }
  
  // Filter applications based on criteria
  function filterApplications() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const companyFilter = document.getElementById('companyFilter')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('sortBy')?.value || 'date-desc';
    
    let filteredApplications = [...applications];
    
    // Apply status filter
    if (statusFilter) {
      filteredApplications = filteredApplications.filter(app => app.status === statusFilter);
    }
    
    // Apply company filter
    if (companyFilter) {
      filteredApplications = filteredApplications.filter(app => 
        app.company.toLowerCase().includes(companyFilter)
      );
    }
    
    // Apply sorting
    filteredApplications.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.applicationDate) - new Date(b.applicationDate);
        case 'date-desc':
          return new Date(b.applicationDate) - new Date(a.applicationDate);
        case 'company':
          return a.company.localeCompare(b.company);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'priority':
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        default:
          return 0;
      }
    });
    
    renderApplicationsTable(filteredApplications);
  }
  
  // Render applications table
  function renderApplications() {
    console.log(`📋 Rendering ${applications.length} applications`);
    
    // Clear any existing filters to show all applications
    const statusFilter = document.getElementById('statusFilter');
    const companyFilter = document.getElementById('companyFilter');
    if (statusFilter) statusFilter.value = '';
    if (companyFilter) companyFilter.value = '';
    
    renderApplicationsTable(applications);
  }
  
  // Render applications table with given data
  function renderApplicationsTable(appData) {
    const tbody = document.getElementById('applicationsBody');
    if (!tbody) {
      console.error('❌ applications table body element not found in DOM');
      return;
    }
    
    console.log(`📋 Rendering applications table with ${appData.length} applications`);
    
    tbody.innerHTML = '';
    
    if (appData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">📋</div>
            No applications match your filters. Try adjusting your search criteria.
          </td>
        </tr>
      `;
      console.log('📋 Displayed "no applications" message');
      return;
    }
    
    appData.forEach((app, index) => {
      const row = document.createElement('tr');
      
      // Apply priority styling
      if (app.priority === 'High') {
        row.classList.add('priority-high');
      } else if (app.priority === 'Medium') {
        row.classList.add('priority-medium');
      } else if (app.priority === 'Low') {
        row.classList.add('priority-low');
      }
      
      row.innerHTML = `
        <td>${formatDate(app.applicationDate)}</td>
        <td><strong>${escapeHtml(app.jobTitle)}</strong></td>
        <td>${escapeHtml(app.company)}</td>
        <td>${app.jobPortal || 'N/A'}</td>
        <td><span class="status-badge status-${app.status.toLowerCase().replace(/\\s+/g, '-')}">${app.status}</span></td>
        <td>${app.resumeVersion || 'N/A'}</td>
        <td>
          <span class="priority-badge priority-${app.priority.toLowerCase()}">${app.priority}</span>
        </td>
        <td>${app.followUpDate ? formatDate(app.followUpDate) : 'N/A'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm" onclick="window.ApplicationsModule.editApplication('${app._id}')" title="Edit">
              ✏️
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.ApplicationsModule.confirmDeleteApplication('${app._id}')" title="Delete">
              🗑️
            </button>
            ${app.jobUrl ? `<a href="${app.jobUrl}" target="_blank" class="btn btn-sm" title="View Job">🔗</a>` : ''}
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
    console.log(`✅ Successfully rendered ${appData.length} application rows in table`);
  }
  
  // Edit application
  function editApplication(id) {
    const app = applications.find(a => a._id === id);
    if (!app) {
      console.error('Application not found:', id);
      return;
    }
    
    // Populate form with application data
    document.getElementById('jobTitle').value = app.jobTitle || '';
    document.getElementById('company').value = app.company || '';
    document.getElementById('jobPortal').value = app.jobPortal || '';
    document.getElementById('jobUrl').value = app.jobUrl || '';
    document.getElementById('applicationDate').value = app.applicationDate ? app.applicationDate.split('T')[0] : '';
    document.getElementById('status').value = app.status || '';
    document.getElementById('resumeVersion').value = app.resumeVersion || '';
    document.getElementById('location').value = app.location || '';
    document.getElementById('salaryRange').value = app.salaryRange || '';
    document.getElementById('jobType').value = app.jobType || '';
    document.getElementById('priority').value = app.priority || '';
    document.getElementById('followUpDate').value = app.followUpDate ? app.followUpDate.split('T')[0] : '';
    document.getElementById('notes').value = app.notes || '';
    
    // Store the ID for updating
    document.getElementById('editingApplicationId').value = id;
    
    // Change the add button to update button
    const addButton = document.getElementById('applicationSubmitBtn');
    if (addButton) {
      addButton.textContent = 'Update Application';
    }
  }
  
  // Update application from form
  async function updateApplicationFromForm() {
    const id = document.getElementById('editingApplicationId').value;
    if (!id) {
      console.error('No application ID found for updating');
      return;
    }
    
    const applicationData = {
      jobTitle: document.getElementById('jobTitle').value.trim(),
      company: document.getElementById('company').value.trim(),
      jobPortal: document.getElementById('jobPortal').value,
      jobUrl: document.getElementById('jobUrl').value.trim(),
      applicationDate: document.getElementById('applicationDate').value,
      status: document.getElementById('status').value,
      resumeVersion: document.getElementById('resumeVersion').value,
      location: document.getElementById('location').value.trim(),
      salaryRange: document.getElementById('salaryRange').value.trim(),
      jobType: document.getElementById('jobType').value,
      priority: document.getElementById('priority').value,
      followUpDate: document.getElementById('followUpDate').value,
      notes: document.getElementById('notes').value.trim()
    };
    
    try {
      await updateApplication(id, applicationData);
      showSuccessMessage('Application updated successfully!');
      clearForm();
    } catch (error) {
      showErrorMessage('Failed to update application: ' + error.message);
    }
  }
  
  // Confirm delete application
  function confirmDeleteApplication(id) {
    const app = applications.find(a => a._id === id);
    if (!app) {
      console.error('Application not found:', id);
      return;
    }
    
    window.showCustomConfirmDialog(
      'Delete Application',
      `Are you sure you want to delete the application for ${app.jobTitle} at ${app.company}?`,
      () => deleteApplicationById(id)
    );
  }
  
  // Delete application by ID
  async function deleteApplicationById(id) {
    try {
      await deleteApplication(id);
      showSuccessMessage('Application deleted successfully!');
    } catch (error) {
      showErrorMessage('Failed to delete application: ' + error.message);
    }
  }
  
  // Duplicate application
  async function duplicateApplication(id) {
    const app = applications.find(a => a._id === id);
    if (!app) {
      showErrorMessage('Application not found');
      return;
    }
    
    // Create a copy without the ID
    const duplicatedApp = {
      jobTitle: app.jobTitle + ' (Copy)',
      company: app.company,
      jobPortal: app.jobPortal,
      jobUrl: app.jobUrl,
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'Applied',
      resumeVersion: app.resumeVersion,
      location: app.location,
      salaryRange: app.salaryRange,
      jobType: app.jobType,
      priority: app.priority,
      followUpDate: app.followUpDate,
      notes: app.notes,
      dateAdded: new Date().toISOString()
    };
    
    try {
      await addApplication(duplicatedApp);
      showSuccessMessage('Application duplicated successfully!');
    } catch (error) {
      showErrorMessage('Failed to duplicate application: ' + error.message);
    }
  }
  
  // Clear form and reset to add mode
  function clearForm() {
    document.getElementById('editingApplicationId').value = '';
    
    // Reset form fields
    const inputs = document.querySelectorAll('#applications input, #applications select, #applications textarea');
    inputs.forEach(input => {
      if (input.id === 'applicationDate') {
        input.value = new Date().toISOString().split('T')[0];
      } else if (input.id === 'status') {
        input.value = 'Applied';
      } else if (input.id === 'priority') {
        input.value = 'Medium';
      } else {
        input.value = '';
      }
    });
    
    // Reset button to add mode
    const addButton = document.getElementById('applicationSubmitBtn');
    if (addButton) {
      addButton.textContent = 'Add Application';
    }
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Add hidden field for editing application ID
    if (!document.getElementById('editingApplicationId')) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'editingApplicationId';
      hiddenInput.value = '';
      
      // Find the applications form section
      const applicationsSection = document.getElementById('applications');
      if (applicationsSection) {
        const formSection = applicationsSection.querySelector('.form-section');
        if (formSection) {
          formSection.appendChild(hiddenInput);
        }
      }
    }
  }
  
  // Set default form values
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
    if (window.showSuccessMessage) {
      window.showSuccessMessage(message);
    } else {
      console.log('✅', message);
    }
  }
  
  function showErrorMessage(message) {
    if (window.showErrorMessage) {
      window.showErrorMessage(message);
    } else {
      console.error('❌', message);
    }
  }
  
  // Public API
  window.ApplicationsModule = {
    initialize,
    loadApplications,
    addApplication,
    updateApplication,
    deleteApplication,
    editApplication,
    confirmDeleteApplication,
    updateApplicationFromForm,
    duplicateApplication,
    clearForm,
    renderApplications,
    filterApplications
  };
  
  // Global wrapper function for form submission
  async function addApplicationFromForm() {
    const applicationData = {
      jobTitle: document.getElementById('jobTitle').value.trim(),
      company: document.getElementById('company').value.trim(),
      jobPortal: document.getElementById('jobPortal').value || '',
      jobUrl: document.getElementById('jobUrl').value.trim(),
      applicationDate: document.getElementById('applicationDate').value || new Date().toISOString().split('T')[0],
      status: document.getElementById('status').value || 'Applied',
      resumeVersion: document.getElementById('resumeVersion').value || '',
      location: document.getElementById('location').value.trim(),
      salaryRange: document.getElementById('salaryRange').value.trim(),
      jobType: document.getElementById('jobType').value || '',
      priority: document.getElementById('priority').value || 'Medium',
      followUpDate: document.getElementById('followUpDate').value || null,
      notes: document.getElementById('notes').value.trim(),
      dateAdded: new Date().toISOString()
    };
    
    // Clean up empty dates
    if (!applicationData.followUpDate) {
      delete applicationData.followUpDate;
    }
    
    try {
      const savedApp = await addApplication(applicationData);
      showSuccessMessage('Application added successfully!');
      
      // Ensure UI is updated
      renderApplications();
      
      // Update analytics if available
      if (typeof window.updateAnalytics === 'function') {
        window.updateAnalytics();
      }
      
      clearForm();
    } catch (error) {
      console.error('Error in addApplicationFromForm:', error);
      showErrorMessage('Failed to add application: ' + error.message);
    }
  }
  
  // Unified submit function that handles both add and update
  window.submitApplication = function() {
    const editingId = document.getElementById('editingApplicationId').value;
    if (editingId) {
      updateApplicationFromForm();
    } else {
      addApplicationFromForm();
    }
  };

  // Export global functions for backward compatibility
  window.addApplication = addApplicationFromForm;
  window.editApplication = editApplication;
  window.deleteApplication = (id) => confirmDeleteApplication(id);
  window.duplicateApplication = duplicateApplication;
  window.renderApplications = renderApplications;
  window.clearForm = clearForm;
  window.filterApplications = filterApplications;
  
  // Auto-initialize when DOM is ready (but wait for authentication)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Don't auto-initialize - let the main app handle initialization after auth
      console.log('📋 Applications module DOM ready, waiting for main app initialization...');
    });
  } else {
    // Don't auto-initialize - let the main app handle initialization after auth
    console.log('📋 Applications module loaded, waiting for main app initialization...');
  }
  
  console.log('📋 Applications module loaded successfully (Cloud-Only)');
  
})();