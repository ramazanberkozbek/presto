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

// Initialize the application
async function initializeApplication() {
  try {
    console.log('🚀 Initializing Tempo application...');

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
