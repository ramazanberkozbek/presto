// Navigation Manager for Sidebar
const { invoke } = window.__TAURI__.core;
import { TimeUtils } from '../utils/common-utils.js';

export class NavigationManager {
    constructor() {
        this.currentView = 'timer';
        this.initialized = false;
        this.currentTooltip = null; // Track current tooltip for proper cleanup
        this.tooltipTimeout = null; // Track timeout for debounced tooltip removal
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
        } else if (view === 'team') {
            // Team view will be handled by TeamManager
            if (window.teamManager) {
                await window.teamManager.init();
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
        return TimeUtils.getWeekStart(date);
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
        const totalFocusWeekEl = document.getElementById('total-focus-week');
        const totalFocusChangeEl = document.getElementById('total-focus-change');
        const avgFocusDayEl = document.getElementById('avg-focus-day');
        const avgFocusChangeEl = document.getElementById('avg-focus-change');
        const weeklySessionsEl = document.getElementById('weekly-sessions');
        const weeklySessionsChangeEl = document.getElementById('weekly-sessions-change');
        const weeklyFocusTimeEl = document.getElementById('weekly-focus-time');
        const weeklyFocusChangeEl = document.getElementById('weekly-focus-change');

        // Calculate weekly data and comparisons
        let avgFocus = 0;
        let weeklyFocusTime = 0;
        let weeklySessions = 0;
        let previousWeekAvgFocus = 0;
        let previousWeekFocusTime = 0;
        let previousWeeklySessions = 0;

        try {
            const history = await invoke('get_stats_history');
            const weekStart = this.getWeekStart(this.currentDate);
            const previousWeekStart = new Date(weekStart);
            previousWeekStart.setDate(weekStart.getDate() - 7);

            // Current week data
            let weekTotal = 0;
            let daysWithData = 0;

            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const dayData = history.find(h => h.date === date.toDateString());
                if (dayData) {
                    weekTotal += dayData.total_focus_time;
                    weeklyFocusTime += dayData.total_focus_time;
                    weeklySessions += dayData.completed_pomodoros;
                    if (dayData.total_focus_time > 0) {
                        daysWithData++;
                    }
                }
            }

            avgFocus = daysWithData > 0 ? weekTotal / daysWithData : 0;

            // Previous week data
            let previousWeekTotal = 0;
            let previousDaysWithData = 0;

            for (let i = 0; i < 7; i++) {
                const date = new Date(previousWeekStart);
                date.setDate(previousWeekStart.getDate() + i);
                const dayData = history.find(h => h.date === date.toDateString());
                if (dayData) {
                    previousWeekTotal += dayData.total_focus_time;
                    previousWeekFocusTime += dayData.total_focus_time;
                    previousWeeklySessions += dayData.completed_pomodoros;
                    if (dayData.total_focus_time > 0) {
                        previousDaysWithData++;
                    }
                }
            }

            previousWeekAvgFocus = previousDaysWithData > 0 ? previousWeekTotal / previousDaysWithData : 0;

        } catch (error) {
            console.error('Failed to load weekly data:', error);
        }

        // Calculate percentage changes
        const weeklyFocusChange = this.calculatePercentageChange(weeklyFocusTime, previousWeekFocusTime);
        const avgFocusChange = this.calculatePercentageChange(avgFocus, previousWeekAvgFocus);
        const weeklySessionsChange = this.calculatePercentageChange(weeklySessions, previousWeeklySessions);

        // Update UI
        totalFocusWeekEl.textContent = TimeUtils.formatTime(weeklyFocusTime);
        this.updateChangeElement(totalFocusChangeEl, weeklyFocusChange);

        avgFocusDayEl.textContent = TimeUtils.formatTime(avgFocus);
        this.updateChangeElement(avgFocusChangeEl, avgFocusChange);

        weeklySessionsEl.textContent = weeklySessions.toString();
        this.updateChangeElement(weeklySessionsChangeEl, weeklySessionsChange);

        weeklyFocusTimeEl.textContent = TimeUtils.formatTime(weeklyFocusTime);
        this.updateChangeElement(weeklyFocusChangeEl, weeklyFocusChange);
    }

    calculatePercentageChange(current, previous) {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return Math.round(((current - previous) / previous) * 100);
    }

    updateChangeElement(element, change) {
        element.classList.remove('positive', 'negative', 'neutral');
        
        const icon = element.querySelector('i');
        const span = element.querySelector('span');
        
        if (change > 0) {
            span.textContent = `+${change}%`;
            icon.className = 'ri-arrow-up-line';
            element.classList.add('positive');
        } else if (change < 0) {
            span.textContent = `${change}%`;
            icon.className = 'ri-arrow-down-line';
            element.classList.add('negative');
        } else {
            span.textContent = '0%';
            icon.className = 'ri-subtract-line';
            element.classList.add('neutral');
        }
    }

    async updateDailyChart() {
        const dailyChart = document.getElementById('daily-chart');
        if (!dailyChart) return;
        
        dailyChart.innerHTML = '';

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const maxHeight = 140; // Increased height to use more of available space
        
        try {
            // Get today's sessions to calculate hourly data
            const todaysSessions = window.sessionManager 
                ? window.sessionManager.getSessionsForDate(new Date())
                : [];
            
            // Also try to get current timer session data if available
            let timerSessionData = null;
            if (window.pomodoroTimer) {
                const today = new Date().toDateString();
                try {
                    // Check if there are completed pomodoros from the timer today
                    const currentSession = await invoke('load_session_data');
                    if (currentSession && currentSession.date === today && currentSession.completed_pomodoros > 0) {
                        timerSessionData = currentSession;
                    }
                } catch (error) {
                    console.log('No timer session data available:', error);
                }
            }
            
            // Initialize hourly data
            const hourlyData = hours.map(hour => ({
                hour,
                focusMinutes: 0,
                breakMinutes: 0
            }));

            // Process today's sessions
            todaysSessions.forEach(session => {
                const [startHour] = session.start_time.split(':').map(Number);
                const duration = session.duration || 0;
                
                if (session.session_type === 'focus') {
                    hourlyData[startHour].focusMinutes += duration;
                } else if (session.session_type === 'break' || session.session_type === 'longBreak') {
                    hourlyData[startHour].breakMinutes += duration;
                }
            });

            // If we have timer session data but no manual sessions, distribute timer sessions across the current hour
            if (timerSessionData && todaysSessions.length === 0 && timerSessionData.completed_pomodoros > 0) {
                const currentHour = new Date().getHours();
                const totalTimerFocusMinutes = Math.floor(timerSessionData.total_focus_time / 60);
                
                // Distribute the focus time to the current hour (as a simple approximation)
                if (totalTimerFocusMinutes > 0) {
                    hourlyData[currentHour].focusMinutes += totalTimerFocusMinutes;
                }
            }

            // Find max total minutes for scaling
            const maxTotalMinutes = Math.max(
                ...hourlyData.map(data => data.focusMinutes + data.breakMinutes),
                60 // Minimum scale of 1 hour
            );

            hours.forEach(hour => {
                const data = hourlyData[hour];
                const totalMinutes = data.focusMinutes + data.breakMinutes;
                
                const hourBar = document.createElement('div');
                hourBar.className = 'hour-bar';

                // Calculate height based on total activity in this hour
                const height = totalMinutes > 0 
                    ? Math.max((totalMinutes / maxTotalMinutes) * maxHeight, 8)
                    : 8; // Minimum height for visibility

                hourBar.style.height = `${height}px`;

                // Create segments for focus and break time if there's data
                if (totalMinutes > 0) {
                    if (data.focusMinutes > 0) {
                        const focusSegment = document.createElement('div');
                        focusSegment.className = 'hour-bar-focus';
                        focusSegment.style.height = `${(data.focusMinutes / totalMinutes) * 100}%`;
                        hourBar.appendChild(focusSegment);
                    }
                    
                    if (data.breakMinutes > 0) {
                        const breakSegment = document.createElement('div');
                        breakSegment.className = 'hour-bar-break';
                        breakSegment.style.height = `${(data.breakMinutes / totalMinutes) * 100}%`;
                        hourBar.appendChild(breakSegment);
                    }
                } else {
                    // Empty hour - show subtle background
                    hourBar.classList.add('hour-bar-empty');
                }

                // Hour label at bottom
                const hourLabel = document.createElement('div');
                hourLabel.className = 'hour-label';
                hourLabel.textContent = hour.toString().padStart(2, '0');
                hourBar.appendChild(hourLabel);

                // Enhanced tooltip with session details
                const focusText = data.focusMinutes > 0 ? `${data.focusMinutes}m focus` : '';
                const breakText = data.breakMinutes > 0 ? `${data.breakMinutes}m break` : '';
                const activityText = [focusText, breakText].filter(text => text).join(', ') || 'No activity';
                
                // Use custom tooltip instead of native title
                hourBar.dataset.tooltip = `${hour}:00 - ${activityText}`;
                
                // Add hover event listeners for custom tooltip
                this.addTooltipEvents(hourBar);

                // Add data attributes for potential future interactions
                hourBar.dataset.hour = hour;
                hourBar.dataset.focusMinutes = data.focusMinutes;
                hourBar.dataset.breakMinutes = data.breakMinutes;

                dailyChart.appendChild(hourBar);
            });

            // Add cleanup event for when mouse leaves the entire chart
            dailyChart.addEventListener('mouseleave', () => {
                this.removeTooltip();
            });

        } catch (error) {
            console.error('Failed to load daily chart data:', error);
            
            // Show fallback empty state
            hours.forEach(hour => {
                const hourBar = document.createElement('div');
                hourBar.className = 'hour-bar hour-bar-empty';
                hourBar.style.height = '8px';
                
                const hourLabel = document.createElement('div');
                hourLabel.className = 'hour-label';
                hourLabel.textContent = hour.toString().padStart(2, '0');
                hourBar.appendChild(hourLabel);
                
                hourBar.dataset.tooltip = `${hour}:00 - No data available`;
                this.addTooltipEvents(hourBar);
                dailyChart.appendChild(hourBar);
            });
        }
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
                avgLine.style.backgroundColor = '#6b7280'; // Changed to gray
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
                avgLabel.style.color = '#6b7280'; // Changed to gray
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
                    dayBar.style.borderTop = '2px solid #6b7280'; // Changed to gray
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
                
                // Use custom tooltip instead of native title
                dayBar.dataset.tooltip = tooltipText;
                
                // Add hover event listeners for custom tooltip
                this.addTooltipEvents(dayBar);

                weeklyChart.appendChild(dayBar);
            });

            // Add cleanup event for when mouse leaves the entire chart
            weeklyChart.addEventListener('mouseleave', () => {
                this.removeTooltip();
            });

        } catch (error) {
            console.error('Failed to load weekly chart data:', error);
            // Show empty chart on error
            days.forEach((day, index) => {
                const dayBar = document.createElement('div');
                dayBar.className = 'week-day-bar';
                dayBar.style.height = '8px';
                
                // Use custom tooltip instead of native title
                dayBar.dataset.tooltip = `${day}: No data available`;
                
                // Add hover event listeners for custom tooltip
                this.addTooltipEvents(dayBar);
                
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
                    // Create dots for completed pomodoros
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
        return TimeUtils.isSameDay(date1, date2);
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
        return TimeUtils.formatTime(seconds);
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

        // Check if this session is from today
        const isToday = this.isSameDay(date, new Date());
        
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

        // Session content - different display for today's sessions
        const sessionType = this.getSessionTypeDisplay(session.session_type);
        
        if (isToday && !session.isHistorical) {
            // For today's sessions: minimal display, information only in tooltip
            sessionElement.classList.add('today-session');
            sessionElement.innerHTML = `
        <div class="session-handle left"></div>
        <div class="timeline-session-content-minimal"></div>
        <div class="session-handle right"></div>
      `;
            
            // Set tooltip with full information
            const notes = session.notes ? ` - ${session.notes}` : '';
            sessionElement.title = `${sessionType}: ${session.start_time} - ${session.end_time} (${session.duration}m)${notes}`;
        } else {
            // For other days or historical sessions: show full content
            sessionElement.innerHTML = `
        <div class="session-handle left"></div>
        <div class="timeline-session-content">
          <span class="timeline-session-type">${sessionType}</span>
          <span class="timeline-session-time">${session.start_time} - ${session.end_time}</span>
        </div>
        <div class="session-handle right"></div>
      `;
        }

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

        // Update tooltip for today's sessions
        if (sessionElement.classList.contains('today-session')) {
            const sessionType = this.getSessionTypeDisplay(session.session_type);
            const notes = session.notes ? ` - ${session.notes}` : '';
            sessionElement.title = `${sessionType}: ${newStartTime} - ${newEndTime} (${newDuration}m)${notes}`;
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

    addTooltipEvents(element) {
        element.addEventListener('mouseenter', (e) => {
            const tooltipText = e.target.dataset.tooltip;
            if (!tooltipText) return;

            // Clear any pending tooltip removal
            if (this.tooltipTimeout) {
                clearTimeout(this.tooltipTimeout);
                this.tooltipTimeout = null;
            }

            // Remove any existing tooltip first
            this.removeTooltip();

            // Create tooltip element
            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'custom-tooltip';
            tooltipElement.textContent = tooltipText;
            
            // Position tooltip above the element
            const rect = e.target.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            tooltipElement.style.position = 'absolute';
            tooltipElement.style.left = `${rect.left + scrollLeft + rect.width / 2}px`;
            tooltipElement.style.top = `${rect.top + scrollTop - 10}px`;
            tooltipElement.style.transform = 'translateX(-50%) translateY(-100%)';
            tooltipElement.style.backgroundColor = '#1f2937'; // Changed to flat dark gray
            tooltipElement.style.color = 'white';
            tooltipElement.style.padding = '8px 12px';
            tooltipElement.style.borderRadius = '6px';
            tooltipElement.style.fontSize = '0.75rem';
            tooltipElement.style.fontWeight = '500';
            tooltipElement.style.whiteSpace = 'nowrap';
            tooltipElement.style.zIndex = '10000';
            tooltipElement.style.pointerEvents = 'none';
            tooltipElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            tooltipElement.style.opacity = '0';
            tooltipElement.style.transition = 'opacity 0.2s ease';
            
            // Add arrow
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.top = '100%';
            arrow.style.left = '50%';
            arrow.style.transform = 'translateX(-50%)';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderLeft = '5px solid transparent';
            arrow.style.borderRight = '5px solid transparent';
            arrow.style.borderTop = '5px solid #1f2937'; // Changed to match flat background
            tooltipElement.appendChild(arrow);

            document.body.appendChild(tooltipElement);
            
            // Store reference to current tooltip for cleanup
            this.currentTooltip = tooltipElement;
            
            // Fade in
            requestAnimationFrame(() => {
                if (tooltipElement.parentNode) {
                    tooltipElement.style.opacity = '1';
                }
            });
        });

        element.addEventListener('mouseleave', () => {
            // Add slight delay to prevent flicker when moving between adjacent elements
            this.tooltipTimeout = setTimeout(() => {
                this.removeTooltip();
            }, 50);
        });
    }

    removeTooltip() {
        // Clear any pending timeout
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        // Use stored reference first, then fallback to querySelector
        if (this.currentTooltip && this.currentTooltip.parentNode) {
            this.currentTooltip.style.opacity = '0';
            setTimeout(() => {
                if (this.currentTooltip && this.currentTooltip.parentNode) {
                    this.currentTooltip.parentNode.removeChild(this.currentTooltip);
                }
                this.currentTooltip = null;
            }, 200);
            return;
        }

        // Fallback: remove any remaining tooltips
        const existingTooltips = document.querySelectorAll('.custom-tooltip');
        existingTooltips.forEach(tooltip => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        });
        
        this.currentTooltip = null;
    }

    // ...existing methods...
}
