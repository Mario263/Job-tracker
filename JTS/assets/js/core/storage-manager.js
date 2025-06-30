// Persistent Storage Manager - Ensures data survives page refreshes
(function() {
    'use strict';
    
    console.log('🔒 Loading Persistent Storage Manager...');
    
    // Constants
    const STORAGE_KEYS = {
        APPLICATIONS: 'jobApplications',
        CONTACTS: 'jobContacts', 
        RESUMES: 'jobResumes'
    };
    
    // Test localStorage availability
    function testLocalStorage() {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            console.log('✅ localStorage is available and working');
            return true;
        } catch (error) {
            console.error('❌ localStorage is not available:', error);
            return false;
        }
    }
    
    // Save applications with error handling and backup
    function saveApplications(applications) {
        if (!Array.isArray(applications)) {
            console.error('❌ Invalid applications data:', applications);
            return false;
        }
        
        try {
            const dataString = JSON.stringify(applications);
            localStorage.setItem(STORAGE_KEYS.APPLICATIONS, dataString);
            
            // Create a backup with timestamp
            const backup = {
                data: applications,
                timestamp: new Date().toISOString(),
                count: applications.length
            };
            localStorage.setItem(STORAGE_KEYS.APPLICATIONS + '_backup', JSON.stringify(backup));
            
            console.log(`💾 Saved ${applications.length} applications to localStorage`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save applications:', error);
            return false;
        }
    }
    
    // Load applications with backup recovery
    function loadApplications() {
        try {
            const dataString = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
            if (!dataString) {
                console.log('📋 No applications found in localStorage');
                return [];
            }
            
            const applications = JSON.parse(dataString);
            if (!Array.isArray(applications)) {
                console.warn('⚠️ Invalid applications data, trying backup...');
                return loadApplicationsBackup();
            }
            
            console.log(`📋 Loaded ${applications.length} applications from localStorage`);
            return applications;
        } catch (error) {
            console.error('❌ Failed to load applications, trying backup:', error);
            return loadApplicationsBackup();
        }
    }
    
    // Load from backup if main storage fails
    function loadApplicationsBackup() {
        try {
            const backupString = localStorage.getItem(STORAGE_KEYS.APPLICATIONS + '_backup');
            if (!backupString) {
                console.log('📋 No backup found, starting fresh');
                return [];
            }
            
            const backup = JSON.parse(backupString);
            if (backup && backup.data && Array.isArray(backup.data)) {
                console.log(`🔄 Restored ${backup.data.length} applications from backup (${backup.timestamp})`);
                
                // Restore the main storage
                localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(backup.data));
                return backup.data;
            }
            
            return [];
        } catch (error) {
            console.error('❌ Backup recovery failed:', error);
            return [];
        }
    }
    
    // Force refresh applications display
    function refreshApplicationsDisplay() {
        try {
            const applications = loadApplications();
            window.applications = applications;
            
            if (typeof window.renderApplications === 'function') {
                window.renderApplications();
            }
            
            if (typeof window.updateAnalytics === 'function') {
                window.updateAnalytics();
            }
            
            console.log('🔄 Applications display refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh applications display:', error);
        }
    }
    
    // Monitor storage changes and update display
    function setupStorageMonitoring() {
        // Listen for storage events from other tabs/windows
        window.addEventListener('storage', function(e) {
            if (e.key === STORAGE_KEYS.APPLICATIONS) {
                console.log('📊 Applications updated in another tab, refreshing...');
                refreshApplicationsDisplay();
            }
        });
        
        // Periodic check for data integrity
        setInterval(function() {
            const applications = loadApplications();
            if (window.applications && JSON.stringify(window.applications) !== JSON.stringify(applications)) {
                console.log('🔄 Detected data mismatch, syncing...');
                window.applications = applications;
                refreshApplicationsDisplay();
            }
        }, 5000); // Check every 5 seconds
    }
    
    // Ensure data persistence across page reloads
    function ensureDataPersistence() {
        // Save before page unload
        window.addEventListener('beforeunload', function() {
            if (window.applications && Array.isArray(window.applications)) {
                saveApplications(window.applications);
            }
        });
        
        // Save periodically during use
        setInterval(function() {
            if (window.applications && Array.isArray(window.applications)) {
                saveApplications(window.applications);
            }
        }, 30000); // Save every 30 seconds
    }
    
    // Initialize storage manager
    function initializeStorageManager() {
        console.log('🚀 Initializing Persistent Storage Manager...');
        
        // Test localStorage first
        if (!testLocalStorage()) {
            console.error('❌ localStorage not available - data will not persist!');
            return;
        }
        
        // Load applications immediately
        const applications = loadApplications();
        window.applications = applications;
        
        // Set up monitoring and persistence
        setupStorageMonitoring();
        ensureDataPersistence();
        
        // Expose utility functions
        window.storageManager = {
            saveApplications,
            loadApplications,
            refreshApplicationsDisplay,
            testLocalStorage
        };
        
        console.log('✅ Persistent Storage Manager initialized successfully');
    }
    
    // Initialize when DOM is ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStorageManager);
    } else {
        initializeStorageManager();
    }
    
    console.log('🔒 Persistent Storage Manager loaded');
})();
