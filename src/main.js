// Pomodoro Timer Application
const { invoke } = window.__TAURI__.core;

// Navigation Manager for Sidebar
class NavigationManager {
  constructor() {
    this.currentView = 'timer';
    this.initialized = false;
  }

  async init() {
    // Prevent duplicate initialization
    if (this.initialized) {
      console.log('NavigationManager already initialized, skipping...');
      return;
    }

    this.initialized = true;
    console.log('Initializing NavigationManager...');

    // Navigation buttons
    const navButtons = document.querySelectorAll('.sidebar-icon, .sidebar-icon-large');
    navButtons.forEach(btn => {
      // Remove any existing listeners first
      btn.removeEventListener('click', this.handleNavClick);

      // Add new listener
      btn.addEventListener('click', this.handleNavClick.bind(this));
    });

    // Initialize calendar
    await this.initCalendar();
  }

  async handleNavClick(e) {
    const view = e.currentTarget.dataset.view;
    await this.switchView(view);
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

    // Initial updates will be handled by switchView when calendar is shown
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
      const today = new Date();

      // First pass: collect all session data for the week to determine max value
      const weekData = [];
      let maxSessionsMinutes = 0;
      let totalSessionTime = 0;
      let totalSessions = 0;
      let daysConsidered = 0;

      days.forEach((day, index) => {
        // Calculate date for this day of the week
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);

        // Find real session data for this date
        const dayData = history.find(h => h.date === date.toDateString());
        const sessionsMinutes = dayData ? dayData.total_focus_time / 60 : 0; // Convert seconds to minutes
        const sessions = dayData ? dayData.completed_pomodoros : 0;

        // Only consider days that have completely passed (exclude today)
        const isCompletePastDay = date.toDateString() !== today.toDateString() && date < today;
        if (isCompletePastDay && sessions > 0) {
          totalSessionTime += sessionsMinutes;
          totalSessions += sessions;
          daysConsidered++;
        }

        weekData.push({
          day,
          date,
          dayData,
          sessionsMinutes,
          sessions,
          isPast: date <= today
        });

        // Track maximum for proportional scaling
        if (sessionsMinutes > maxSessionsMinutes) {
          maxSessionsMinutes = sessionsMinutes;
        }
      });

      // Calculate average session time (only for past days with data)
      const avgSessionTime = totalSessions > 0 ? totalSessionTime / totalSessions : 0;

      // Use a minimum baseline for maxSessionsMinutes to avoid tiny bars
      const scalingMax = Math.max(maxSessionsMinutes, Math.max(avgSessionTime, 60)); // Include average in scaling

      // Add average session time line if we have data
      if (avgSessionTime > 0 && daysConsidered > 0) {
        const avgLine = document.createElement('div');
        avgLine.className = 'week-average-line';

        // Calculate position of average line
        const avgLineHeight = (avgSessionTime / scalingMax) * maxHeight;
        avgLine.style.bottom = `${avgLineHeight}px`;
        avgLine.style.left = '0';
        avgLine.style.right = '0';
        avgLine.style.position = 'absolute';
        avgLine.style.height = '2px';
        avgLine.style.backgroundColor = '#3498db';
        avgLine.style.zIndex = '10';
        avgLine.style.opacity = '0.8';

        // Add label for average
        const avgLabel = document.createElement('div');
        avgLabel.className = 'week-average-label';
        avgLabel.textContent = `Avg: ${Math.round(avgSessionTime)}m`;
        avgLabel.style.position = 'absolute';
        avgLabel.style.right = '5px';
        avgLabel.style.top = '-18px';
        avgLabel.style.fontSize = '10px';
        avgLabel.style.color = '#3498db';
        avgLabel.style.fontWeight = '600';
        avgLabel.style.background = 'white';
        avgLabel.style.padding = '1px 4px';
        avgLabel.style.borderRadius = '3px';
        avgLabel.style.whiteSpace = 'nowrap';

        avgLine.appendChild(avgLabel);

        // Set relative positioning on chart to contain the absolute line
        weeklyChart.style.position = 'relative';
        weeklyChart.appendChild(avgLine);
      }

      // Second pass: create the bars with proportional scaling
      weekData.forEach(({ day, sessionsMinutes, sessions, dayData, isPast }) => {
        const dayBar = document.createElement('div');
        dayBar.className = 'week-day-bar';

        // Scale height proportionally to the week's maximum value
        const height = sessionsMinutes > 0
          ? Math.max((sessionsMinutes / scalingMax) * maxHeight, 8)
          : 8;

        dayBar.style.height = `${height}px`;

        // Add visual indicator if this day was used in average calculation
        if (isPast && sessions > 0) {
          dayBar.style.borderTop = '2px solid #3498db';
        }

        // Add value label on hover
        if (sessionsMinutes > 0) {
          const valueLabel = document.createElement('div');
          valueLabel.className = 'week-day-bar-value';
          valueLabel.textContent = `${sessions}`;
          dayBar.appendChild(valueLabel);
        }

        // Add hover tooltip with average session time info
        const hours = Math.floor(sessionsMinutes / 60);
        const minutes = Math.floor(sessionsMinutes % 60);
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        const avgPerSession = sessions > 0 ? Math.round(sessionsMinutes / sessions) : 0;
        const tooltipText = sessions > 0
          ? `${day}: ${timeText} (${sessions} sessions, ${avgPerSession}m avg/session)`
          : `${day}: ${timeText} (${sessions} sessions)`;
        dayBar.title = tooltipText;

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
    const timelineTrack = document.getElementById('timeline-track');
    const timelineHours = document.getElementById('timeline-hours');

    // Format date for display
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isToday = this.isSameDay(date, new Date());
    selectedDayTitle.textContent = isToday ? "Today's Sessions" : `${dateStr} Sessions`;

    // Setup timeline hours (6 AM to 10 PM)
    this.setupTimelineHours(timelineHours);

    // Clear previous sessions
    timelineTrack.innerHTML = '';

    try {
      // Get sessions from SessionManager first (for manually added sessions)
      let manualSessions = [];
      if (window.sessionManager) {
        manualSessions = window.sessionManager.getSessionsForDate(date);
      }

      // Get historical data for completed pomodoros
      const history = await invoke('get_stats_history');
      const selectedDateStr = date.toDateString();
      const dayData = history.find(h => h.date === selectedDateStr);

      // Combine manual sessions with historical data
      const allSessions = [...manualSessions];

      // Add historical pomodoros if no manual sessions exist for focus sessions
      if (dayData && dayData.completed_pomodoros > 0) {
        const focusSessionsCount = manualSessions.filter(s => s.session_type === 'focus' || s.session_type === 'custom').length;

        // If we have fewer manual focus sessions than completed pomodoros, add the difference
        for (let i = focusSessionsCount; i < dayData.completed_pomodoros; i++) {
          const sessionStartTime = new Date(date);
          sessionStartTime.setHours(9 + Math.floor(i * 0.5), (i * 30) % 60);

          allSessions.push({
            id: `historical-${i}`,
            session_type: 'focus',
            duration: 25,
            start_time: sessionStartTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            end_time: new Date(sessionStartTime.getTime() + 25 * 60000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            notes: null,
            isHistorical: true
          });
        }
      }

      // Sort sessions by start time
      allSessions.sort((a, b) => a.start_time.localeCompare(b.start_time));

      if (allSessions.length === 0) {
        const noSessions = document.createElement('div');
        noSessions.className = 'timeline-empty';
        noSessions.textContent = 'No sessions completed';
        timelineTrack.appendChild(noSessions);
        return;
      }

      // Create timeline session blocks
      allSessions.forEach(session => {
        this.createTimelineSession(session, date, timelineTrack);
      });

      // Initialize timeline interactions
      this.initializeTimelineInteractions();

    } catch (error) {
      console.error('Failed to load session details:', error);
      const errorItem = document.createElement('div');
      errorItem.className = 'sessions-empty';
      errorItem.textContent = 'Error loading session data';
      sessionsList.appendChild(errorItem);
    }
  }

  getSessionTypeDisplay(type) {
    switch (type) {
      case 'focus':
        return 'Focus';
      case 'break':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      case 'custom':
        return 'Custom';
      default:
        return 'Focus';
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

    // Load session history for the month
    let history = [];
    try {
      history = await invoke('get_stats_history');
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      // Continue with empty history
    }

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

      // Add session dots based on real data (if available)
      const dots = document.createElement('div');
      dots.className = 'calendar-day-dots';

      if (history.length > 0) {
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
      }

      dayEl.appendChild(dots);

      // Add click event
      dayEl.addEventListener('click', async () => {
        await this.selectDay(dayDate);
      });

      calendarGrid.appendChild(dayEl);
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

  setupTimelineHours(timelineHours) {
    timelineHours.innerHTML = '';

    // Show hours from 6 AM to 10 PM
    for (let hour = 6; hour <= 22; hour += 2) {
      const hourElement = document.createElement('div');
      hourElement.className = 'timeline-hour';
      hourElement.textContent = `${hour}:00`;
      timelineHours.appendChild(hourElement);
    }
  }

  createTimelineSession(session, date, timelineTrack) {
    const sessionElement = document.createElement('div');
    sessionElement.className = `timeline-session ${session.session_type}`;
    sessionElement.dataset.sessionId = session.id;
    sessionElement.dataset.isHistorical = session.isHistorical || false;

    // Parse start and end times
    const [startHour, startMinute] = session.start_time.split(':').map(Number);
    const [endHour, endMinute] = session.end_time.split(':').map(Number);

    // Calculate position and width (6 AM = 0%, 10 PM = 100%)
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    const timelineStartMinutes = 6 * 60; // 6 AM
    const timelineEndMinutes = 22 * 60; // 10 PM
    const timelineRangeMinutes = timelineEndMinutes - timelineStartMinutes;

    const leftPercent = Math.max(0, ((startTimeInMinutes - timelineStartMinutes) / timelineRangeMinutes) * 100);
    const rightPercent = Math.min(100, ((endTimeInMinutes - timelineStartMinutes) / timelineRangeMinutes) * 100);
    const widthPercent = rightPercent - leftPercent;

    sessionElement.style.left = `${leftPercent}%`;
    sessionElement.style.width = `${widthPercent}%`;

    // Session content
    const sessionType = this.getSessionTypeDisplay(session.session_type);
    sessionElement.innerHTML = `
      <div class="session-handle left"></div>
      <div class="timeline-session-content">
        <span class="timeline-session-type">${sessionType}</span>
        <span class="timeline-session-time">${session.start_time} - ${session.end_time}</span>
      </div>
      <div class="session-handle right"></div>
    `;

    // Add event listeners for non-historical sessions
    if (!session.isHistorical) {
      this.addTimelineSessionEventListeners(sessionElement, session, date);
    } else {
      // Remove handles for historical sessions
      sessionElement.classList.add('historical');
      sessionElement.querySelectorAll('.session-handle').forEach(handle => handle.remove());
    }

    timelineTrack.appendChild(sessionElement);
  }

  addTimelineSessionEventListeners(sessionElement, session, date) {
    // Double-click to edit
    sessionElement.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (window.sessionManager) {
        window.sessionManager.openEditSessionModal(session, date);
      }
    });

    // Right-click context menu
    sessionElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showSessionContextMenu(e, session, date);
    });

    // Drag to move
    sessionElement.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('session-handle')) return;
      this.startSessionDrag(e, sessionElement, session);
    });

    // Handle resize
    const leftHandle = sessionElement.querySelector('.session-handle.left');
    const rightHandle = sessionElement.querySelector('.session-handle.right');

    if (leftHandle) {
      leftHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startSessionResize(e, sessionElement, session, 'left');
      });
    }

    if (rightHandle) {
      rightHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startSessionResize(e, sessionElement, session, 'right');
      });
    }
  }

  initializeTimelineInteractions() {
    // Close context menu on click outside
    document.addEventListener('click', () => {
      const contextMenu = document.querySelector('.session-context-menu');
      if (contextMenu) {
        contextMenu.remove();
      }
    });
  }

  showSessionContextMenu(e, session, date) {
    // Remove existing context menu
    const existingMenu = document.querySelector('.session-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'session-context-menu';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.display = 'block';

    contextMenu.innerHTML = `
      <div class="context-menu-item edit-item">Edit Session</div>
      <div class="context-menu-item duplicate-item">Duplicate</div>
      <div class="context-menu-item danger delete-item">Delete</div>
    `;

    // Add event listeners
    contextMenu.querySelector('.edit-item').addEventListener('click', () => {
      if (window.sessionManager) {
        window.sessionManager.openEditSessionModal(session, date);
      }
      contextMenu.remove();
    });

    contextMenu.querySelector('.delete-item').addEventListener('click', () => {
      if (window.sessionManager && confirm('Are you sure you want to delete this session?')) {
        window.sessionManager.currentEditingSession = session;
        window.sessionManager.selectedDate = date;
        window.sessionManager.deleteCurrentSession();
      }
      contextMenu.remove();
    });

    contextMenu.querySelector('.duplicate-item').addEventListener('click', () => {
      // TODO: Implement session duplication
      console.log('Duplicate session:', session);
      contextMenu.remove();
    });

    document.body.appendChild(contextMenu);
  }

  startSessionDrag(e, sessionElement, session) {
    e.preventDefault();
    sessionElement.classList.add('dragging');

    const timeline = document.getElementById('timeline-track');
    const timelineRect = timeline.getBoundingClientRect();
    const sessionRect = sessionElement.getBoundingClientRect();

    const offsetX = e.clientX - sessionRect.left;

    const handleMouseMove = (e) => {
      const x = e.clientX - timelineRect.left - offsetX;
      const percentage = Math.max(0, Math.min(100, (x / timelineRect.width) * 100));
      sessionElement.style.left = `${percentage}%`;
    };

    const handleMouseUp = () => {
      sessionElement.classList.remove('dragging');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Update session time based on new position
      this.updateSessionTimeFromPosition(sessionElement, session);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  startSessionResize(e, sessionElement, session, side) {
    e.preventDefault();
    sessionElement.classList.add('resizing');

    const timeline = document.getElementById('timeline-track');
    const timelineRect = timeline.getBoundingClientRect();

    const handleMouseMove = (e) => {
      const x = e.clientX - timelineRect.left;
      const percentage = Math.max(0, Math.min(100, (x / timelineRect.width) * 100));

      const currentLeft = parseFloat(sessionElement.style.left);
      const currentWidth = parseFloat(sessionElement.style.width);
      const currentRight = currentLeft + currentWidth;

      if (side === 'left') {
        const newLeft = Math.min(percentage, currentRight - 2); // Minimum 2% width
        const newWidth = currentRight - newLeft;
        sessionElement.style.left = `${newLeft}%`;
        sessionElement.style.width = `${newWidth}%`;
      } else {
        const newWidth = Math.max(2, percentage - currentLeft); // Minimum 2% width
        sessionElement.style.width = `${newWidth}%`;
      }
    };

    const handleMouseUp = () => {
      sessionElement.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Update session time based on new size and position
      this.updateSessionTimeFromPosition(sessionElement, session);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  updateSessionTimeFromPosition(sessionElement, session) {
    const leftPercent = parseFloat(sessionElement.style.left);
    const widthPercent = parseFloat(sessionElement.style.width);
    const rightPercent = leftPercent + widthPercent;

    // Convert percentages back to time (6 AM to 10 PM range)
    const timelineStartMinutes = 6 * 60; // 6 AM
    const timelineRangeMinutes = 16 * 60; // 16 hours (6 AM to 10 PM)

    const startMinutes = timelineStartMinutes + (leftPercent / 100) * timelineRangeMinutes;
    const endMinutes = timelineStartMinutes + (rightPercent / 100) * timelineRangeMinutes;

    const startHour = Math.floor(startMinutes / 60);
    const startMin = Math.round(startMinutes % 60);
    const endHour = Math.floor(endMinutes / 60);
    const endMin = Math.round(endMinutes % 60);

    const newStartTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    const newEndTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    const newDuration = Math.round((endMinutes - startMinutes));

    // Update session data
    session.start_time = newStartTime;
    session.end_time = newEndTime;
    session.duration = newDuration;

    // Update the display
    const timeDisplay = sessionElement.querySelector('.timeline-session-time');
    if (timeDisplay) {
      timeDisplay.textContent = `${newStartTime} - ${newEndTime}`;
    }

    // Save changes if using SessionManager
    if (window.sessionManager && !session.isHistorical) {
      // Update the session in SessionManager
      const dateString = this.currentDate.toDateString();
      if (window.sessionManager.sessions[dateString]) {
        const sessionIndex = window.sessionManager.sessions[dateString].findIndex(s => s.id === session.id);
        if (sessionIndex !== -1) {
          window.sessionManager.sessions[dateString][sessionIndex] = { ...session };
        }
      }
    }
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
            if (window.pomodoroTimer.currentMode === 'focus') {
              window.pomodoroTimer.resetTimer();
            } else {
              window.pomodoroTimer.undoLastSession();
            }
          }
          break;
        case 'skip':
          if (window.pomodoroTimer) {
            window.pomodoroTimer.completeSession();
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

// Session Management Functions
class SessionManager {
  constructor(navigationManager) {
    this.navManager = navigationManager;
    this.currentEditingSession = null;
    this.selectedDate = null;
    this.sessions = []; // Local session storage for now
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add session button
    const addSessionBtn = document.getElementById('add-session-btn');
    if (addSessionBtn) {
      addSessionBtn.addEventListener('click', () => this.openAddSessionModal());
    }

    // Modal controls
    const modalOverlay = document.getElementById('session-modal-overlay');
    const closeModalBtn = document.getElementById('close-session-modal');
    const cancelBtn = document.getElementById('cancel-session-btn');
    const sessionForm = document.getElementById('session-form');
    const sessionTypeSelect = document.getElementById('session-type');
    const deleteSessionBtn = document.getElementById('delete-session-btn');

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          this.closeModal();
        }
      });
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (sessionForm) {
      sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSession();
      });
    }

    if (sessionTypeSelect) {
      sessionTypeSelect.addEventListener('change', (e) => {
        this.toggleCustomDuration(e.target.value);
      });
    }

    if (deleteSessionBtn) {
      deleteSessionBtn.addEventListener('click', () => this.deleteCurrentSession());
    }

    // Keyboard shortcuts for modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });
  }

  openAddSessionModal(date = null) {
    this.selectedDate = date || this.navManager.currentDate || new Date();
    this.currentEditingSession = null;

    const modal = document.getElementById('session-modal-overlay');
    const modalTitle = document.getElementById('session-modal-title');
    const deleteBtn = document.getElementById('delete-session-btn');
    const saveBtn = document.getElementById('save-session-btn');

    modalTitle.textContent = 'Add Session';
    deleteBtn.style.display = 'none';
    saveBtn.textContent = 'Save Session';

    // Set default time to now
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('session-start-time').value = timeString;

    // Reset form
    document.getElementById('session-form').reset();
    document.getElementById('session-start-time').value = timeString;
    this.toggleCustomDuration('focus');

    modal.classList.add('show');
    document.getElementById('session-start-time').focus();
  }

  openEditSessionModal(session, date) {
    this.selectedDate = new Date(date);
    this.currentEditingSession = session;

    const modal = document.getElementById('session-modal-overlay');
    const modalTitle = document.getElementById('session-modal-title');
    const deleteBtn = document.getElementById('delete-session-btn');
    const saveBtn = document.getElementById('save-session-btn');

    modalTitle.textContent = 'Edit Session';
    deleteBtn.style.display = 'block';
    saveBtn.textContent = 'Update Session';

    // Populate form with session data
    document.getElementById('session-type').value = session.session_type;
    document.getElementById('session-duration').value = session.duration;
    document.getElementById('session-start-time').value = session.start_time;
    document.getElementById('session-notes').value = session.notes || '';

    this.toggleCustomDuration(session.session_type);

    modal.classList.add('show');
    document.getElementById('session-start-time').focus();
  }

  closeModal() {
    const modal = document.getElementById('session-modal-overlay');
    modal.classList.remove('show');
    this.currentEditingSession = null;
    this.selectedDate = null;
  }

  isModalOpen() {
    const modal = document.getElementById('session-modal-overlay');
    return modal && modal.classList.contains('show');
  }

  toggleCustomDuration(sessionType) {
    const customGroup = document.getElementById('custom-duration-group');
    const durationInput = document.getElementById('session-duration');

    if (sessionType === 'custom') {
      customGroup.style.display = 'block';
      durationInput.value = 25; // Default custom duration
      durationInput.focus();
    } else {
      customGroup.style.display = 'none';
      // Set duration based on session type
      switch (sessionType) {
        case 'focus':
          durationInput.value = 25;
          break;
        case 'break':
          durationInput.value = 5;
          break;
        case 'longBreak':
          durationInput.value = 20;
          break;
        default:
          durationInput.value = 25;
      }
    }
  }

  async saveSession() {
    const formData = new FormData(document.getElementById('session-form'));
    const sessionData = {
      id: this.currentEditingSession?.id || this.generateSessionId(),
      session_type: formData.get('type'),
      duration: parseInt(formData.get('duration')),
      start_time: formData.get('startTime'),
      end_time: this.calculateEndTime(formData.get('startTime'), parseInt(formData.get('duration'))),
      notes: formData.get('notes') || null,
      created_at: new Date().toISOString()
    };

    // Validate form
    if (!sessionData.start_time) {
      alert('Please enter a start time');
      return;
    }

    if (!sessionData.duration || sessionData.duration < 1) {
      alert('Please enter a valid duration');
      return;
    }

    try {
      if (this.currentEditingSession) {
        // Update existing session
        await this.updateSession(sessionData);
        this.showNotification('Session updated successfully', 'success');
      } else {
        // Add new session
        await this.addSession(sessionData);
        this.showNotification('Session added successfully', 'success');
      }

      this.closeModal();

      // Refresh the session list
      if (this.navManager) {
        await this.navManager.updateSelectedDayDetails(this.selectedDate);
        await this.navManager.updateFocusSummary();
        await this.navManager.updateWeeklySessionsChart();
      }

    } catch (error) {
      console.error('Error saving session:', error);
      this.showNotification('Failed to save session', 'error');
    }
  }

  async addSession(sessionData) {
    const dateString = this.selectedDate.toDateString();

    // For now, store locally (later we'll integrate with backend)
    if (!this.sessions[dateString]) {
      this.sessions[dateString] = [];
    }

    this.sessions[dateString].push(sessionData);

    // TODO: Call backend when available
    // await invoke('add_session', { date: dateString, session: sessionData });
  }

  async updateSession(sessionData) {
    const dateString = this.selectedDate.toDateString();

    // Update local storage
    if (this.sessions[dateString]) {
      const index = this.sessions[dateString].findIndex(s => s.id === sessionData.id);
      if (index !== -1) {
        this.sessions[dateString][index] = sessionData;
      }
    }

    // TODO: Call backend when available
    // await invoke('update_session', { date: dateString, sessionId: sessionData.id, updatedSession: sessionData });
  }

  async deleteCurrentSession() {
    if (!this.currentEditingSession) return;

    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const dateString = this.selectedDate.toDateString();

      // Remove from local storage
      if (this.sessions[dateString]) {
        this.sessions[dateString] = this.sessions[dateString].filter(s => s.id !== this.currentEditingSession.id);
      }

      // TODO: Call backend when available
      // await invoke('delete_session', { date: dateString, sessionId: this.currentEditingSession.id });

      this.closeModal();
      this.showNotification('Session deleted successfully', 'success');

      // Refresh the session list
      if (this.navManager) {
        await this.navManager.updateSelectedDayDetails(this.selectedDate);
        await this.navManager.updateFocusSummary();
        await this.navManager.updateWeeklySessionsChart();
      }

    } catch (error) {
      console.error('Error deleting session:', error);
      this.showNotification('Failed to delete session', 'error');
    }
  }

  getSessionsForDate(date) {
    const dateString = date.toDateString();
    return this.sessions[dateString] || [];
  }

  generateSessionId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  showNotification(message, type = 'info') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      max-width: 300px;
    `;

    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#4CAF50';
        break;
      case 'error':
        notification.style.backgroundColor = '#f44336';
        break;
      default:
        notification.style.backgroundColor = '#2196F3';
    }

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.style.opacity = '1', 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
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
    this.progressDots = document.getElementById('progress-dots');

    // Task management
    this.tasks = [];
    this.currentTask = '';

    // Keyboard shortcuts (will be updated from settings)
    this.customShortcuts = {
      start_stop: "CommandOrControl+Alt+Space",
      reset: "CommandOrControl+Alt+R", // Delete Session (focus) / Undo (break)
      skip: "CommandOrControl+Alt+S"   // Save Session
    };

    this.init();
  }

  async init() {
    this.updateDisplay();
    this.updateProgressDots();
    this.updateStopUndoButton(); // Initialize stop/undo button state
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

    this.skipBtn.addEventListener('click', () => this.completeSession());

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
          this.completeSession();
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

    // Reset session tracking
    this.sessionStartTime = null;
    this.currentSessionElapsedTime = 0;

    this.timeRemaining = this.durations[this.currentMode];
    this.updateDisplay();
    this.updateButtons();
    this.showNotificationPing('Session deleted ❌', 'warning');
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

    // Skip to next mode without counting as completed
    if (this.currentMode === 'focus') {
      // Skip focus session - go to break without incrementing completed pomodoros
      if ((this.completedPomodoros + 1) % 4 === 0) {
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
    this.updateProgress();
    this.updateButtons();

    // Show skip notification
    const messages = {
      focus: 'Focus session skipped. Time for a break! 😌',
      break: 'Break skipped. Ready to focus? 🍅',
      longBreak: 'Long break skipped. Time to get back to work! 🚀'
    };

    this.showNotificationPing(messages[this.currentMode] || 'Session skipped 📤', 'info');
  }

  async completeSession() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);

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

    // Update stop/undo button icon based on current mode
    this.updateStopUndoButton();

    // Update progress dots
    this.updateProgressDots();

    // Update tray icon
    this.updateTrayIcon();
  }

  // Update status icon based on current mode
  updateStatusIcon() {
    if (!this.statusIcon) return;

    // Define SVG paths for different modes
    const iconPaths = {
      focus: 'M11 2.53513C10.4117 2.19479 9.72857 2 9 2 6.79086 2 5 3.79086 5 6V7.77422C4.14895 8.11644 3.45143 8.64785 2.94126 9.34933 2.29239 10.2415 2 11.3347 2 12.5 2 14.0614 2.79529 15.4356 4 16.242V17.5C4 19.9853 6.01472 22 8.5 22 9.42507 22 10.285 21.7209 11 21.2422V17.5C11 16.167 10.67 15.3147 10.1402 14.7408 9.59743 14.1528 8.71622 13.7165 7.3356 13.4864L7.6644 11.5136C8.96602 11.7305 10.1058 12.1373 11 12.8271V2.53513ZM13 2.53513V12.8271C13.8942 12.1373 15.034 11.7305 16.3356 11.5136L16.6644 13.4864C15.2838 13.7165 14.4026 14.1528 13.8598 14.7408 13.33 15.3147 13 16.167 13 17.5V21.2422C13.715 21.7209 14.5749 22 15.5 22 17.9853 22 20 19.9853 20 17.5V16.242C21.2047 15.4356 22 14.0614 22 12.5 22 11.3347 21.7076 10.2415 21.0587 9.34933 20.5486 8.64785 19.8511 8.11644 19 7.77422V6C19 3.79086 17.2091 2 15 2 14.2714 2 13.5883 2.19479 13 2.53513Z',

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

  // Update stop/undo button icon based on current mode
  updateStopUndoButton() {
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

  // Undo the last completed session
  async undoLastSession() {
    if (this.completedPomodoros === 0) {
      this.showNotificationPing('No sessions to undo! 🤷‍♂️', 'warning');
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
    this.showNotificationPing('Last session undone! Back to focus mode 🔄', 'info');
  }

  // Progress dots update
  updateProgressDots() {
    const dots = this.progressDots.querySelectorAll('.dot');

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

  // Initialize Session Manager
  window.sessionManager = new SessionManager(window.navigationManager);

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
