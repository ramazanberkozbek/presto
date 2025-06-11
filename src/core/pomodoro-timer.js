// Pomodoro Timer Core Module
const { invoke } = window.__TAURI__.core;
import { NotificationUtils, TimeUtils, KeyboardUtils } from '../utils/common-utils.js';

export class PomodoroTimer {
    constructor() {
        // Timer states
        this.isRunning = false;
        this.isPaused = false;
        this.currentMode = 'focus'; // 'focus', 'break', 'longBreak'
        this.timeRemaining = 25 * 60; // 25 minutes in seconds
        this.timerInterval = null;

        // Smart pause states
        this.smartPauseEnabled = false;
        this.isAutoPaused = false;
        this.activityTimeout = null;
        this.inactivityThreshold = 30000; // 30 seconds in milliseconds (configurable)

        // Session tracking
        this.completedPomodoros = 0;
        this.currentSession = 1;
        this.totalSessions = 10;
        this.totalFocusTime = 0; // in seconds

        // Session time tracking
        this.sessionStartTime = null; // When the current session was started
        this.currentSessionElapsedTime = 0; // Actual elapsed time for current session (in seconds)
        this.lastCompletedSessionTime = 0; // Time of the last completed session for undo functionality

        // Timer durations (in seconds)
        this.durations = {
            focus: 25 * 60,        // 25 minutes
            break: 5 * 60,         // 5 minutes
            longBreak: 20 * 60     // 20 minutes
        };

        // DOM elements
        this.timerMinutes = document.getElementById('timer-minutes');
        this.timerSeconds = document.getElementById('timer-seconds');
        this.timerStatus = document.getElementById('timer-status');
        this.statusIcon = document.getElementById('status-icon');
        this.statusText = document.getElementById('status-text');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playIcon = document.getElementById('play-icon');
        this.pauseIcon = document.getElementById('pause-icon');
        this.stopBtn = document.getElementById('stop-btn');
        this.stopIcon = document.getElementById('stop-icon');
        this.undoIcon = document.getElementById('undo-icon');
        this.skipBtn = document.getElementById('skip-btn');
        this.skipCoffeeIcon = document.getElementById('skip-coffee-icon');
        this.skipSleepIcon = document.getElementById('skip-sleep-icon');
        this.skipBrainIcon = document.getElementById('skip-brain-icon');
        this.skipDefaultIcon = document.getElementById('skip-default-icon');
        this.progressDots = document.getElementById('progress-dots');

        // Task management
        this.tasks = [];
        this.currentTask = '';

        // Notification preferences
        this.autoStartBreaks = true; // Default to enabled

        // Keyboard shortcuts (will be updated from settings)
        this.customShortcuts = {
            start_stop: "CommandOrControl+Alt+Space",
            reset: "CommandOrControl+Alt+R", // Delete Session (focus) / Undo (break)
            skip: "CommandOrControl+Alt+S"   // Save Session
        };

        this.init();
    }

    async init() {
        // Verify all DOM elements are found
        if (!this.undoIcon) {
            console.error('Undo icon element not found, re-searching...');
            this.undoIcon = document.getElementById('undo-icon');
        }
        if (!this.stopIcon) {
            console.error('Stop icon element not found, re-searching...');
            this.stopIcon = document.getElementById('stop-icon');
        }

        // Generate initial progress dots
        this.generateProgressDots();
        this.updateDisplay();
        this.updateProgressDots();
        this.updateStopUndoButton(); // Initialize stop/undo button state
        this.updateSkipIcon(); // Initialize skip button icon
        this.setupEventListeners();
        await this.loadSessionData();
        await this.loadTasks();

        // Initialize task input if it exists
        this.taskInput = document.getElementById('task-input');
        this.taskList = document.getElementById('task-list');

        if (this.taskInput) {
            this.taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTask();
                }
            });
        }

        // Render loaded tasks
        this.renderTasks();

        // Initialize sidebar state to match timer
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.className = `sidebar ${this.currentMode}`;
        }
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => {
            if (this.isRunning && !this.isPaused && !this.isAutoPaused) {
                this.pauseTimer();
            } else {
                this.startTimer();
            }
        });

        this.skipBtn.addEventListener('click', () => this.skipSession());

        this.stopBtn.addEventListener('click', () => {
            if (this.currentMode === 'focus') {
                // Delete/reset the current session
                this.resetTimer();
            } else {
                // In break/longBreak mode: undo last session
                this.undoLastSession();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only trigger if not typing in an input
            if (e.target.tagName !== 'INPUT') {
                // Check custom shortcuts first
                if (this.matchesShortcut(e, this.customShortcuts.start_stop)) {
                    e.preventDefault();
                    if (this.isRunning && !this.isPaused && !this.isAutoPaused) {
                        this.pauseTimer();
                    } else {
                        this.startTimer();
                    }
                } else if (this.matchesShortcut(e, this.customShortcuts.reset)) {
                    e.preventDefault();
                    if (this.currentMode === 'focus') {
                        this.resetTimer();
                    } else {
                        this.undoLastSession();
                    }
                } else if (this.matchesShortcut(e, this.customShortcuts.skip)) {
                    e.preventDefault();
                    this.skipSession();
                }
                // Keep existing hardcoded shortcuts as fallback
                else {
                    switch (e.code) {
                        case 'Space':
                            e.preventDefault();
                            if (this.isRunning && !this.isPaused && !this.isAutoPaused) {
                                this.pauseTimer();
                            } else {
                                this.startTimer();
                            }
                            break;
                        case 'KeyH':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                this.showHistoryModal();
                            }
                            break;
                        case 'Escape':
                            this.closeHistoryModal();
                            break;
                    }
                }
            }
        });

        // Prevent accidental closure during active session
        window.addEventListener('beforeunload', (e) => {
            if (this.isRunning && this.currentMode === 'focus') {
                e.preventDefault();
                e.returnValue = 'You have an active pomodoro session. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    // Update keyboard shortcuts from settings
    updateKeyboardShortcuts(shortcuts) {
        this.customShortcuts = { ...shortcuts };
        console.log('Updated keyboard shortcuts:', this.customShortcuts);
    }

    // Helper method to parse shortcut string into components
    parseShortcut(shortcutString) {
        return KeyboardUtils.parseShortcut(shortcutString);
    }

    // Check if a keyboard event matches a shortcut
    matchesShortcut(event, shortcutString) {
        return KeyboardUtils.matchesShortcut(event, shortcutString);
    }

    // Smart Pause Methods
    setupSmartPause() {
        if (!this.smartPauseEnabled) return;

        // Setup event listeners for global activity monitoring
        this.setupGlobalActivityListeners();

        console.log('Smart pause enabled with global monitoring');
    }

    async setupGlobalActivityListeners() {
        try {
            // Start global activity monitoring with configurable timeout
            const timeoutSeconds = Math.floor(this.inactivityThreshold / 1000); // convert from milliseconds to seconds
            await invoke('start_activity_monitoring', { timeoutSeconds: timeoutSeconds });

            // Listen for activity events from backend
            const { listen } = window.__TAURI__.event;

            // Listen for user activity
            await listen('user-activity', () => {
                this.handleUserActivity();
            });

            // Listen for user inactivity
            await listen('user-inactivity', () => {
                this.autoPauseTimer();
            });

            // Start initial timeout for local fallback
            this.handleUserActivity();

            console.log('Global activity listeners setup complete');
        } catch (error) {
            console.error('Failed to setup global activity monitoring:', error);
            // Fallback to local monitoring
            this.setupLocalActivityListeners();
        }
    }

    setupLocalActivityListeners() {
        console.log('Falling back to local activity monitoring');
        // List of events that indicate user activity
        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click'];

        // Setup activity listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, () => this.handleUserActivity(), { passive: true });
        });

        // Start initial timeout
        this.handleUserActivity();
    }

    handleUserActivity() {
        if (!this.smartPauseEnabled || !this.isRunning || this.currentMode !== 'focus') return;

        // If currently auto-paused, resume the timer
        if (this.isAutoPaused) {
            this.resumeFromAutoPause();
        }

        // Clear existing timeout
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
        }

        // Set new timeout for auto-pause after configured inactivity period
        this.activityTimeout = setTimeout(() => {
            this.autoPauseTimer();
        }, this.inactivityThreshold); // Use configurable timeout
    }

    autoPauseTimer() {
        if (!this.isRunning || this.isPaused || this.isAutoPaused || this.currentMode !== 'focus') return;

        console.log('Auto-pausing timer due to inactivity');
        this.isAutoPaused = true;
        this.isPaused = true;

        // Stop the timer interval
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        // Show auto-pause notification
        NotificationUtils.showNotificationPing('Timer auto-paused due to inactivity 💤', 'warning');

        // Update UI to show auto-pause state
        this.updateDisplay();
        this.updateButtons();
        this.updateTrayIcon();
    }

    resumeFromAutoPause() {
        if (!this.isAutoPaused) return;

        console.log('Resuming timer from auto-pause');
        this.isAutoPaused = false;
        this.isPaused = false;

        // Show resume notification
        NotificationUtils.showNotificationPing('Timer resumed - you\'re back! 🎯', 'info');

        // Restart the timer interval
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;

            // Continue tracking elapsed time for focus sessions
            if (this.currentMode === 'focus') {
                this.currentSessionElapsedTime++;
            }

            this.updateDisplay();
            this.updateTrayIcon();

            if (this.timeRemaining <= 0) {
                this.completeSession();
            }
        }, 1000);

        // Update UI
        this.updateDisplay();
        this.updateButtons();
        this.updateTrayIcon();
    }

    async enableSmartPause(enabled) {
        this.smartPauseEnabled = enabled;

        if (enabled) {
            await this.setupSmartPause();
            // Start monitoring if timer is already running and in focus mode
            if (this.isRunning && !this.isPaused && this.currentMode === 'focus') {
                this.handleUserActivity();
            }
        } else {
            // Stop global monitoring
            try {
                await invoke('stop_activity_monitoring');
            } catch (error) {
                console.error('Failed to stop activity monitoring:', error);
            }

            // Clear local timeout and resume if auto-paused
            if (this.activityTimeout) {
                clearTimeout(this.activityTimeout);
                this.activityTimeout = null;
            }
            if (this.isAutoPaused) {
                this.resumeFromAutoPause();
            }
        }

        console.log('Smart pause', enabled ? 'enabled' : 'disabled');
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;

            // Track session start time if not already set
            if (!this.sessionStartTime) {
                this.sessionStartTime = Date.now();
                this.currentSessionElapsedTime = 0;
            }

            this.timerInterval = setInterval(() => {
                this.timeRemaining--;

                // Track elapsed time for focus sessions
                if (this.currentMode === 'focus') {
                    this.currentSessionElapsedTime++;
                }

                this.updateDisplay();

                // Warning when less than 2 minutes remaining
                if (this.timeRemaining === 120 && this.currentMode === 'focus') {
                    this.addWarningClass();
                    NotificationUtils.showNotificationPing('2 minutes remaining! 🔥', 'warning');
                }

                // Final warning at 30 seconds
                if (this.timeRemaining === 30) {
                    NotificationUtils.showNotificationPing('30 seconds left! ⏰', 'warning');
                }

                if (this.timeRemaining <= 0) {
                    this.completeSession();
                }
            }, 1000);

            this.updateButtons();
            this.updateDisplay();
            NotificationUtils.playNotificationSound();
            NotificationUtils.showNotificationPing('Timer started! 🍅', 'info');

            // Start smart pause monitoring if enabled
            if (this.smartPauseEnabled && this.currentMode === 'focus') {
                this.handleUserActivity();
            }
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            this.isAutoPaused = false; // Manual pause overrides auto-pause
            clearInterval(this.timerInterval);

            // Clear smart pause timeout
            if (this.activityTimeout) {
                clearTimeout(this.activityTimeout);
                this.activityTimeout = null;
            }

            this.updateButtons();
            this.updateDisplay();
            NotificationUtils.showNotificationPing('Timer paused ⏸️');
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.isAutoPaused = false;
        clearInterval(this.timerInterval);

        // Clear smart pause timeout
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
            this.activityTimeout = null;
        }

        // Reset session tracking
        this.sessionStartTime = null;
        this.currentSessionElapsedTime = 0;

        this.timeRemaining = this.durations[this.currentMode];
        this.updateDisplay();
        this.updateButtons();
        NotificationUtils.showNotificationPing('Session deleted ❌', 'warning');
    }

    skipSession() {
        this.isRunning = false;
        this.isPaused = false;
        this.isAutoPaused = false;
        clearInterval(this.timerInterval);

        // Clear smart pause timeout
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
            this.activityTimeout = null;
        }

        // Skip to next mode
        if (this.currentMode === 'focus') {
            // Skip focus session - count as completed and go to break
            this.completedPomodoros++;
            this.updateProgressDots();

            // Calculate elapsed time for skipped focus session (partial or full duration)
            const actualElapsedTime = this.currentSessionElapsedTime || (this.durations.focus - this.timeRemaining);
            this.totalFocusTime += actualElapsedTime;

            // Store the actual elapsed time for undo functionality
            this.lastCompletedSessionTime = actualElapsedTime;

            // Determine next mode
            if (this.completedPomodoros % 4 === 0) {
                this.currentMode = 'longBreak';
            } else {
                this.currentMode = 'break';
            }
        } else {
            // Skip break - go back to focus
            this.currentMode = 'focus';
            // Only increment session if we haven't reached total sessions
            if (this.completedPomodoros < this.totalSessions) {
                this.currentSession = this.completedPomodoros + 1;
            }
        }

        this.timeRemaining = this.durations[this.currentMode];
        this.updateDisplay();
        this.updateButtons();

        // Show skip notification
        const messages = {
            focus: 'Focus session skipped. Time for a break! 😌',
            break: 'Break skipped. Ready to focus? 🍅',
            longBreak: 'Long break skipped. Time to get back to work! 🚀'
        };

        NotificationUtils.showNotificationPing(messages[this.currentMode] || 'Session skipped 📤', 'info');

        // Auto-start new session if enabled
        if (this.autoStartBreaks) {
            console.log('Auto-starting new session after skip in 1.5 seconds...');
            // Add a small delay to let the user see the skip message
            setTimeout(() => {
                this.startTimer();
            }, 1500); // 1.5 second delay
        }
    }

    async completeSession() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timerInterval);

        // Check if we should auto-start next session (before resetting sessionStartTime)
        const wasSessionActive = this.sessionStartTime !== null;

        if (this.currentMode === 'focus') {
            this.completedPomodoros++;
            this.updateProgressDots();

            // Calculate actual elapsed time for focus sessions
            const actualElapsedTime = this.currentSessionElapsedTime || (this.durations.focus - this.timeRemaining);
            this.totalFocusTime += actualElapsedTime;

            // Store the actual elapsed time for undo functionality
            this.lastCompletedSessionTime = actualElapsedTime;

            // Mark current task as completed if exists
            if (this.currentTask.trim()) {
                await this.markTaskCompleted(this.currentTask.trim());
                if (this.taskInput) {
                    this.taskInput.value = '';
                }
                this.currentTask = '';
            }

            // Determine next mode
            if (this.completedPomodoros % 4 === 0) {
                this.currentMode = 'longBreak';
            } else {
                this.currentMode = 'break';
            }
        } else {
            // Break completed, back to focus
            this.currentMode = 'focus';
            if (this.completedPomodoros < this.totalSessions) {
                this.currentSession = this.completedPomodoros + 1;
            }
        }

        // Reset session tracking for next session
        this.sessionStartTime = null;
        this.currentSessionElapsedTime = 0;

        this.timeRemaining = this.durations[this.currentMode];
        this.updateDisplay();
        this.updateButtons();
        await this.saveSessionData();
        await this.updateWeeklyStats(); // Update weekly stats after session completion
        this.showNotification();
        NotificationUtils.playNotificationSound();

        // Show completion message
        const messages = {
            focus: this.currentMode === 'longBreak' ? 'Great work! Take a long break 🎉' : 'Pomodoro completed! Take a short break 😌',
            break: 'Break over! Ready to focus? 🍅',
            longBreak: 'Long break over! Time to get back to work 🚀'
        };

        NotificationUtils.showNotificationPing(messages[this.currentMode] || messages.focus, 'success');

        // Session completion doesn't auto-start - timer continues counting
        // User must manually skip to go to next session or use reset to stop
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;

        // Update the split display
        this.timerMinutes.textContent = minutes.toString().padStart(2, '0');
        this.timerSeconds.textContent = seconds.toString().padStart(2, '0');

        // Update status
        const statusTexts = {
            focus: 'Focus',
            break: 'Break',
            longBreak: 'Long Break'
        };

        let statusText = statusTexts[this.currentMode];

        // Add auto-pause indicator
        if (this.isAutoPaused) {
            statusText += ' (Auto-paused)';
        } else if (this.isPaused && !this.isRunning) {
            statusText += ' (Paused)';
        }

        // Update status text (use the span element instead of overwriting the entire div)
        const statusTextElement = document.getElementById('status-text');
        if (statusTextElement) {
            statusTextElement.textContent = statusText;
        } else {
            // Fallback to setting the entire timer status if span doesn't exist
            this.timerStatus.textContent = statusText;
        }

        // Update status icon based on current mode
        this.updateStatusIcon();

        // Update play/pause button
        if (this.isRunning && !this.isPaused && !this.isAutoPaused) {
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'block';
        } else {
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
        }

        // Update main container class for background styling
        const mainContainer = document.querySelector('.container');
        mainContainer.className = `container ${this.currentMode}`;

        // Update sidebar class to match current timer state
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.className = `sidebar ${this.currentMode}`;
        }

        // Update timer container class for styling
        const timerContainer = document.querySelector('.timer-container');
        timerContainer.className = `timer-container ${this.currentMode}`;

        // Add running class when timer is active
        if (this.isRunning) {
            timerContainer.classList.add('running');
        }

        // Add auto-paused class when in auto-pause state
        if (this.isAutoPaused) {
            timerContainer.classList.add('auto-paused');
        }

        // Add warning class when time is running low
        if (this.timeRemaining <= 120 && this.timeRemaining > 0 && this.isRunning) {
            timerContainer.classList.add('warning');
        }

        // Update page title
        const statusIcon = this.currentMode === 'focus' ? '🍅' : (this.currentMode === 'break' ? '😌' : '🎉');
        document.title = `${statusIcon} ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - Tempo`;

        // Update stop/undo button icon based on current mode
        this.updateStopUndoButton();

        // Update skip button icon based on current mode and next state
        this.updateSkipIcon();

        // Update progress dots
        this.updateProgressDots();
    }

    // Update status icon based on current mode
    updateStatusIcon() {
        if (!this.statusIcon) {
            console.error('Status icon element not found!');
            return;
        }

        // Define icon classes for different modes
        const iconClasses = {
            focus: 'ri-brain-line',
            break: 'ri-cup-fill',
            longBreak: 'ri-moon-line'
        };

        // Apply the appropriate Remix Icon class based on current mode
        const newClass = iconClasses[this.currentMode] || 'ri-brain-line';
        this.statusIcon.className = newClass;

        // Clear any fallback text content since we're using icons
        this.statusIcon.textContent = '';
    }

    updateButtons() {
        // Metodo disabilitato per la versione semplificata - i controlli sono ora gestiti in updateDisplay()
        /*
        if (this.isRunning) {
          this.startBtn.disabled = true;
          this.pauseBtn.disabled = false;
          this.startBtn.textContent = 'Running...';
        } else if (this.isPaused) {
          this.startBtn.disabled = false;
          this.pauseBtn.disabled = true;
          this.startBtn.textContent = 'Resume';
        } else {
          this.startBtn.disabled = false;
          this.pauseBtn.disabled = true;
          this.startBtn.textContent = 'Start';
        }
        */
    }

    // Update stop/undo button icon based on current mode
    updateStopUndoButton() {
        // Check if DOM elements exist
        if (!this.stopIcon || !this.undoIcon) {
            console.error('Stop or undo icon elements not found!');
            console.log('stopIcon:', this.stopIcon);
            console.log('undoIcon:', this.undoIcon);
            return;
        }

        if (this.currentMode === 'focus') {
            // Show X icon during focus sessions for deletion
            this.stopIcon.style.display = 'block';
            this.undoIcon.style.display = 'none';
        } else {
            // Show undo icon during break/longBreak sessions (only if there's a session to undo)
            if (this.completedPomodoros > 0) {
                this.stopIcon.style.display = 'none';
                this.undoIcon.style.display = 'block';
            } else {
                // No sessions to undo, show X icon
                this.stopIcon.style.display = 'block';
                this.undoIcon.style.display = 'none';
            }
        }
    }

    // Update skip button icon based on current mode and next state
    updateSkipIcon() {
        // Hide all skip icons first
        this.skipCoffeeIcon.style.display = 'none';
        this.skipSleepIcon.style.display = 'none';
        this.skipBrainIcon.style.display = 'none';
        this.skipDefaultIcon.style.display = 'none';

        if (this.currentMode === 'focus') {
            // During focus: skip will go to break/longBreak
            // Show icon representing the next break type
            if ((this.completedPomodoros + 1) % 4 === 0) {
                // Next will be long break - show sleep icon
                this.skipSleepIcon.style.display = 'block';
            } else {
                // Next will be short break - show coffee icon
                this.skipCoffeeIcon.style.display = 'block';
            }
        } else {
            // During break/longBreak: skip will go to focus
            // Show brain icon
            this.skipBrainIcon.style.display = 'block';
        }
    }

    // Undo the last completed session
    async undoLastSession() {
        if (this.completedPomodoros === 0) {
            NotificationUtils.showNotificationPing('No sessions to undo! 🤷‍♂️', 'warning');
            return;
        }

        // Decrease completed pomodoros count
        this.completedPomodoros--;

        // Subtract the actual focus time from total (use stored time or fallback to duration)
        const timeToSubtract = this.lastCompletedSessionTime || this.durations.focus;
        this.totalFocusTime = Math.max(0, this.totalFocusTime - timeToSubtract);

        // Return to focus mode
        this.currentMode = 'focus';
        this.currentSession = this.completedPomodoros + 1;

        // Reset timer to focus duration
        this.timeRemaining = this.durations.focus;
        this.isRunning = false;
        this.isPaused = false;
        this.isAutoPaused = false;
        clearInterval(this.timerInterval);

        // Reset session tracking
        this.sessionStartTime = null;
        this.currentSessionElapsedTime = 0;
        this.lastCompletedSessionTime = 0;

        // Update all displays
        this.updateDisplay();
        this.updateProgressDots();
        this.updateButtons();
        await this.saveSessionData();
        await this.updateWeeklyStats();
        this.updateTrayIcon();

        // Show undo notification
        NotificationUtils.showNotificationPing('Last session undone! Back to focus mode 🔄', 'info');
    }

    // Progress dots generation
    generateProgressDots() {
        if (!this.progressDots) return;

        // Clear existing dots
        this.progressDots.innerHTML = '';

        // Generate new dots based on totalSessions
        for (let i = 0; i < this.totalSessions; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            this.progressDots.appendChild(dot);
        }
    }

    // Progress dots update
    updateProgressDots() {
        const dots = this.progressDots.querySelectorAll('.dot');

        // Remove any existing overflow indicator
        const existingOverflow = this.progressDots.querySelector('.overflow-indicator');
        if (existingOverflow) {
            existingOverflow.remove();
        }

        // Update each dot based on completed pomodoros and current session
        dots.forEach((dot, index) => {
            // Remove all classes first
            dot.classList.remove('completed', 'current');

            if (index < this.completedPomodoros) {
                // Sessioni completate - pallino pieno
                dot.classList.add('completed');
            } else if (index === this.completedPomodoros && this.currentMode === 'focus') {
                // Sessione attualmente in corso (solo durante focus) - pallino evidenziato
                dot.classList.add('current');
            }
            // Tutte le altre rimangono vuote (solo il background di default)
        });

        // Se ci sono più sessioni completate di quelle visibili, mostra l'indicatore di overflow
        if (this.completedPomodoros > this.totalSessions) {
            const overflowCount = this.completedPomodoros - this.totalSessions;
            const overflowIndicator = document.createElement('div');
            overflowIndicator.className = 'overflow-indicator';
            overflowIndicator.textContent = `+${overflowCount}`;
            this.progressDots.appendChild(overflowIndicator);
        }
    }

    // Task Management
    async addTask() {
        if (!this.taskInput) return; // Skip if task input element doesn't exist

        const taskText = this.taskInput.value.trim();
        if (taskText) {
            const task = {
                id: Date.now(),
                text: taskText,
                completed: false,
                created_at: new Date().toISOString()
            };

            this.tasks.unshift(task);
            await this.saveTasks();
            this.renderTasks();
            this.taskInput.value = '';
        }
    }

    async markTaskCompleted(taskText) {
        const task = this.tasks.find(t => t.text === taskText && !t.completed);
        if (task) {
            task.completed = true;
            task.completed_at = new Date().toISOString();
            await this.saveTasks();
            this.renderTasks();
        }
    }

    async deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        await this.saveTasks();
        this.renderTasks();
    }

    renderTasks() {
        if (!this.taskList) return; // Skip if task list element doesn't exist

        this.taskList.innerHTML = '';

        // Show recent tasks (last 5)
        const recentTasks = this.tasks.slice(0, 5);

        recentTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;

            taskEl.innerHTML = `
        <span>${task.text}</span>
        <button class="task-delete" onclick="timer.deleteTask(${task.id})">×</button>
      `;

            this.taskList.appendChild(taskEl);
        });
    }

    // Weekly Statistics
    async updateWeeklyStats() {
        try {
            const history = await invoke('get_stats_history');
            this.renderWeeklyStats(history);
        } catch (error) {
            console.error('Failed to load history:', error);
            this.renderWeeklyStats([]);
        }
    }

    renderWeeklyStats(history) {
        const weeklyStatsContainer = document.getElementById('weekly-stats');
        if (!weeklyStatsContainer) return;

        const today = new Date();
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        weeklyStatsContainer.innerHTML = '';

        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const dayElement = document.createElement('div');
            dayElement.className = 'day-stat';

            if (i === 0) {
                dayElement.classList.add('today');
            }

            // Find data for this date
            const dayData = history.find(h => h.date === date.toDateString());
            const completed = dayData ? dayData.completed_pomodoros : 0;
            const focusTime = dayData ? dayData.total_focus_time : 0;

            if (completed > 0) {
                dayElement.classList.add('has-data');
            }

            const hours = Math.floor(focusTime / 3600);
            const minutes = Math.floor((focusTime % 3600) / 60);

            dayElement.innerHTML = `
        <div class="day-label">${weekDays[date.getDay()]}</div>
        <div class="day-count">${completed}</div>
        <div class="day-time">${hours}h ${minutes}m</div>
      `;

            weeklyStatsContainer.appendChild(dayElement);
        }
    }

    // History Modal
    async showHistoryModal() {
        try {
            const history = await invoke('get_stats_history');
            this.createHistoryModal(history);
        } catch (error) {
            console.error('Failed to load history:', error);
            NotificationUtils.showNotificationPing('Failed to load history 😞');
        }
    }

    createHistoryModal(history) {
        // Remove existing modal
        const existing = document.querySelector('.history-modal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'history-modal';

        modal.innerHTML = `
      <div class="history-content">
        <div class="history-header">
          <h3>Your Progress History</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="history-list">
          ${history.length === 0 ? '<p>No history data yet. Start your first pomodoro session!</p>' :
                history.slice().reverse().map(day => {
                    const date = new Date(day.date);
                    const hours = Math.floor(day.total_focus_time / 3600);
                    const minutes = Math.floor((day.total_focus_time % 3600) / 60);

                    return `
                <div class="history-item">
                  <div class="history-date">${date.toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</div>
                  <div class="history-stats">
                    <span>🍅 ${day.completed_pomodoros} pomodoros</span>
                    <span>⏰ ${hours}h ${minutes}m focus</span>
                  </div>
                </div>
              `;
                }).join('')
            }
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.closeHistoryModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeHistoryModal();
            }
        });

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    closeHistoryModal() {
        const modal = document.querySelector('.history-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Data Persistence
    async saveTasks() {
        try {
            await invoke('save_tasks', { tasks: this.tasks });
        } catch (error) {
            console.error('Failed to save tasks:', error);
            // Fallback to localStorage
            localStorage.setItem('pomodoro-tasks', JSON.stringify(this.tasks));
        }
    }

    async loadTasks() {
        try {
            this.tasks = await invoke('load_tasks');
            console.log('Loaded tasks from Tauri:', this.tasks.length);
        } catch (error) {
            console.error('Failed to load tasks from Tauri, using localStorage:', error);
            const saved = localStorage.getItem('pomodoro-tasks');
            this.tasks = saved ? JSON.parse(saved) : [];
        }
    }

    async saveSessionData() {
        const data = {
            completed_pomodoros: this.completedPomodoros,
            total_focus_time: this.totalFocusTime,
            current_session: this.currentSession,
            date: new Date().toDateString()
        };

        try {
            await invoke('save_session_data', { session: data });
            // Also save daily stats for history
            await invoke('save_daily_stats', { session: data });
        } catch (error) {
            console.error('Failed to save session data:', error);
            // Fallback to localStorage
            localStorage.setItem('pomodoro-session', JSON.stringify(data));
        }
    }

    async loadSessionData() {
        try {
            const data = await invoke('load_session_data');
            if (data && data.date === new Date().toDateString()) {
                this.completedPomodoros = data.completed_pomodoros || 0;
                this.totalFocusTime = data.total_focus_time || 0;
                this.currentSession = data.current_session || 1;
                this.updateProgressDots();
            }
        } catch (error) {
            console.error('Failed to load session data from Tauri, using localStorage:', error);
            const saved = localStorage.getItem('pomodoro-session');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.date === new Date().toDateString()) {
                    this.completedPomodoros = data.completedPomodoros || 0;
                    this.totalFocusTime = data.totalFocusTime || 0;
                    this.currentSession = data.currentSession || 1;
                    this.updateProgressDots();
                }
            }
        }
    }

    // Simple notification system
    async showNotification() {
        try {
            // Check if we're in a Tauri context and use Tauri notifications
            if (window.__TAURI__ && window.__TAURI__.notification) {
                const { isPermissionGranted, requestPermission, sendNotification } = window.__TAURI__.notification;

                // Check if permission is granted
                let permissionGranted = await isPermissionGranted();

                // If not granted, request permission
                if (!permissionGranted) {
                    const permission = await requestPermission();
                    permissionGranted = permission === 'granted';
                }

                // Send notification if permission is granted
                if (permissionGranted) {
                    const messages = {
                        focus: 'Break time! Take a rest 😌',
                        break: 'Break over! Time to focus 🍅',
                        longBreak: 'Long break over! Ready for more focus? 🚀'
                    };

                    await sendNotification({
                        title: 'Tempo - Pomodoro Timer',
                        body: messages[this.currentMode],
                        icon: '/assets/tauri.svg'
                    });
                }
            } else {
                // Fallback to Web Notification API
                if ('Notification' in window && Notification.permission === 'granted') {
                    const messages = {
                        focus: 'Break time! Take a rest 😌',
                        break: 'Break over! Time to focus 🍅',
                        longBreak: 'Long break over! Ready for more focus? 🚀'
                    };

                    NotificationUtils.showDesktopNotification('Tempo - Pomodoro Timer', messages[this.currentMode]);
                }
            }
        } catch (error) {
            console.error('Failed to show notification:', error);
            // Fallback to in-app notification
            this.showNotificationPing(
                this.currentMode === 'focus' ? 'Break time! Take a rest 😌' :
                    this.currentMode === 'break' ? 'Break over! Time to focus 🍅' :
                        'Long break over! Ready for more focus? 🚀'
            );
        }
    }

    // Add warning styling
    addWarningClass() {
        const container = document.querySelector('.timer-container');
        if (!container.classList.contains('warning')) {
            container.classList.add('warning');
        }
    }

    // Update tray icon with timer information
    async updateTrayIcon() {
        try {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            await invoke('update_tray_icon', {
                timerText: timerText,
                isRunning: this.isRunning,
                sessionMode: this.currentMode,
                currentSession: this.currentSession,
                totalSessions: this.totalSessions
            });
        } catch (error) {
            console.warn('Failed to update tray icon:', error);
        }
    }

    async applySettings(settings) {
        // Update timer durations
        this.durations.focus = settings.timer.focus_duration * 60;
        this.durations.break = settings.timer.break_duration * 60;
        this.durations.longBreak = settings.timer.long_break_duration * 60;
        this.totalSessions = settings.timer.total_sessions;

        // If timer is not running, update current time remaining
        if (!this.isRunning) {
            this.timeRemaining = this.durations[this.currentMode];
            this.updateDisplay();
        }

        // Regenerate progress dots when total sessions change
        this.generateProgressDots();
        this.updateProgressDots();

        // Update notification preferences
        this.enableDesktopNotifications = settings.notifications.desktop_notifications;
        this.enableSoundNotifications = settings.notifications.sound_notifications;
        this.autoStartBreaks = settings.notifications.auto_start_breaks;
        console.log('Auto-start breaks setting:', this.autoStartBreaks);

        // Update smart pause setting and timeout
        this.inactivityThreshold = (settings.notifications.smart_pause_timeout || 30) * 1000; // convert to milliseconds

        // Update keyboard shortcuts
        if (settings.shortcuts) {
            this.updateKeyboardShortcuts(settings.shortcuts);
        }

        // Update backend timeout if smart pause is enabled and monitoring is active
        if (this.smartPauseEnabled) {
            try {
                const timeoutSeconds = Math.floor(this.inactivityThreshold / 1000);
                await invoke('update_activity_timeout', { timeoutSeconds: timeoutSeconds });
            } catch (error) {
                console.log('Activity monitoring not active or failed to update timeout:', error);
            }
        }

        this.enableSmartPause(settings.notifications.smart_pause);
    }

    resetToInitialState() {
        // Stop any running timer
        this.isRunning = false;
        this.isPaused = false;
        this.isAutoPaused = false;
        clearInterval(this.timerInterval);

        // Clear smart pause timeout and disable
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
            this.activityTimeout = null;
        }
        this.smartPauseEnabled = false;
        this.inactivityThreshold = 30000; // Reset to default 30 seconds

        // Reset all counters and state
        this.completedPomodoros = 0;
        this.generateProgressDots();
        this.updateProgressDots();
        this.currentSession = 1;
        this.totalFocusTime = 0;
        this.currentMode = 'focus';

        // Reset session tracking
        this.sessionStartTime = null;
        this.currentSessionElapsedTime = 0;
        this.lastCompletedSessionTime = 0;

        // Reset durations to defaults
        this.durations = {
            focus: 25 * 60,
            break: 5 * 60,
            longBreak: 20 * 60
        };
        this.totalSessions = 10;

        // Reset timer display
        this.timeRemaining = this.durations[this.currentMode];

        // Clear task input
        this.currentTask = '';
        if (this.taskInput) {
            this.taskInput.value = '';
        }

        // Reset tasks array
        this.tasks = [];

        // Update all displays
        this.updateDisplay();
        this.updateButtons();
        this.renderTasks();
        this.updateWeeklyStats();
        this.updateTrayIcon();

        console.log('Timer reset to initial state');
    }
}
