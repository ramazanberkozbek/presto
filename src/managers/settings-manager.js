// Settings Manager for Global Shortcuts and Preferences
const { invoke } = window.__TAURI__.core;
import { NotificationUtils, KeyboardUtils, StorageUtils } from '../utils/common-utils.js';

export class SettingsManager {
    constructor() {
        this.settings = null;
        this.isRecordingShortcut = false;
        this.currentRecordingField = null;
        this.recordedKeys = [];
        this.autoSaveTimeout = null;
        this.autoSaveDelay = 1000; // 1 second delay for auto-save
    }

    async init() {
        // Clean up any existing auto-save feedback elements
        this.cleanupOldNotificationElements();

        await this.loadSettings();
        this.setupEventListeners();
        await this.registerGlobalShortcuts();
        this.setupGlobalShortcutHandlers();
        this.setupSettingsNavigation();
    }

    cleanupOldNotificationElements() {
        // Remove any old auto-save feedback elements that might exist
        const oldFeedback = document.getElementById('auto-save-feedback');
        if (oldFeedback) {
            oldFeedback.remove();
        }
    }

    async loadSettings() {
        try {
            const loadedSettings = await invoke('load_settings');
            console.log('📋 Raw loaded settings:', loadedSettings);
            // Merge loaded settings with defaults to ensure all fields exist
            this.settings = this.mergeWithDefaults(loadedSettings);
            console.log('📋 Final merged settings:', this.settings);
            this.populateSettingsUI();
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    // Merge loaded settings with defaults to ensure all required fields exist
    mergeWithDefaults(loadedSettings) {
        const defaultSettings = this.getDefaultSettings();

        return {
            shortcuts: { ...defaultSettings.shortcuts, ...loadedSettings.shortcuts },
            timer: { ...defaultSettings.timer, ...loadedSettings.timer },
            notifications: { ...defaultSettings.notifications, ...loadedSettings.notifications },
            advanced: { ...defaultSettings.advanced, ...loadedSettings.advanced },
            autostart: loadedSettings.autostart !== undefined ? loadedSettings.autostart : defaultSettings.autostart
        };
    }

    getDefaultSettings() {
        return {
            shortcuts: {
                start_stop: "CommandOrControl+Alt+Space",
                reset: "CommandOrControl+Alt+R", // Delete Session (focus) / Undo (break)
                skip: "CommandOrControl+Alt+S"   // Save Session
            },
            timer: {
                focus_duration: 25,
                break_duration: 5,
                long_break_duration: 20,
                total_sessions: 10,
                weekly_goal_minutes: 125
            },
            notifications: {
                desktop_notifications: true,
                sound_notifications: true,
                auto_start_timer: true, // Renamed from auto_start_breaks
                allow_continuous_sessions: false, // Allow sessions to continue beyond timer
                smart_pause: false,
                smart_pause_timeout: 30 // default 30 seconds
            },
            advanced: {
                debug_mode: false // Debug mode with 3-second timers
            },
            autostart: false // default to disabled
        };
    }

    populateSettingsUI() {
        // Populate shortcuts
        document.getElementById('start-stop-shortcut').value = this.settings.shortcuts.start_stop || '';
        document.getElementById('reset-shortcut').value = this.settings.shortcuts.reset || '';
        document.getElementById('skip-shortcut').value = this.settings.shortcuts.skip || '';

        // Populate timer settings
        document.getElementById('focus-duration').value = this.settings.timer.focus_duration;
        document.getElementById('break-duration').value = this.settings.timer.break_duration;
        document.getElementById('long-break-duration').value = this.settings.timer.long_break_duration;
        document.getElementById('total-sessions').value = this.settings.timer.total_sessions;

        // Populate weekly goal
        const weeklyGoalField = document.getElementById('weekly-goal-minutes');
        if (weeklyGoalField) {
            weeklyGoalField.value = this.settings.timer.weekly_goal_minutes || 125;
        }

        // Populate notification settings
        // Check current notification permission and adjust desktop notifications setting
        const hasNotificationPermission = NotificationUtils.getNotificationPermission() === 'granted';
        const desktopNotificationsEnabled = this.settings.notifications.desktop_notifications && hasNotificationPermission;

        document.getElementById('desktop-notifications').checked = desktopNotificationsEnabled;
        document.getElementById('sound-notifications').checked = this.settings.notifications.sound_notifications;
        document.getElementById('auto-start-timer').checked = this.settings.notifications.auto_start_timer;

        // Debug log for continuous sessions
        console.log('🔧 PopulateUI - Raw continuous sessions value:', this.settings.notifications.allow_continuous_sessions);
        const continuousValue = this.settings.notifications.allow_continuous_sessions || false;
        console.log('🔧 PopulateUI - Final continuous sessions value:', continuousValue);

        document.getElementById('allow-continuous-sessions').checked = continuousValue;
        document.getElementById('smart-pause').checked = this.settings.notifications.smart_pause;

        // Populate smart pause timeout
        const timeoutValue = this.settings.notifications.smart_pause_timeout || 30;
        document.getElementById('smart-pause-timeout').value = timeoutValue;
        document.getElementById('timeout-value').textContent = timeoutValue;

        // Show/hide timeout setting based on smart pause checkbox
        this.toggleTimeoutSetting(this.settings.notifications.smart_pause);

        // Setup slider event listener
        this.setupSliderEventListener();

        // Populate advanced settings
        const debugModeCheckbox = document.getElementById('debug-mode');
        if (debugModeCheckbox) {
            debugModeCheckbox.checked = this.settings.advanced?.debug_mode || false;
        }

        // Populate autostart setting and check current system status
        this.loadAutostartSetting();
    }

    setupEventListeners() {
        // Shortcut input listeners
        const shortcutInputs = document.querySelectorAll('.shortcut-input');
        shortcutInputs.forEach(input => {
            input.addEventListener('click', (e) => this.startRecordingShortcut(e.target));
            input.addEventListener('keydown', (e) => this.handleShortcutKeydown(e));
            input.addEventListener('blur', () => this.stopRecordingShortcut());
        });

        // Global shortcut listeners
        window.addEventListener('keydown', (e) => {
            if (this.isRecordingShortcut) {
                this.handleShortcutKeydown(e);
            }
        });

        // Smart pause checkbox event listener
        const smartPauseCheckbox = document.getElementById('smart-pause');
        if (smartPauseCheckbox) {
            smartPauseCheckbox.addEventListener('change', (e) => {
                this.toggleTimeoutSetting(e.target.checked);
                
                // Call the timer's enableSmartPause method directly to ensure consistency
                if (window.pomodoroTimer) {
                    // Use enableSmartPause instead of toggleSmartPause to avoid toggling twice
                    window.pomodoroTimer.enableSmartPause(e.target.checked).then(() => {
                        // Update the indicator to reflect the new state
                        window.pomodoroTimer.updateSettingIndicators();
                        // Schedule auto-save after the smart pause state is updated
                        this.scheduleAutoSave();
                    });
                } else {
                    // If timer is not available, just save the setting
                    this.scheduleAutoSave();
                }
            });
        }

        // Continuous sessions checkbox event listener
        const continuousSessionsCheckbox = document.getElementById('allow-continuous-sessions');
        if (continuousSessionsCheckbox) {
            continuousSessionsCheckbox.addEventListener('change', (e) => {
                // Call the timer's enableContinuousSessions method directly to ensure consistency
                if (window.pomodoroTimer) {
                    // Use enableContinuousSessions instead of toggleContinuousSessions to avoid toggling twice
                    window.pomodoroTimer.enableContinuousSessions(e.target.checked).then(() => {
                        // Update the indicator to reflect the new state
                        window.pomodoroTimer.updateSettingIndicators();
                        // Schedule auto-save after the continuous sessions state is updated
                        this.scheduleAutoSave();
                    });
                } else {
                    // If timer is not available, just save the setting
                    this.scheduleAutoSave();
                }
            });
        }

        // Auto-start timer checkbox event listener
        const autoStartCheckbox = document.getElementById('auto-start-timer');
        if (autoStartCheckbox) {
            autoStartCheckbox.addEventListener('change', (e) => {
                // Call the timer's enableAutoStart method directly to ensure consistency
                if (window.pomodoroTimer) {
                    // Use enableAutoStart instead of toggleAutoStart to avoid toggling twice
                    window.pomodoroTimer.enableAutoStart(e.target.checked).then(() => {
                        // Update the indicator to reflect the new state
                        window.pomodoroTimer.updateSettingIndicators();
                        // Schedule auto-save after the auto-start state is updated
                        this.scheduleAutoSave();
                    });
                } else {
                    // If timer is not available, just save the setting
                    this.scheduleAutoSave();
                }
            });
        }

        // Setup auto-save listeners for all settings fields
        this.setupAutoSaveListeners();
    }

    toggleTimeoutSetting(enabled) {
        const timeoutSetting = document.getElementById('smart-pause-timeout-setting');
        if (timeoutSetting) {
            if (enabled) {
                timeoutSetting.classList.add('visible');
            } else {
                timeoutSetting.classList.remove('visible');
            }
        }
    }

    setupGlobalShortcutHandlers() {
        // Debounce mechanism to prevent repeated triggering
        let lastShortcutTime = {};
        const debounceDelay = 500; // 500ms debounce

        // Listen for global shortcut events from Rust
        window.__TAURI__.event.listen('global-shortcut', (event) => {
            const action = event.payload;
            const now = Date.now();

            // Check if this action was triggered too recently
            if (lastShortcutTime[action] && (now - lastShortcutTime[action]) < debounceDelay) {
                console.log(`Debounced global shortcut: ${action}`);
                return;
            }

            lastShortcutTime[action] = now;
            console.log(`Global shortcut triggered: ${action}`);

            switch (action) {
                case 'start-stop':
                    if (window.pomodoroTimer) {
                        if (window.pomodoroTimer.isRunning && !window.pomodoroTimer.isPaused && !window.pomodoroTimer.isAutoPaused) {
                            window.pomodoroTimer.pauseTimer();
                        } else {
                            window.pomodoroTimer.startTimer();
                        }
                    }
                    break;
                case 'reset':
                    if (window.pomodoroTimer) {
                        if (window.pomodoroTimer.currentMode === 'focus') {
                            window.pomodoroTimer.resetTimer();
                        } else {
                            window.pomodoroTimer.undoLastSession();
                        }
                    }
                    break;
                case 'skip':
                    if (window.pomodoroTimer) {
                        window.pomodoroTimer.skipSession();
                    }
                    break;
            }
        });

        // Listen for shortcuts update events
        window.__TAURI__.event.listen('shortcuts-updated', (event) => {
            console.log('Shortcuts updated:', event.payload);
            this.settings.shortcuts = event.payload;

            // Update the timer's keyboard shortcuts
            if (window.pomodoroTimer) {
                window.pomodoroTimer.updateKeyboardShortcuts(this.settings.shortcuts);
            }
        });
    }

    startRecordingShortcut(input) {
        if (this.isRecordingShortcut) return;

        this.isRecordingShortcut = true;
        this.currentRecordingField = input;
        this.recordedKeys = [];

        input.classList.add('recording');
        input.value = 'Press keys...';
        input.focus();
    }

    stopRecordingShortcut() {
        if (!this.isRecordingShortcut) return;

        this.isRecordingShortcut = false;

        if (this.currentRecordingField) {
            this.currentRecordingField.classList.remove('recording');

            if (this.recordedKeys.length > 0) {
                const shortcut = this.formatShortcut(this.recordedKeys);
                this.currentRecordingField.value = shortcut;
            } else {
                this.currentRecordingField.value = '';
            }
        }

        this.currentRecordingField = null;
        this.recordedKeys = [];
    }

    handleShortcutKeydown(e) {
        if (!this.isRecordingShortcut) return;

        e.preventDefault();
        e.stopPropagation();

        const key = e.key;
        const modifiers = [];

        if (e.metaKey || e.ctrlKey) modifiers.push('CommandOrControl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Don't record modifier keys alone
        if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) return;

        this.recordedKeys = [...modifiers, key];

        if (this.currentRecordingField) {
            this.currentRecordingField.value = this.formatShortcut(this.recordedKeys);
        }

        // Auto-finish recording after a short delay
        setTimeout(() => {
            this.stopRecordingShortcut();
            // Schedule auto-save after shortcut is set
            this.scheduleAutoSave();
        }, 500);
    }

    formatShortcut(keys) {
        return keys.join('+');
    }

    async saveSettings() {
        try {
            // Get values from UI
            this.settings.shortcuts.start_stop = document.getElementById('start-stop-shortcut').value || null;
            this.settings.shortcuts.reset = document.getElementById('reset-shortcut').value || null;
            this.settings.shortcuts.skip = document.getElementById('skip-shortcut').value || null;

            this.settings.timer.focus_duration = parseInt(document.getElementById('focus-duration').value);
            this.settings.timer.break_duration = parseInt(document.getElementById('break-duration').value);
            this.settings.timer.long_break_duration = parseInt(document.getElementById('long-break-duration').value);
            this.settings.timer.total_sessions = parseInt(document.getElementById('total-sessions').value);

            this.settings.notifications.desktop_notifications = document.getElementById('desktop-notifications').checked;
            this.settings.notifications.sound_notifications = document.getElementById('sound-notifications').checked;
            this.settings.notifications.auto_start_timer = document.getElementById('auto-start-timer').checked;
            this.settings.notifications.allow_continuous_sessions = document.getElementById('allow-continuous-sessions').checked;
            this.settings.notifications.smart_pause = document.getElementById('smart-pause').checked;
            this.settings.notifications.smart_pause_timeout = parseInt(document.getElementById('smart-pause-timeout').value);

            // Advanced settings
            const debugModeCheckbox = document.getElementById('debug-mode');
            if (debugModeCheckbox) {
                if (!this.settings.advanced) {
                    this.settings.advanced = {};
                }
                this.settings.advanced.debug_mode = debugModeCheckbox.checked;
            }

            // Save to file
            await invoke('save_settings', { settings: this.settings });

            // Re-register global shortcuts
            await this.registerGlobalShortcuts();

            // Update timer with new settings
            if (window.pomodoroTimer) {
                await window.pomodoroTimer.applySettings(this.settings);

                // If smart pause is active and countdown is running, restart it with new timeout
                if (window.pomodoroTimer.smartPauseEnabled &&
                    window.pomodoroTimer.smartPauseCountdownInterval &&
                    window.pomodoroTimer.currentMode === 'focus' &&
                    window.pomodoroTimer.isRunning) {
                    window.pomodoroTimer.handleUserActivity();
                }
            }

            NotificationUtils.showNotificationPing('✓ Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            NotificationUtils.showNotificationPing('❌ Failed to save settings', 'error');
        }
    }

    async registerGlobalShortcuts() {
        try {
            await invoke('register_global_shortcuts', { shortcuts: this.settings.shortcuts });
        } catch (error) {
            console.error('Failed to register global shortcuts:', error);
        }
    }

    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.settings = this.getDefaultSettings();
            this.populateSettingsUI();
            this.saveSettings();
        }
    }

    // Complete reset for total data reset
    resetToDefaultsForce() {
        this.settings = this.getDefaultSettings();
        this.populateSettingsUI();
        // Don't save here since we're doing a complete reset
    }

    clearShortcut(shortcutType) {
        const inputId = shortcutType + '-shortcut';
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
            // Schedule auto-save after clearing shortcut
            this.scheduleAutoSave();
        }
    }

    setupSliderEventListener() {
        const slider = document.getElementById('smart-pause-timeout');
        const valueDisplay = document.getElementById('timeout-value');

        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
                this.scheduleAutoSave();
            });
        }
    }

    setupAutoSaveListeners() {
        // Timer settings
        const timerFields = [
            'focus-duration',
            'break-duration',
            'long-break-duration',
            'total-sessions',
            'weekly-goal-minutes'
        ];

        timerFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => this.scheduleAutoSave());
                field.addEventListener('input', () => this.scheduleAutoSave());
            }
        });

        // Handle desktop notifications checkbox separately (requires permission request)
        const desktopNotificationsCheckbox = document.getElementById('desktop-notifications');
        if (desktopNotificationsCheckbox) {
            desktopNotificationsCheckbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    try {
                        // Request notification permission when enabling
                        const permission = await NotificationUtils.requestNotificationPermission();
                        if (permission !== 'granted') {
                            // Show warning but don't prevent saving the setting
                            const message = permission === 'unsupported'
                                ? 'Desktop notifications are not supported in this browser.'
                                : 'Notification permission denied. Settings saved, but notifications won\'t work until permission is granted.';
                            NotificationUtils.showNotificationPing(message, 'warning');
                            // Don't uncheck the box - let the user's choice be saved
                        }
                    } catch (error) {
                        console.warn('Failed to request notification permission, but allowing setting to be saved:', error);
                        // Don't prevent the setting from being saved even if permission request fails
                        // This allows the setting to work when Tauri notifications are properly configured
                        NotificationUtils.showNotificationPing('Settings saved. Notifications will work when properly configured.', 'info');
                    }
                }
                // Always save the setting regardless of permission status
                this.scheduleAutoSave();
            });
        }

        // Other notification checkboxes
        const checkboxFields = [
            'sound-notifications',
            'debug-mode'
        ];

        checkboxFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Skip desktop-notifications as it has special handling above
                if (fieldId !== 'desktop-notifications') {
                    field.addEventListener('change', () => this.scheduleAutoSave());
                }
            }
        });

        // Smart pause timeout slider is already handled in setupSliderEventListener
    }

    scheduleAutoSave() {
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Schedule new auto-save
        this.autoSaveTimeout = setTimeout(() => {
            this.autoSaveSettings();
        }, this.autoSaveDelay);
    }

    async autoSaveSettings() {
        try {
            // Get values from UI (same logic as saveSettings but without the alert)
            this.settings.shortcuts.start_stop = document.getElementById('start-stop-shortcut').value || null;
            this.settings.shortcuts.reset = document.getElementById('reset-shortcut').value || null;
            this.settings.shortcuts.skip = document.getElementById('skip-shortcut').value || null;

            this.settings.timer.focus_duration = parseInt(document.getElementById('focus-duration').value);
            this.settings.timer.break_duration = parseInt(document.getElementById('break-duration').value);
            this.settings.timer.long_break_duration = parseInt(document.getElementById('long-break-duration').value);
            this.settings.timer.total_sessions = parseInt(document.getElementById('total-sessions').value);

            // Weekly goal setting
            const weeklyGoalField = document.getElementById('weekly-goal-minutes');
            if (weeklyGoalField) {
                this.settings.timer.weekly_goal_minutes = parseInt(weeklyGoalField.value) || 125;
            }

            this.settings.notifications.desktop_notifications = document.getElementById('desktop-notifications').checked;
            this.settings.notifications.sound_notifications = document.getElementById('sound-notifications').checked;
            this.settings.notifications.auto_start_timer = document.getElementById('auto-start-timer').checked;
            this.settings.notifications.allow_continuous_sessions = document.getElementById('allow-continuous-sessions').checked;
            this.settings.notifications.smart_pause = document.getElementById('smart-pause').checked;
            this.settings.notifications.smart_pause_timeout = parseInt(document.getElementById('smart-pause-timeout').value);

            // Advanced settings
            const debugModeCheckbox = document.getElementById('debug-mode');
            if (debugModeCheckbox) {
                if (!this.settings.advanced) {
                    this.settings.advanced = {};
                }
                this.settings.advanced.debug_mode = debugModeCheckbox.checked;
            }

            // Debug logging for continuous sessions
            console.log('🔧 AutoSave - Reading checkbox values:');
            console.log('auto_start_timer checkbox:', document.getElementById('auto-start-timer').checked);
            console.log('allow_continuous_sessions checkbox:', document.getElementById('allow-continuous-sessions').checked);
            console.log('smart_pause checkbox:', document.getElementById('smart-pause').checked);

            // Debug log the full settings object being saved
            console.log('🔧 AutoSave - Full settings object being saved:', this.settings);

            // Save to file
            await invoke('save_settings', { settings: this.settings });

            // Re-register global shortcuts
            await this.registerGlobalShortcuts();

            // Update timer with new settings
            if (window.pomodoroTimer) {
                await window.pomodoroTimer.applySettings(this.settings);

                // If smart pause is active and countdown is running, restart it with new timeout
                if (window.pomodoroTimer.smartPauseEnabled &&
                    window.pomodoroTimer.smartPauseCountdownInterval &&
                    window.pomodoroTimer.currentMode === 'focus' &&
                    window.pomodoroTimer.isRunning) {
                    window.pomodoroTimer.handleUserActivity();
                }
            }

            // Show a subtle feedback that settings were saved
            this.showAutoSaveFeedback();

        } catch (error) {
            console.error('Failed to auto-save settings:', error);
            // Don't show an alert for auto-save failures, just log the error
        }
    }

    showAutoSaveFeedback() {
        // Use the unified notification system instead of custom feedback
        NotificationUtils.showNotificationPing('✓ Settings saved', 'success');
    }

    setupSettingsNavigation() {
        // Setup navigation between settings categories
        const navItems = document.querySelectorAll('.settings-nav-item');
        const categories = document.querySelectorAll('.settings-category');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetCategory = item.dataset.category;

                // Remove active class from all nav items and categories
                navItems.forEach(nav => nav.classList.remove('active'));
                categories.forEach(cat => cat.classList.remove('active'));

                // Add active class to clicked nav item and corresponding category
                item.classList.add('active');
                const targetElement = document.getElementById(`category-${targetCategory}`);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });
    }

    async loadAutostartSetting() {
        try {
            // Check if autostart is enabled in the system
            const isEnabled = await invoke('is_autostart_enabled');

            // Update the setting and UI
            this.settings.autostart = isEnabled;
            const checkbox = document.getElementById('autostart-enabled');
            if (checkbox) {
                checkbox.checked = isEnabled;

                // Setup event listener for the autostart checkbox
                checkbox.addEventListener('change', async (e) => {
                    await this.toggleAutostart(e.target.checked);
                });
            }
        } catch (error) {
            console.error('Failed to check autostart status:', error);
            // Default to false if we can't check the status
            const checkbox = document.getElementById('autostart-enabled');
            if (checkbox) {
                checkbox.checked = false;
                checkbox.addEventListener('change', async (e) => {
                    await this.toggleAutostart(e.target.checked);
                });
            }
        }
    }

    async toggleAutostart(enabled) {
        try {
            if (enabled) {
                await invoke('enable_autostart');
                console.log('Autostart enabled');
                NotificationUtils.showNotificationPing('✓ Autostart enabled - Tempo will start with your system', 'success');
            } else {
                await invoke('disable_autostart');
                console.log('Autostart disabled');
                NotificationUtils.showNotificationPing('✓ Autostart disabled', 'success');
            }

            // Update our settings
            this.settings.autostart = enabled;

            // Schedule auto-save to persist the setting
            this.scheduleAutoSave();

        } catch (error) {
            console.error('Failed to toggle autostart:', error);
            NotificationUtils.showNotificationPing('❌ Failed to toggle autostart: ' + error, 'error');

            // Revert the checkbox state on error
            const checkbox = document.getElementById('autostart-enabled');
            if (checkbox) {
                checkbox.checked = !enabled;
            }
        }
    }
}
