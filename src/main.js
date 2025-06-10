// Pomodoro Timer Application
const { invoke } = window.__TAURI__.core;

// Navigation Manager for Sidebar
class NavigationManager {
  constructor() {
    this.currentView = 'timer';
    this.init();
  }

  async init() {
    // Navigation buttons
    const navButtons = document.querySelectorAll('.sidebar-icon, .sidebar-icon-large');
    navButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const view = e.currentTarget.dataset.view;
        await this.switchView(view);
      });
    });

    // Initialize calendar
    await this.initCalendar();
  }

  async switchView(view) {
    // Update active button
    document.querySelectorAll('.sidebar-icon, .sidebar-icon-large').forEach(btn => {
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
      await this.updateCalendar();
      this.updateWeekDisplay();
      await this.updateFocusSummary();
      await this.updateWeeklySessionsChart();
      this.updateDailyChart();
      await this.updateSelectedDayDetails();
    } else if (view === 'settings') {
      // Settings view will be handled by SettingsManager
      if (window.settingsManager) {
        window.settingsManager.populateSettingsUI();
      }
    }
  }

  async initCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    // Week selector elements
    const weekRangeEl = document.getElementById('week-range');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');

    this.currentDate = new Date();
    this.displayMonth = new Date(this.currentDate);
    this.selectedWeek = this.getWeekStart(this.currentDate);

    // Month navigation
    prevBtn.addEventListener('click', async () => {
      this.displayMonth.setMonth(this.displayMonth.getMonth() - 1);
      await this.updateCalendar();
    });

    nextBtn.addEventListener('click', async () => {
      this.displayMonth.setMonth(this.displayMonth.getMonth() + 1);
      await this.updateCalendar();
    });

    // Week navigation
    prevWeekBtn.addEventListener('click', async () => {
      this.selectedWeek.setDate(this.selectedWeek.getDate() - 7);
      this.updateWeekDisplay();
      await this.updateFocusSummary();
      await this.updateWeeklySessionsChart();
      this.updateDailyChart();
    });

    nextWeekBtn.addEventListener('click', async () => {
      this.selectedWeek.setDate(this.selectedWeek.getDate() + 7);
      this.updateWeekDisplay();
      await this.updateFocusSummary();
      await this.updateWeeklySessionsChart();
      this.updateDailyChart();
    });

    await this.updateCalendar();
    this.updateWeekDisplay();
    await this.updateFocusSummary();
    await this.updateWeeklySessionsChart();
    this.updateDailyChart();
    await this.updateSelectedDayDetails();
  }

  getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    return start;
  }

  updateWeekDisplay() {
    const weekRangeEl = document.getElementById('week-range');
    const weekStart = new Date(this.selectedWeek);
    const weekEnd = new Date(this.selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatOptions = { day: 'numeric', month: 'short' };
    const startStr = weekStart.toLocaleDateString('en-US', formatOptions);
    const endStr = weekEnd.toLocaleDateString('en-US', formatOptions);
    const year = weekEnd.getFullYear();

    weekRangeEl.textContent = `${startStr} - ${endStr} ${year}`;
  }

  async updateFocusSummary() {
    const totalFocusTodayEl = document.getElementById('total-focus-today');
    const avgFocusDayEl = document.getElementById('avg-focus-day');

    // Calculate today's total focus (real data only)
    const isToday = this.isSameDay(new Date(), this.currentDate);
    let todayFocus = 0;

    if (isToday && window.pomodoroTimer) {
      todayFocus = window.pomodoroTimer.totalFocusTime;
    } else {
      // Load real data for selected date
      try {
        const history = await invoke('get_stats_history');
        const selectedDateStr = this.currentDate.toDateString();
        const dayData = history.find(h => h.date === selectedDateStr);
        todayFocus = dayData ? dayData.total_focus_time : 0;
      } catch (error) {
        console.error('Failed to load focus data:', error);
        todayFocus = 0;
      }
    }

    // Calculate weekly average (real data only)
    let avgFocus = 0;
    try {
      const history = await invoke('get_stats_history');
      const weekStart = this.getWeekStart(this.currentDate);
      let weekTotal = 0;
      let daysWithData = 0;

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dayData = history.find(h => h.date === date.toDateString());
        if (dayData && dayData.total_focus_time > 0) {
          weekTotal += dayData.total_focus_time;
          daysWithData++;
        }
      }

      avgFocus = daysWithData > 0 ? weekTotal / daysWithData : 0;
    } catch (error) {
      console.error('Failed to load weekly data:', error);
      avgFocus = 0;
    }

    totalFocusTodayEl.textContent = this.formatTime(todayFocus);
    avgFocusDayEl.textContent = this.formatTime(avgFocus);
  }

  updateDailyChart() {
    const dailyChart = document.getElementById('daily-chart');
    dailyChart.innerHTML = '';

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const maxHeight = 160;

    hours.forEach(hour => {
      const hourBar = document.createElement('div');
      hourBar.className = 'hour-bar';

      // Real data only - no demo data for now
      const focusMinutes = 0;
      const breakMinutes = 0;

      const totalMinutes = focusMinutes + breakMinutes;
      const height = Math.max((totalMinutes / 60) * maxHeight, 4);

      hourBar.style.height = `${height}px`;

      if (focusMinutes > 0) {
        // Create focus and break segments
        const focusSegment = document.createElement('div');
        focusSegment.className = 'hour-bar-focus';
        focusSegment.style.height = `${(focusMinutes / totalMinutes) * 100}%`;

        const breakSegment = document.createElement('div');
        breakSegment.className = 'hour-bar-break';
        breakSegment.style.height = `${(breakMinutes / totalMinutes) * 100}%`;

        hourBar.appendChild(focusSegment);
        hourBar.appendChild(breakSegment);
      }

      const hourLabel = document.createElement('div');
      hourLabel.className = 'hour-label';
      hourLabel.textContent = hour.toString().padStart(2, '0');

      hourBar.appendChild(hourLabel);

      // Add hover tooltip
      hourBar.title = `${hour}:00 - Focus: ${focusMinutes}m, Break: ${breakMinutes}m`;

      dailyChart.appendChild(hourBar);
    });
  }

  async updateWeeklySessionsChart() {
    const weeklyChart = document.getElementById('weekly-chart');
    weeklyChart.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const maxHeight = 70;

    try {
      const history = await invoke('get_stats_history');
      const weekStart = this.getWeekStart(this.currentDate);

      days.forEach((day, index) => {
        const dayBar = document.createElement('div');
        dayBar.className = 'week-day-bar';

        // Calculate date for this day of the week
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        
        // Find real session data for this date
        const dayData = history.find(h => h.date === date.toDateString());
        const sessionsMinutes = dayData ? dayData.total_focus_time / 60 : 0; // Convert seconds to minutes
        const height = Math.max((sessionsMinutes / 200) * maxHeight, 8);

        dayBar.style.height = `${height}px`;

        // Add value label on hover
        if (sessionsMinutes > 0) {
          const valueLabel = document.createElement('div');
          valueLabel.className = 'week-day-bar-value';
          valueLabel.textContent = `${Math.floor(sessionsMinutes / 25)}s`; // Convert to sessions
          dayBar.appendChild(valueLabel);
        }

        // Add hover tooltip
        const hours = Math.floor(sessionsMinutes / 60);
        const minutes = Math.floor(sessionsMinutes % 60);
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        const sessions = dayData ? dayData.completed_pomodoros : 0;
        dayBar.title = `${day}: ${timeText} (${sessions} sessions)`;

        weeklyChart.appendChild(dayBar);
      });
    } catch (error) {
      console.error('Failed to load weekly chart data:', error);
      // Show empty chart on error
      days.forEach((day, index) => {
        const dayBar = document.createElement('div');
        dayBar.className = 'week-day-bar';
        dayBar.style.height = '8px';
        dayBar.title = `${day}: No data available`;
        weeklyChart.appendChild(dayBar);
      });
    }
  }

  async updateSelectedDayDetails(date = this.currentDate) {
    const selectedDayTitle = document.getElementById('selected-day-title');
    const sessionsList = document.getElementById('sessions-list');

    // Format date for display
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isToday = this.isSameDay(date, new Date());
    selectedDayTitle.textContent = isToday ? "Today's Sessions" : `${dateStr} Sessions`;

    // Clear previous sessions
    sessionsList.innerHTML = '';

    try {
      const history = await invoke('get_stats_history');
      const selectedDateStr = date.toDateString();
      const dayData = history.find(h => h.date === selectedDateStr);

      if (!dayData || dayData.completed_pomodoros === 0) {
        const noSessions = document.createElement('div');
        noSessions.className = 'session-item';
        noSessions.innerHTML = '<span>No sessions completed</span>';
        sessionsList.appendChild(noSessions);
        return;
      }

      // Create session items based on completed pomodoros
      for (let i = 0; i < dayData.completed_pomodoros; i++) {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item';

        // Estimate session times (this is an approximation)
        const sessionStartTime = new Date(date);
        sessionStartTime.setHours(9 + Math.floor(i * 0.5), (i * 30) % 60); // Spread throughout day

        const sessionType = 'Focus';
        const duration = '25m';
        const startTime = sessionStartTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });

        sessionItem.innerHTML = `
          <span class="session-type">${sessionType}</span>
          <div>
            <span>${duration}</span>
            <span class="session-time">${startTime}</span>
          </div>
        `;

        sessionsList.appendChild(sessionItem);
      }
    } catch (error) {
      console.error('Failed to load session details:', error);
      const errorItem = document.createElement('div');
      errorItem.className = 'session-item';
      errorItem.innerHTML = '<span>Error loading session data</span>';
      sessionsList.appendChild(errorItem);
    }
  }

  async updateCalendar() {
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

    try {
      // Load session history for the month
      const history = await invoke('get_stats_history');

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

        // Add session dots based on real data
        const dots = document.createElement('div');
        dots.className = 'calendar-day-dots';
        
        const dayData = history.find(h => h.date === dayDate.toDateString());
        if (dayData && dayData.completed_pomodoros > 0) {
          dayEl.classList.add('has-sessions');
          const numDots = Math.min(dayData.completed_pomodoros, 5); // Max 5 dots
          for (let i = 0; i < numDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'calendar-dot';
            dots.appendChild(dot);
          }
        }
        
        dayEl.appendChild(dots);

        // Add click event
        dayEl.addEventListener('click', async () => {
          await this.selectDay(dayDate);
        });

        calendarGrid.appendChild(dayEl);
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      // Fallback: create calendar without session data
      for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayEl.appendChild(dayNumber);

        const dayDate = new Date(this.displayMonth.getFullYear(), this.displayMonth.getMonth(), day);
        if (this.isSameDay(dayDate, this.currentDate)) {
          dayEl.classList.add('today');
        }

        const dots = document.createElement('div');
        dots.className = 'calendar-day-dots';
        dayEl.appendChild(dots);

        dayEl.addEventListener('click', async () => {
          await this.selectDay(dayDate);
        });

        calendarGrid.appendChild(dayEl);
      }
    }
  }

  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  async selectDay(date) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.classList.remove('selected');
    });

    // Add selection to clicked day
    event.currentTarget.classList.add('selected');

    this.selectedDate = date;
    await this.updateSelectedDayDetails(date);
    await this.updateFocusSummary();
    await this.updateWeeklySessionsChart();
    this.updateDailyChart();
  }

  updateDailyDetails(date = this.currentDate) {
    // This method is now replaced by updateSelectedDayDetails, updateFocusSummary, and updateDailyChart
    // Keeping it for compatibility, but it just calls the new methods
    this.updateSelectedDayDetails(date);
    this.updateFocusSummary();
    this.updateWeeklySessionsChart();
    this.updateDailyChart();
  }

  updateWeeklyChart() {
    // This method is now replaced by updateDailyChart
    // Keeping it for compatibility
    this.updateDailyChart();
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
    this.autoSaveTimeout = null;
    this.autoSaveDelay = 1000; // 1 second delay for auto-save
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
        total_sessions: 10,
        weekly_goal_minutes: 125
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

    // Populate weekly goal
    const weeklyGoalField = document.getElementById('weekly-goal-minutes');
    if (weeklyGoalField) {
      weeklyGoalField.value = this.settings.timer.weekly_goal_minutes || 125;
    }

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
        this.scheduleAutoSave();
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

    // Notification checkboxes
    const checkboxFields = [
      'desktop-notifications',
      'sound-notifications',
      'auto-start-breaks'
    ];

    checkboxFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', () => this.scheduleAutoSave());
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

      // Show a subtle feedback that settings were saved
      this.showAutoSaveFeedback();

    } catch (error) {
      console.error('Failed to auto-save settings:', error);
      // Don't show an alert for auto-save failures, just log the error
    }
  }

  showAutoSaveFeedback() {
    // Find or create a feedback element
    let feedback = document.getElementById('auto-save-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = 'auto-save-feedback';
      feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(feedback);
    }

    feedback.textContent = '✓ Settings saved';
    feedback.style.opacity = '1';

    // Fade out after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = '0';
    }, 2000);
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
    this.statusIcon = document.getElementById('status-icon');
    this.statusText = document.getElementById('status-text');
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.playIcon = document.getElementById('play-icon');
    this.pauseIcon = document.getElementById('pause-icon');
    this.menuBtn = document.getElementById('menu-btn');
    this.skipBtn = document.getElementById('skip-btn');
    this.progressDots = document.getElementById('progress-dots');

    // Task management
    this.tasks = [];
    this.currentTask = '';

    // Keyboard shortcuts (will be updated from settings)
    this.customShortcuts = {
      start_stop: "CommandOrControl+Alt+Space",
      reset: "CommandOrControl+Alt+R",
      skip: "CommandOrControl+Alt+S"
    };

    this.init();
  }

  async init() {
    this.updateDisplay();
    this.updateProgressDots();
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

    this.menuBtn.addEventListener('click', () => {
      // TODO: Show menu/settings modal
      console.log('Menu clicked');
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
          this.resetTimer();
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
    if (!shortcutString) return null;

    const parts = shortcutString.split('+');
    const result = {
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
      key: ''
    };

    parts.forEach(part => {
      const partLower = part.toLowerCase();
      switch (partLower) {
        case 'commandorcontrol':
        case 'cmd':
        case 'command':
          result.meta = true;
          result.ctrl = true; // For cross-platform compatibility
          break;
        case 'alt':
          result.alt = true;
          break;
        case 'shift':
          result.shift = true;
          break;
        case 'space':
          result.key = ' ';
          break;
        default:
          result.key = partLower;
      }
    });

    return result;
  }

  // Check if a keyboard event matches a shortcut
  matchesShortcut(event, shortcutString) {
    const shortcut = this.parseShortcut(shortcutString);
    if (!shortcut) return false;

    const eventKey = event.key.toLowerCase();

    // Handle special key matches
    let keyMatches = false;
    if (shortcut.key === ' ') {
      keyMatches = event.code === 'Space' || eventKey === ' ';
    } else if (shortcut.key === 's') {
      keyMatches = eventKey === 's' || event.code === 'KeyS';
    } else if (shortcut.key === 'r') {
      keyMatches = eventKey === 'r' || event.code === 'KeyR';
    } else {
      keyMatches = shortcut.key === eventKey;
    }

    const modifiersMatch =
      (!shortcut.meta || event.metaKey || event.ctrlKey) &&
      (!shortcut.ctrl || event.ctrlKey || event.metaKey) &&
      (!shortcut.alt || event.altKey) &&
      (!shortcut.shift || event.shiftKey);

    return keyMatches && modifiersMatch;
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
    this.showNotificationPing('Timer auto-paused due to inactivity 💤', 'warning');

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
    this.showNotificationPing('Timer resumed - you\'re back! 🎯', 'info');

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
        if (this.timeRemaining === 120 && this.currentMode === 'focus') {
          this.addWarningClass();
          this.showNotificationPing('2 minutes remaining! 🔥', 'warning');
        }

        // Final warning at 30 seconds
        if (this.timeRemaining === 30) {
          this.showNotificationPing('30 seconds left! ⏰', 'warning');
        }

        if (this.timeRemaining <= 0) {
          this.completeSession();
        }
      }, 1000);

      this.updateButtons();
      this.updateDisplay();
      this.playNotificationSound();
      this.showNotificationPing('Timer started! 🍅', 'info');

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

    this.showNotificationPing(messages[this.currentMode] || messages.focus, 'success');
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

    // Update status icon based on current mode
    this.updateStatusIcon();

    // Update status text
    if (this.statusText) {
      this.statusText.textContent = statusText;
    }

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

    // Update tray icon
    this.updateTrayIcon();
  }

  // Update status icon based on current mode
  updateStatusIcon() {
    if (!this.statusIcon) return;

    // Define SVG paths for different modes (Heroicons)
    const iconPaths = {
      focus: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443a55.381 55.381 0 0 1 5.25 2.882V15',
      break: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z M12.5 3.75a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 0-1.5h-2.25V3.75Z',
      longBreak: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z M12.5 3.75a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 0-1.5h-2.25V3.75Z'
    };

    // Update the path
    const pathElement = this.statusIcon.querySelector('path');
    if (pathElement && iconPaths[this.currentMode]) {
      pathElement.setAttribute('d', iconPaths[this.currentMode]);
    }
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

  // Simple notification system
  showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const messages = {
        focus: 'Break time! Take a rest 😌',
        break: 'Break over! Time to focus 🍅',
        longBreak: 'Long break over! Ready for more focus? 🚀'
      };

      new Notification('Tempo - Pomodoro Timer', {
        body: messages[this.currentMode],
        icon: '/assets/tauri.svg',
        silent: false,
        requireInteraction: false
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

  // Simple visual notification system
  showNotificationPing(message, type = null) {
    // Ensure notification container exists
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    // Remove existing notifications
    const existingNotifications = container.querySelectorAll('.notification-ping');
    existingNotifications.forEach(notification => {
      this.dismissNotification(notification);
    });

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification-ping ${type || this.currentMode}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      if (notification && notification.parentNode) {
        this.dismissNotification(notification);
      }
    }, 3000);

    // Click to dismiss
    notification.addEventListener('click', () => {
      this.dismissNotification(notification);
    });
  }

  dismissNotification(notification) {
    if (!notification || !notification.parentNode) return;

    notification.classList.add('dismissing');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

    // Update keyboard shortcuts
    if (settings.shortcuts) {
      this.updateKeyboardShortcuts(settings.shortcuts);
    }

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
  await navigation.init();

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
