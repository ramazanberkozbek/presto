// Pomodoro Timer Application
const { invoke } = window.__TAURI__.core;

// Navigation Manager for Sidebar
class NavigationManager {
  constructor() {
    this.currentView = 'timer';
    this.init();
  }

  init() {
    // Navigation buttons
    const navButtons = document.querySelectorAll('.sidebar-icon');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // Initialize calendar
    this.initCalendar();
  }

  switchView(view) {
    // Update active button
    document.querySelectorAll('.sidebar-icon').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Hide all views
    document.querySelectorAll('.view-container').forEach(container => {
      container.classList.add('hidden');
    });

    // Show selected view
    document.getElementById(`${view}-view`).classList.remove('hidden');
    this.currentView = view;

    // Initialize view-specific content
    if (view === 'calendar') {
      this.updateCalendar();
      this.updateDailyDetails();
      this.updateWeeklyChart();
    } else if (view === 'settings') {
      // Settings view will be handled by SettingsManager
      if (window.settingsManager) {
        window.settingsManager.populateSettingsUI();
      }
    }
  }

  initCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    this.currentDate = new Date();
    this.displayMonth = new Date(this.currentDate);

    prevBtn.addEventListener('click', () => {
      this.displayMonth.setMonth(this.displayMonth.getMonth() - 1);
      this.updateCalendar();
    });

    nextBtn.addEventListener('click', () => {
      this.displayMonth.setMonth(this.displayMonth.getMonth() + 1);
      this.updateCalendar();
    });

    this.updateCalendar();
  }

  updateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');

    // Update month display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    currentMonthEl.textContent = `${monthNames[this.displayMonth.getMonth()]} ${this.displayMonth.getFullYear()}`;

    // Clear previous calendar
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day day-name';
      dayEl.textContent = day;
      calendarGrid.appendChild(dayEl);
    });

    // Get first day of month and number of days
    const firstDay = new Date(this.displayMonth.getFullYear(), this.displayMonth.getMonth(), 1);
    const lastDay = new Date(this.displayMonth.getFullYear(), this.displayMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day';
      calendarGrid.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';

      const dayNumber = document.createElement('div');
      dayNumber.className = 'calendar-day-number';
      dayNumber.textContent = day;
      dayEl.appendChild(dayNumber);

      // Check if it's today
      const dayDate = new Date(this.displayMonth.getFullYear(), this.displayMonth.getMonth(), day);
      if (this.isSameDay(dayDate, this.currentDate)) {
        dayEl.classList.add('today');
      }

      // Add session dots (placeholder for now)
      const dots = document.createElement('div');
      dots.className = 'calendar-day-dots';
      // Simulate some completed sessions
      const randomSessions = Math.floor(Math.random() * 6);
      if (randomSessions > 0) {
        dayEl.classList.add('has-sessions');
        for (let i = 0; i < Math.min(randomSessions, 5); i++) {
          const dot = document.createElement('div');
          dot.className = 'calendar-dot';
          dots.appendChild(dot);
        }
      }
      dayEl.appendChild(dots);

      // Add click event
      dayEl.addEventListener('click', () => {
        this.selectDay(dayDate);
      });

      calendarGrid.appendChild(dayEl);
    }
  }

  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  selectDay(date) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.classList.remove('selected');
    });

    // Add selection to clicked day
    event.currentTarget.classList.add('selected');

    this.selectedDate = date;
    this.updateDailyDetails(date);
  }

  updateDailyDetails(date = this.currentDate) {
    const dayPomodoros = document.getElementById('day-pomodoros');
    const dayFocusTime = document.getElementById('day-focus-time');
    const dayBreakTime = document.getElementById('day-break-time');

    // Placeholder data - in real app, this would come from stored data
    const isToday = this.isSameDay(date, this.currentDate);

    if (isToday && window.pomodoroTimer) {
      dayPomodoros.textContent = window.pomodoroTimer.completedPomodoros;
      dayFocusTime.textContent = this.formatTime(window.pomodoroTimer.totalFocusTime);
      dayBreakTime.textContent = this.formatTime(window.pomodoroTimer.totalFocusTime * 0.25); // Estimate break time
    } else {
      // Simulate historical data
      const randomPomodoros = Math.floor(Math.random() * 11);
      dayPomodoros.textContent = randomPomodoros;
      dayFocusTime.textContent = this.formatTime(randomPomodoros * 25 * 60);
      dayBreakTime.textContent = this.formatTime(randomPomodoros * 6 * 60);
    }
  }

  updateWeeklyChart() {
    const weekChart = document.getElementById('week-chart');
    weekChart.innerHTML = '';

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxHeight = 160;

    days.forEach((day, index) => {
      const barContainer = document.createElement('div');
      barContainer.style.position = 'relative';
      barContainer.style.flex = '1';
      barContainer.style.display = 'flex';
      barContainer.style.alignItems = 'end';

      const bar = document.createElement('div');
      bar.className = 'week-bar';

      // Simulate data - in real app, this would come from stored statistics
      const pomodoros = Math.floor(Math.random() * 11);
      const height = (pomodoros / 10) * maxHeight;
      bar.style.height = `${Math.max(height, 20)}px`;

      const label = document.createElement('div');
      label.className = 'week-bar-label';
      label.textContent = day;

      const value = document.createElement('div');
      value.className = 'week-bar-value';
      value.textContent = pomodoros;

      bar.appendChild(value);
      barContainer.appendChild(bar);
      barContainer.appendChild(label);
      weekChart.appendChild(barContainer);
    });
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// Settings Manager for Global Shortcuts and Preferences
class SettingsManager {
  constructor() {
    this.settings = null;
    this.isRecordingShortcut = false;
    this.currentRecordingField = null;
    this.recordedKeys = [];
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.registerGlobalShortcuts();
    this.setupGlobalShortcutHandlers();
  }

  async loadSettings() {
    try {
      this.settings = await invoke('load_settings');
      this.populateSettingsUI();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      shortcuts: {
        start_stop: "CommandOrControl+Alt+Space",
        reset: "CommandOrControl+Alt+R",
        skip: "CommandOrControl+Alt+S"
      },
      timer: {
        focus_duration: 25,
        break_duration: 5,
        long_break_duration: 20,
        total_sessions: 10
      },
      notifications: {
        desktop_notifications: true,
        sound_notifications: true,
        auto_start_breaks: true,
        smart_pause: false,
        smart_pause_timeout: 30 // default 30 seconds
      }
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

    // Populate notification settings
    document.getElementById('desktop-notifications').checked = this.settings.notifications.desktop_notifications;
    document.getElementById('sound-notifications').checked = this.settings.notifications.sound_notifications;
    document.getElementById('auto-start-breaks').checked = this.settings.notifications.auto_start_breaks;
    document.getElementById('smart-pause').checked = this.settings.notifications.smart_pause;

    // Populate smart pause timeout
    const timeoutValue = this.settings.notifications.smart_pause_timeout || 30;
    document.getElementById('smart-pause-timeout').value = timeoutValue;
    document.getElementById('timeout-value').textContent = timeoutValue;

    // Show/hide timeout setting based on smart pause checkbox
    this.toggleTimeoutSetting(this.settings.notifications.smart_pause);

    // Setup slider event listener
    this.setupSliderEventListener();
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
      });
    }
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
    // Listen for global shortcut events from Rust
    window.__TAURI__.event.listen('global-shortcut', (event) => {
      const action = event.payload;

      switch (action) {
        case 'start-stop':
          if (window.pomodoroTimer) {
            if (window.pomodoroTimer.isRunning) {
              window.pomodoroTimer.pauseTimer();
            } else {
              window.pomodoroTimer.startTimer();
            }
          }
          break;
        case 'reset':
          if (window.pomodoroTimer) {
            window.pomodoroTimer.resetTimer();
          }
          break;
        case 'skip':
          if (window.pomodoroTimer) {
            window.pomodoroTimer.skipSession();
          }
          break;
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
    setTimeout(() => this.stopRecordingShortcut(), 500);
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
      this.settings.notifications.auto_start_breaks = document.getElementById('auto-start-breaks').checked;
      this.settings.notifications.smart_pause = document.getElementById('smart-pause').checked;
      this.settings.notifications.smart_pause_timeout = parseInt(document.getElementById('smart-pause-timeout').value);

      // Save to file
      await invoke('save_settings', { settings: this.settings });

      // Re-register global shortcuts
      await this.registerGlobalShortcuts();

      // Update timer with new settings
      if (window.pomodoroTimer) {
        await window.pomodoroTimer.applySettings(this.settings);
      }

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
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
    }
  }

  setupSliderEventListener() {
    const slider = document.getElementById('smart-pause-timeout');
    const valueDisplay = document.getElementById('timeout-value');

    if (slider && valueDisplay) {
      slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
      });
    }
  }
}

class PomodoroTimer {
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
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.playIcon = document.getElementById('play-icon');
    this.pauseIcon = document.getElementById('pause-icon');
    this.menuBtn = document.getElementById('menu-btn');
    this.skipBtn = document.getElementById('skip-btn');
    this.progressDots = document.getElementById('progress-dots');

    // Task management
    this.tasks = [];
    this.currentTask = '';

    this.init();
  }

  async init() {
    this.updateDisplay();
    this.updateProgressDots();
    this.setupEventListeners();
    await this.loadSessionData();
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

    this.menuBtn.addEventListener('click', () => {
      // TODO: Show menu/settings modal
      console.log('Menu clicked');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only trigger if not typing in an input
      if (e.target.tagName !== 'INPUT') {
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            if (this.isRunning && !this.isPaused && !this.isAutoPaused) {
              this.pauseTimer();
            } else {
              this.startTimer();
            }
            break;
          case 'KeyS':
            // CMD+ALT+S per start/pausa (nuova shortcut principale)
            if ((e.ctrlKey || e.metaKey) && e.altKey) {
              e.preventDefault();
              if (this.isRunning && !this.isPaused && !this.isAutoPaused) {
                this.pauseTimer();
              } else {
                this.startTimer();
              }
            }
            // CMD+S per skip session (shortcut esistente)
            else if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.skipSession();
            }
            break;
          case 'KeyR':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.resetTimer();
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

    // Restart the timer interval
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
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

      this.timerInterval = setInterval(() => {
        this.timeRemaining--;
        this.updateDisplay();

        // Warning when less than 2 minutes remaining
        if (this.timeRemaining <= 120 && this.timeRemaining > 0) {
          this.addWarningClass();
        }

        if (this.timeRemaining <= 0) {
          this.completeSession();
        }
      }, 1000);

      this.updateButtons();
      this.updateDisplay();
      this.playNotificationSound();
      this.showNotificationPing('Timer started! 🍅');

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
      this.showNotificationPing('Timer paused ⏸️');
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

    this.timeRemaining = this.durations[this.currentMode];
    this.updateDisplay();
    this.updateButtons();
    this.showNotificationPing('Timer reset 🔄');
  }

  skipSession() {
    this.completeSession();
  }

  async completeSession() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);

    if (this.currentMode === 'focus') {
      this.completedPomodoros++;
      this.updateProgressDots();
      this.totalFocusTime += this.durations.focus;

      // Mark current task as completed if exists
      if (this.currentTask.trim()) {
        await this.markTaskCompleted(this.currentTask.trim());
        this.taskInput.value = '';
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

    this.timeRemaining = this.durations[this.currentMode];
    this.updateDisplay();
    this.updateProgress();
    this.updateButtons();
    await this.saveSessionData();
    await this.updateWeeklyStats(); // Update weekly stats after session completion
    this.showNotification();
    this.playNotificationSound();

    // Show completion message
    const messages = {
      focus: this.currentMode === 'longBreak' ? 'Great work! Take a long break 🎉' : 'Pomodoro completed! Take a short break 😌',
      break: 'Break over! Ready to focus? 🍅',
      longBreak: 'Long break over! Time to get back to work 🚀'
    };

    this.showNotificationPing(messages[this.currentMode] || messages.focus);
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

    this.timerStatus.textContent = statusText;

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

    // Update tray icon
    this.updateTrayIcon();
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

  updateProgress() {
    // Metodo disabilitato per la versione semplificata
    // TODO: Implementare se necessario per altre viste
    /*
    // Create dots for each session
    this.pomodoroDotsContainer.innerHTML = '';
    for (let i = 0; i < this.totalSessions; i++) {
      const dot = document.createElement('div');
      dot.className = 'pomodoro-dot';

      if (i < this.completedPomodoros) {
        dot.classList.add('completed');
      } else if (i === this.completedPomodoros && this.currentMode === 'focus') {
        dot.classList.add('current');
      }

      this.pomodoroDotsContainer.appendChild(dot);
    }

    // Update stats
    this.completedCountEl.textContent = this.completedPomodoros;
    const hours = Math.floor(this.totalFocusTime / 3600);
    const minutes = Math.floor((this.totalFocusTime % 3600) / 60);
    this.focusTimeEl.textContent = `${hours}h ${minutes}m`;
    */
  }

  // Progress dots update
  updateProgressDots() {
    const dots = this.progressDots.querySelectorAll('.dot');

    // Update each dot based on completed pomodoros
    dots.forEach((dot, index) => {
      if (index < this.completedPomodoros) {
        dot.classList.add('completed');
      } else {
        dot.classList.remove('completed');
      }
    });
  }

  // Task Management
  async addTask() {
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
    const today = new Date();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    this.weeklyStatsContainer.innerHTML = '';

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
        dayElement.classList.add('completed');
      }

      const hours = Math.floor(focusTime / 3600);
      const minutes = Math.floor((focusTime % 3600) / 60);

      dayElement.innerHTML = `
        <div class="day-label">${weekDays[date.getDay()]}</div>
        <div class="day-count">${completed}</div>
        <div class="day-time">${hours}h ${minutes}m</div>
      `;

      this.weeklyStatsContainer.appendChild(dayElement);
    }
  }

  // History Modal
  async showHistoryModal() {
    try {
      const history = await invoke('get_stats_history');
      this.createHistoryModal(history);
    } catch (error) {
      console.error('Failed to load history:', error);
      this.showNotificationPing('Failed to load history 😞');
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
      const tasks = await invoke('load_tasks');
      return tasks || [];
    } catch (error) {
      console.error('Failed to load tasks from Tauri, using localStorage:', error);
      const saved = localStorage.getItem('pomodoro-tasks');
      return saved ? JSON.parse(saved) : [];
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
        this.updateProgress();
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
          this.updateProgress();
        }
      }
    }
  }

  // Notifications
  showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const messages = {
        focus: 'Break time! Take a rest 😌',
        break: 'Break over! Time to focus 🍅',
        longBreak: 'Long break over! Ready for more focus? 🚀'
      };

      new Notification('Tempo - Pomodoro Timer', {
        body: messages[this.currentMode],
        icon: '/assets/tauri.svg'
      });
    }
  }

  playNotificationSound() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  // Visual notification helper
  showNotificationPing(message) {
    // Remove existing notification
    const existing = document.querySelector('.notification-ping');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification-ping';
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
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

    // Update notification preferences
    this.enableDesktopNotifications = settings.notifications.desktop_notifications;
    this.enableSoundNotifications = settings.notifications.sound_notifications;
    this.autoStartBreaks = settings.notifications.auto_start_breaks;

    // Update smart pause setting and timeout
    this.inactivityThreshold = (settings.notifications.smart_pause_timeout || 30) * 1000; // convert to milliseconds

    // Update backend timeout if smart pause is enabled and monitoring is active
    if (this.smartPauseEnabled) {
      try {
        const timeoutSeconds = Math.floor(this.inactivityThreshold / 1000);
        await invoke('update_activity_timeout', { timeout_seconds: timeoutSeconds });
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
    this.updateProgressDots();
    this.currentSession = 1;
    this.totalFocusTime = 0;
    this.currentMode = 'focus';

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
    this.updateProgress();
    this.updateButtons();
    this.renderTasks();
    this.updateWeeklyStats();
    this.updateTrayIcon();

    console.log('Timer reset to initial state');
  }
}

// Initialize the timer when the page loads
let timer;
let navigation;
let settingsManager;

// Global functions for settings
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
      performTotalReset();
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

window.addEventListener("DOMContentLoaded", async () => {
  // Request notification permission
  if ('Notification' in window) {
    Notification.requestPermission();
  }

  // Initialize settings manager first
  settingsManager = new SettingsManager();
  window.settingsManager = settingsManager;
  await settingsManager.init();

  // Initialize the timer
  timer = new PomodoroTimer();
  window.pomodoroTimer = timer; // Make it globally accessible

  // Apply settings to timer
  if (settingsManager.settings) {
    await timer.applySettings(settingsManager.settings);
  }

  // Initialize navigation manager
  navigation = new NavigationManager();
  window.navigationManager = navigation; // Make it globally accessible

  // Setup reset button event listener
  const resetButton = document.getElementById('reset-all-data-btn');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      console.log("Reset button clicked via event listener"); // Debug log
      confirmTotalReset();
    });
    console.log("Reset button event listener added"); // Debug log
  } else {
    console.error("Reset button not found in DOM"); // Debug log
  }

  // Setup other settings buttons event listeners
  const saveSettingsBtn = document.querySelector('.btn-primary');
  if (saveSettingsBtn && saveSettingsBtn.textContent.includes('Save Settings')) {
    saveSettingsBtn.addEventListener('click', () => {
      console.log("Save settings button clicked via event listener");
      saveSettings();
    });
    // Remove onclick attribute
    saveSettingsBtn.removeAttribute('onclick');
  }

  const resetToDefaultsBtn = document.querySelector('.btn-secondary');
  if (resetToDefaultsBtn && resetToDefaultsBtn.textContent.includes('Reset to Defaults')) {
    resetToDefaultsBtn.addEventListener('click', () => {
      console.log("Reset to defaults button clicked via event listener");
      resetToDefaults();
    });
    // Remove onclick attribute
    resetToDefaultsBtn.removeAttribute('onclick');
  }
});
