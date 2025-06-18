// Main Application Entry Point - Presto Pomodoro Timer
import { NavigationManager } from './managers/navigation-manager.js';
import { SettingsManager } from './managers/settings-manager.js';
import { SessionManager } from './managers/session-manager.js';
import { TeamManager } from './managers/team-manager.js';
import { PomodoroTimer } from './core/pomodoro-timer.js';
import { NotificationUtils } from './utils/common-utils.js';
import { updateManager } from './managers/update-manager.js';
import { updateNotification } from './components/update-notification.js';

// Global application state
let timer = null;
let navigation = null;
let settingsManager = null;
let sessionManager = null;
let teamManager = null;

// Global functions for settings (backwards compatibility)
window.saveSettings = async function () {
  if (window.settingsManager) {
    await window.settingsManager.saveSettings();
  }
};

window.resetToDefaults = function () {
  if (window.settingsManager) {
    window.settingsManager.resetToDefaults();
  }
};

window.clearShortcut = function (shortcutType) {
  if (window.settingsManager) {
    window.settingsManager.clearShortcut(shortcutType);
  }
};

window.confirmTotalReset = async function () {
  console.log("confirmTotalReset called"); // Debug log

  try {
    // Create custom confirmation dialogs
    const confirmed = await showCustomConfirm(
      "⚠️ ATTENZIONE",
      "Questa azione eliminerà PERMANENTEMENTE tutti i tuoi dati!\n\n" +
      "Questo include:\n" +
      "• Tutte le sessioni Pomodoro e statistiche\n" +
      "• Tutti i task e la cronologia\n" +
      "• Tutte le impostazioni personalizzate\n\n" +
      "Questa azione NON PUÒ essere annullata!\n\n" +
      "Sei assolutamente sicuro di voler continuare?",
      "warning"
    );

    console.log("First confirmation result:", confirmed);

    if (confirmed) {
      const doubleConfirm = await showCustomConfirm(
        "🚨 ULTIMO AVVISO 🚨",
        "Stai per eliminare TUTTI i dati del Pomodoro in modo permanente.\n\n" +
        "Clicca CONFERMA per procedere, o ANNULLA per interrompere.",
        "error"
      );

      console.log("Second confirmation result:", doubleConfirm);

      if (doubleConfirm) {
        console.log("Both confirmations received, calling performTotalReset");
        await window.performTotalReset();
      } else {
        console.log("Second confirmation cancelled by user");
      }
    } else {
      console.log("First confirmation cancelled by user");
    }

  } catch (error) {
    console.error("Error in confirmTotalReset:", error);

    // Fallback to browser confirm
    const manualConfirm = confirm("Si è verificato un errore nei dialog. Vuoi resettare tutti i dati comunque?");
    if (manualConfirm) {
      await window.performTotalReset();
    }
  }
};

// Custom confirmation dialog function
function showCustomConfirm(title, message, type = 'warning') {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'custom-confirm-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Determine colors based on type
    const colors = {
      warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
      error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' }
    };
    const color = colors[type] || colors.warning;

    modal.innerHTML = `
      <div style="background: ${color.bg}; border: 2px solid ${color.border}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; color: ${color.text}; font-size: 20px;">${title}</h3>
        <p style="margin: 0; color: ${color.text}; line-height: 1.5; white-space: pre-line;">${message}</p>
      </div>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="confirm-btn" style="
          background: #dc3545;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">CONFERMA</button>
        <button id="cancel-btn" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">ANNULLA</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add hover effects
    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');

    confirmBtn.addEventListener('mouseover', () => confirmBtn.style.background = '#bb2d3b');
    confirmBtn.addEventListener('mouseout', () => confirmBtn.style.background = '#dc3545');
    cancelBtn.addEventListener('mouseover', () => cancelBtn.style.background = '#5c636a');
    cancelBtn.addEventListener('mouseout', () => cancelBtn.style.background = '#6c757d');

    // Handle button clicks
    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus on cancel button by default
    setTimeout(() => cancelBtn.focus(), 100);
  });
}

window.performTotalReset = async function () {
  console.log("performTotalReset started"); // Debug log

  try {
    // Check if Tauri is available
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      throw new Error("Tauri is not available - app might not be running in Tauri context");
    }

    // Show loading state
    const resetButton = document.querySelector('.btn-danger');
    const originalText = resetButton ? resetButton.textContent : '🗑️ Reset All Data';
    if (resetButton) {
      resetButton.textContent = '🔄 Resetting...';
      resetButton.disabled = true;
    }

    console.log("Calling reset_all_data..."); // Debug log

    // Call the backend to delete all data
    const { invoke } = window.__TAURI__.core;
    await invoke('reset_all_data');

    console.log("reset_all_data completed successfully"); // Debug log

    // Clear all localStorage data
    console.log("Clearing localStorage..."); // Debug log
    localStorage.removeItem('pomodoro-session');
    localStorage.removeItem('pomodoro-tasks');
    localStorage.removeItem('pomodoro-settings');
    localStorage.removeItem('pomodoro-history');
    localStorage.removeItem('pomodoro-stats');
    console.log("localStorage cleared"); // Debug log

    // Reset the timer in memory
    if (window.pomodoroTimer) {
      if (typeof window.pomodoroTimer.resetToInitialState === 'function') {
        window.pomodoroTimer.resetToInitialState();
        console.log("Timer reset to initial state"); // Debug log
      } else {
        console.warn("Timer resetToInitialState method not found");
      }
    }

    // Reset settings to defaults
    if (window.settingsManager) {
      if (typeof window.settingsManager.resetToDefaultsForce === 'function') {
        window.settingsManager.resetToDefaultsForce();
        console.log("Settings reset to defaults"); // Debug log
      } else {
        console.warn("SettingsManager resetToDefaultsForce method not found");
      }
    }

    // Reset navigation to timer view
    if (window.navigationManager) {
      if (typeof window.navigationManager.switchView === 'function') {
        window.navigationManager.switchView('timer');
        console.log("Switched to timer view"); // Debug log
      } else {
        console.warn("NavigationManager switchView method not found");
      }
    }

    // Show success message before reload
    console.log("Reset completed successfully, reloading..."); // Debug log

    // Refresh the UI to show reset state
    location.reload();

  } catch (error) {
    console.error('Failed to reset data:', error);
    console.error('Error stack:', error.stack);

    // Show detailed error information
    let errorMessage = 'Failed to reset data. ';
    if (error.message.includes('Tauri')) {
      errorMessage += 'Application context error. Please restart the app and try again.';
    } else {
      errorMessage += 'Error: ' + error.message;
    }

    alert('❌ ' + errorMessage);

    // Restore button state
    const resetButton = document.querySelector('.btn-danger');
    if (resetButton) {
      resetButton.textContent = '🗑️ Reset All Data';
      resetButton.disabled = false;
    }
  }
};

// Initialize theme early to prevent flash
async function initializeEarlyTheme() {
  try {
    // Try to load theme from saved settings first
    const savedSettings = await invoke('load_settings');
    const themeFromSettings = savedSettings?.appearance?.theme;
    const timerThemeFromSettings = savedSettings?.appearance?.timer_theme;

    if (themeFromSettings) {
      document.documentElement.setAttribute('data-theme', themeFromSettings);
      localStorage.setItem('theme-preference', themeFromSettings);
      console.log(`🎨 Early theme loaded from settings: ${themeFromSettings}`);
    }

    // Also initialize timer theme early
    if (timerThemeFromSettings) {
      document.documentElement.setAttribute('data-timer-theme', timerThemeFromSettings);
      localStorage.setItem('timer-theme-preference', timerThemeFromSettings);
      console.log(`🎨 Early timer theme loaded from settings: ${timerThemeFromSettings}`);
    } else {
      // Default to espresso theme
      document.documentElement.setAttribute('data-timer-theme', 'espresso');
      localStorage.setItem('timer-theme-preference', 'espresso');
      console.log(`🎨 Early timer theme initialized to default: espresso`);
    }

    if (themeFromSettings) {
      return;
    }
  } catch (error) {
    console.log('🎨 Could not load theme from settings, using localStorage fallback');

    // Still initialize timer theme with fallback
    const storedTimerTheme = localStorage.getItem('timer-theme-preference') || 'espresso';
    document.documentElement.setAttribute('data-timer-theme', storedTimerTheme);
    console.log(`🎨 Early timer theme initialized from localStorage: ${storedTimerTheme}`);
  }

  // Fallback to localStorage or default for main theme
  const storedTheme = localStorage.getItem('theme-preference') || 'auto';
  document.documentElement.setAttribute('data-theme', storedTheme);
  console.log(`🎨 Early theme initialized from localStorage: ${storedTheme}`);
}

// Request notification permission using Tauri v2 API
async function requestNotificationPermission() {
  try {
    if (window.__TAURI__ && window.__TAURI__.notification) {
      console.log('🔔 Requesting notification permission using Tauri v2...');
      const { isPermissionGranted, requestPermission } = window.__TAURI__.notification;

      // Check if permission is already granted
      let permissionGranted = await isPermissionGranted();

      // If not granted, request permission
      if (!permissionGranted) {
        console.log('Requesting notification permission...');
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';

        if (permissionGranted) {
          console.log('✅ Notification permission granted');
        } else {
          console.log('❌ Notification permission denied');
        }
      } else {
        console.log('✅ Notification permission already granted');
      }
    } else {
      // Fallback to Web Notification API
      console.log('🔔 Requesting notification permission using Web API...');
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log(`Notification permission: ${permission}`);
      }
    }
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    // Fallback to Web API
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }
}

// Initialize the application
async function initializeApplication() {
  try {
    console.log('🚀 Initializing Presto application...');

    // Initialize theme as early as possible
    await initializeEarlyTheme();

    // Request notification permission using Tauri v2 API
    await requestNotificationPermission();

    // Initialize settings manager first (other modules depend on it)
    console.log('📋 Initializing Settings Manager...');
    settingsManager = new SettingsManager();
    window.settingsManager = settingsManager;
    await settingsManager.init();

    // Initialize the core timer
    console.log('⏱️ Initializing Pomodoro Timer...');
    timer = new PomodoroTimer();
    window.pomodoroTimer = timer; // Make it globally accessible

    // Apply settings to timer
    if (settingsManager.settings) {
      await timer.applySettings(settingsManager.settings);
    }

    // Initialize navigation manager
    console.log('🧭 Initializing Navigation Manager...');
    navigation = new NavigationManager();
    window.navigationManager = navigation;
    await navigation.init();

    // Initialize Session Manager
    console.log('📊 Initializing Session Manager...');
    sessionManager = new SessionManager(navigation);
    window.sessionManager = sessionManager;

    // Initialize Team Manager
    console.log('👥 Initializing Team Manager...');
    teamManager = new TeamManager();
    window.teamManager = teamManager;

    // Initialize Update Manager
    console.log('🔄 Initializing Update Manager...');
    window.updateManager = updateManager;
    updateManager.loadPreferences(); // Carica le preferenze salvate

    // Setup global event listeners
    setupGlobalEventListeners();

    // Setup update management
    setupUpdateManagement();

    console.log('✅ Application initialized successfully!');

    // Show welcome notification
    NotificationUtils.showNotificationPing('Welcome to Presto! 🍅', null, 'focus');

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    NotificationUtils.showNotificationPing('Failed to initialize app. Please refresh! 🔄', 'error');
  }
}

// Setup global event listeners
function setupGlobalEventListeners() {
  // Setup reset button event listener
  const resetButton = document.getElementById('reset-all-data-btn');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      console.log("Reset button clicked via event listener"); // Debug log
      window.confirmTotalReset();
    });
    console.log("Reset button event listener added"); // Debug log
  } else {
    console.error("Reset button not found in DOM"); // Debug log
  }

  // Setup other settings buttons event listeners
  const resetToDefaultsBtn = document.querySelector('.btn-secondary');
  if (resetToDefaultsBtn && resetToDefaultsBtn.textContent.includes('Reset to Defaults')) {
    resetToDefaultsBtn.addEventListener('click', () => {
      console.log("Reset to defaults button clicked via event listener");
      window.resetToDefaults();
    });
    // Remove onclick attribute
    resetToDefaultsBtn.removeAttribute('onclick');
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape key to close modals
    if (e.code === 'Escape') {
      // Close any open modals
      const modal = document.querySelector('.modal-overlay');
      if (modal) {
        modal.click(); // Trigger close
      }
    }
  });

  // Handle visibility change for smart pause
  document.addEventListener('visibilitychange', () => {
    if (timer && timer.smartPauseEnabled) {
      if (document.hidden) {
        // Page is hidden, user might be inactive
        console.log('Page hidden - potential inactivity');
      } else {
        // Page is visible again, user is active
        timer.handleUserActivity && timer.handleUserActivity();
      }
    }
  });
}

// Setup update management
function setupUpdateManagement() {
  console.log('🔄 Setting up update management...');

  // Update status elements
  const updateStatus = document.getElementById('update-status');
  const currentVersionElement = document.getElementById('current-version');
  const currentVersionDisplay = document.getElementById('current-version-display');
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  const autoCheckUpdates = document.getElementById('auto-check-updates');
  const viewChangelogBtn = document.getElementById('view-changelog-btn');
  const viewReleasesLink = document.getElementById('view-releases-link');
  const updateSourceUrl = document.getElementById('update-source-url');

  // Progress elements
  const updateProgress = document.getElementById('update-progress');
  const progressTitle = document.getElementById('progress-title');
  const progressDescription = document.getElementById('progress-description');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  // Update info elements
  const updateInfo = document.getElementById('update-info');
  const latestVersionDisplay = document.getElementById('latest-version-display');
  const downloadUpdateBtn = document.getElementById('download-update-btn');
  const skipUpdateBtn = document.getElementById('skip-update-btn');

  // Set current version - get it from update manager
  async function setCurrentVersion() {
    try {
      const currentVersion = await updateManager.getCurrentVersion();
      if (currentVersionElement) {
        currentVersionElement.textContent = currentVersion;
      }
      if (currentVersionDisplay) {
        currentVersionDisplay.textContent = currentVersion;
      }
      console.log('📋 Versione corrente impostata:', currentVersion);
    } catch (error) {
      console.error('❌ Errore nel recupero versione corrente:', error);
      // Fallback ai valori di default
      if (currentVersionElement) {
        currentVersionElement.textContent = '0.1.0';
      }
      if (currentVersionDisplay) {
        currentVersionDisplay.textContent = '0.1.0';
      }
    }
  }

  // Imposta la versione corrente
  setCurrentVersion();

  // Setup repository link
  if (viewReleasesLink) {
    viewReleasesLink.href = 'https://github.com/murdercode/presto/releases';
    viewReleasesLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.__TAURI__?.shell) {
        window.__TAURI__.shell.open('https://github.com/murdercode/presto/releases');
      }
    });
  }

  // Setup source URL
  if (updateSourceUrl) {
    updateSourceUrl.textContent = 'GitHub Releases API';
  }

  // Check for updates button
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
      checkUpdatesBtn.disabled = true;
      showUpdateProgress('Checking for updates...', 'Please wait while we check for the latest version.');

      try {
        const hasUpdate = await updateManager.checkForUpdates(false);
        hideUpdateProgress();

        if (hasUpdate) {
          showUpdateInfo(updateManager.currentUpdate);
          updateStatus.innerHTML = '<span class="status-text update-available">Update available!</span>';
        } else {
          updateStatus.innerHTML = '<span class="status-text up-to-date">You\'re up to date!</span>';
        }
      } catch (error) {
        hideUpdateProgress();
        updateStatus.innerHTML = '<span class="status-text error">Check failed</span>';
        console.error('Update check failed:', error);
      } finally {
        checkUpdatesBtn.disabled = false;
      }
    });
  }

  // Auto-check updates checkbox
  if (autoCheckUpdates) {
    autoCheckUpdates.checked = updateManager.autoCheck;
    autoCheckUpdates.addEventListener('change', (e) => {
      updateManager.setAutoCheck(e.target.checked);
    });
  }

  // View changelog button
  if (viewChangelogBtn) {
    viewChangelogBtn.addEventListener('click', () => {
      if (window.__TAURI__?.shell) {
        window.__TAURI__.shell.open('https://github.com/murdercode/presto/releases');
      }
    });
  }

  // Download update button
  if (downloadUpdateBtn) {
    downloadUpdateBtn.addEventListener('click', async () => {
      downloadUpdateBtn.disabled = true;
      hideUpdateInfo();
      showUpdateProgress('Downloading update...', 'Please wait while the update is downloaded and installed.');

      await updateManager.downloadAndInstall();
    });
  }

  // Skip update button
  if (skipUpdateBtn) {
    skipUpdateBtn.addEventListener('click', () => {
      hideUpdateInfo();
      updateStatus.innerHTML = '<span class="status-text">Update skipped</span>';
    });
  }

  // Update manager event handlers
  updateManager.on('checkStarted', () => {
    if (updateStatus) {
      updateStatus.innerHTML = '<span class="status-text checking">Checking for updates...</span>';
    }
  });

  updateManager.on('updateAvailable', (event) => {
    const update = event.detail;
    if (updateStatus) {
      updateStatus.innerHTML = '<span class="status-text update-available">Update available!</span>';
    }
    showUpdateInfo(update);
  });

  updateManager.on('updateNotAvailable', () => {
    if (updateStatus) {
      updateStatus.innerHTML = '<span class="status-text up-to-date">You\'re up to date!</span>';
    }
  });

  updateManager.on('checkError', () => {
    if (updateStatus) {
      updateStatus.innerHTML = '<span class="status-text error">Check failed</span>';
    }
  });

  updateManager.on('downloadProgress', (event) => {
    const { progress } = event.detail;
    updateProgressBar(progress);
  });

  updateManager.on('downloadFinished', () => {
    showUpdateProgress('Installing...', 'The update will be applied when the app restarts.');
    updateProgressBar(100);
  });

  // Helper functions
  function showUpdateProgress(title, description) {
    if (updateProgress) {
      updateProgress.style.display = 'block';
    }
    if (progressTitle) {
      progressTitle.textContent = title;
    }
    if (progressDescription) {
      progressDescription.textContent = description;
    }
    updateProgressBar(0);
  }

  function hideUpdateProgress() {
    if (updateProgress) {
      updateProgress.style.display = 'none';
    }
  }

  function updateProgressBar(progress) {
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${progress}%`;
    }
  }

  function showUpdateInfo(update) {
    if (updateInfo && latestVersionDisplay) {
      latestVersionDisplay.textContent = update.version;
      updateInfo.style.display = 'block';
    }
  }

  function hideUpdateInfo() {
    if (updateInfo) {
      updateInfo.style.display = 'none';
    }
  }

  // Initial status
  if (updateStatus) {
    updateStatus.innerHTML = '<span class="status-text">Ready to check for updates</span>';
  }

  console.log('✅ Update management setup complete');
}

// Application lifecycle management
window.addEventListener('beforeunload', () => {
  console.log('🔄 Application shutting down...');

  // Save any pending data
  if (timer) {
    timer.saveSessionData && timer.saveSessionData();
  }

  if (settingsManager) {
    settingsManager.saveSettings && settingsManager.saveSettings();
  }
});

// Handle errors gracefully
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  NotificationUtils.showNotificationPing('An error occurred. Check console for details.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  NotificationUtils.showNotificationPing('An error occurred. Check console for details.', 'error');
});

// Initialize when DOM is ready
window.addEventListener("DOMContentLoaded", initializeApplication);

// Export for debugging
window.app = {
  timer: () => timer,
  navigation: () => navigation,
  settingsManager: () => settingsManager,
  sessionManager: () => sessionManager,
  reinitialize: initializeApplication
};
