// Main Application Entry Point - Tempo Pomodoro Timer
import { NavigationManager } from './managers/navigation-manager.js';
import { SettingsManager } from './managers/settings-manager.js';
import { SessionManager } from './managers/session-manager.js';
import { PomodoroTimer } from './core/pomodoro-timer.js';
import { NotificationUtils } from './utils/common-utils.js';

// Global application state
let timer = null;
let navigation = null;
let settingsManager = null;
let sessionManager = null;

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

window.confirmTotalReset = function () {
  console.log("confirmTotalReset called"); // Debug log

  const confirmed = confirm(
    "⚠️ WARNING: This will permanently delete ALL your data!\n\n" +
    "This includes:\n" +
    "• All Pomodoro sessions and statistics\n" +
    "• All tasks and history\n" +
    "• All custom settings\n\n" +
    "This action CANNOT be undone!\n\n" +
    "Are you absolutely sure you want to continue?"
  );

  if (confirmed) {
    console.log("First confirmation received"); // Debug log
    const doubleConfirm = confirm(
      "🚨 FINAL WARNING 🚨\n\n" +
      "You are about to delete ALL your Pomodoro data permanently.\n\n" +
      "Type your confirmation by clicking OK to proceed, or Cancel to abort."
    );

    if (doubleConfirm) {
      console.log("Second confirmation received, calling performTotalReset"); // Debug log
      window.performTotalReset();
    }
  }
};

window.performTotalReset = async function () {
  console.log("performTotalReset started"); // Debug log

  try {
    // Show loading state
    const resetButton = document.querySelector('.btn-danger');
    const originalText = resetButton.textContent;
    resetButton.textContent = '🔄 Resetting...';
    resetButton.disabled = true;

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
      window.pomodoroTimer.resetToInitialState();
      console.log("Timer reset to initial state"); // Debug log
    }

    // Reset settings to defaults
    if (window.settingsManager) {
      window.settingsManager.resetToDefaultsForce();
      console.log("Settings reset to defaults"); // Debug log
    }

    // Reset navigation to timer view
    if (window.navigationManager) {
      window.navigationManager.switchView('timer');
      console.log("Switched to timer view"); // Debug log
    }

    // Refresh the UI to show reset state
    console.log("Refreshing UI..."); // Debug log
    location.reload();

    // Show success message (will be shown after reload)
    // alert('✅ All data has been successfully reset!\n\nThe application has been restored to its initial state.');

    // Restore button state
    resetButton.textContent = originalText;
    resetButton.disabled = false;

  } catch (error) {
    console.error('Failed to reset data:', error);
    console.error('Error stack:', error.stack);
    alert('❌ Failed to reset data. Please try again or contact support.\nError: ' + error.message);

    // Restore button state
    const resetButton = document.querySelector('.btn-danger');
    if (resetButton) {
      resetButton.textContent = '🗑️ Reset All Data';
      resetButton.disabled = false;
    }
  }
};

// Initialize the application
async function initializeApplication() {
  try {
    console.log('🚀 Initializing Tempo application...');

    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

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

    // Setup global event listeners
    setupGlobalEventListeners();

    console.log('✅ Application initialized successfully!');

    // Show welcome notification
    NotificationUtils.showNotificationPing('Welcome to Tempo! 🍅', 'success');

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
