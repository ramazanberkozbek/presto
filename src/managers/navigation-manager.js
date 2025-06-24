// Navigation Manager for Sidebar
import { TimeUtils } from '../utils/common-utils.js';

export class NavigationManager {
    constructor() {
        this.currentView = 'timer';
        this.initialized = false;
        this.currentTooltip = null; // Track current tooltip for proper cleanup
        this.tooltipTimeout = null; // Track timeout for debounced tooltip removal
        
        // Apply timer-active class on initial load since default view is timer
        document.body.classList.add('timer-active');
        document.documentElement.classList.add('timer-active');
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
        
        // Initialize sessions table
        await this.initSessionsTable();
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

        // Handle background based on view
        const body = document.body;
        const html = document.documentElement;
        if (view === 'timer') {
            // Timer view - add timer-active class to prevent scrolling and reapply timer background
            body.classList.add('timer-active');
            html.classList.add('timer-active');
            if (window.pomodoroTimer) {
                window.pomodoroTimer.updateDisplay();
            }
        } else {
            // Non-timer views - remove timer-active class to allow scrolling and remove timer background classes
            body.classList.remove('timer-active', 'focus', 'break', 'longBreak');
            html.classList.remove('timer-active');
        }

        // Initialize view-specific content
        if (view === 'calendar') {
            await this.updateCalendar();
            this.updateWeekDisplay();
            await this.updateFocusSummary();
            await this.updateWeeklySessionsChart();
            this.updateDailyChart();
            await this.updateSelectedDayDetails();
            await this.initSessionsTable(); // Initialize sessions table when viewing calendar
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
            const weekStart = this.getWeekStart(this.currentDate);
            const previousWeekStart = new Date(weekStart);
            previousWeekStart.setDate(weekStart.getDate() - 7);

            // Current week data
            let weekTotal = 0;
            let daysWithData = 0;

            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                
                let dayTotalTime = 0;
                let daySessions = 0;
                
                // Get sessions from SessionManager for this date
                if (window.sessionManager) {
                    const sessions = window.sessionManager.getSessionsForDate(date);
                    const focusSessions = sessions.filter(s => s.session_type === 'focus' || s.session_type === 'custom');
                    
                    // Calculate total time in seconds from session durations
                    dayTotalTime = focusSessions.reduce((total, session) => total + ((session.duration || 0) * 60), 0);
                    daySessions = focusSessions.length;
                }
                
                if (dayTotalTime > 0) {
                    weekTotal += dayTotalTime;
                    weeklyFocusTime += dayTotalTime;
                    weeklySessions += daySessions;
                    daysWithData++;
                }
            }

            avgFocus = daysWithData > 0 ? weekTotal / daysWithData : 0;

            // Previous week data
            let previousWeekTotal = 0;
            let previousDaysWithData = 0;

            for (let i = 0; i < 7; i++) {
                const date = new Date(previousWeekStart);
                date.setDate(previousWeekStart.getDate() + i);
                
                let dayTotalTime = 0;
                let daySessions = 0;
                
                // Get sessions from SessionManager for this date
                if (window.sessionManager) {
                    const sessions = window.sessionManager.getSessionsForDate(date);
                    const focusSessions = sessions.filter(s => s.session_type === 'focus' || s.session_type === 'custom');
                    
                    // Calculate total time in seconds from session durations
                    dayTotalTime = focusSessions.reduce((total, session) => total + ((session.duration || 0) * 60), 0);
                    daySessions = focusSessions.length;
                }
                
                if (dayTotalTime > 0) {
                    previousWeekTotal += dayTotalTime;
                    previousWeekFocusTime += dayTotalTime;
                    previousWeeklySessions += daySessions;
                    previousDaysWithData++;
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
            // Get today's sessions from SessionManager (now includes timer sessions)
            const todaysSessions = window.sessionManager
                ? window.sessionManager.getSessionsForDate(new Date())
                : [];

            // Initialize hourly data
            const hourlyData = hours.map(hour => ({
                hour,
                focusMinutes: 0,
                breakMinutes: 0
            }));

            // Process all sessions with unified logic
            todaysSessions.forEach(session => {
                // Only include focus and custom sessions, exclude break sessions
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    const [startHour, startMinute] = session.start_time.split(':').map(Number);
                    const [endHour, endMinute] = session.end_time.split(':').map(Number);
                    
                    const startTotalMinutes = startHour * 60 + startMinute;
                    const endTotalMinutes = endHour * 60 + endMinute;
                    
                    // Distribute session time across all affected hours
                    for (let hour = startHour; hour <= endHour; hour++) {
                        const hourStartMinutes = hour * 60;
                        const hourEndMinutes = (hour + 1) * 60;
                        
                        const sessionStartInHour = Math.max(startTotalMinutes, hourStartMinutes);
                        const sessionEndInHour = Math.min(endTotalMinutes, hourEndMinutes);
                        
                        if (sessionEndInHour > sessionStartInHour) {
                            const minutesInThisHour = sessionEndInHour - sessionStartInHour;
                            hourlyData[hour].focusMinutes += minutesInThisHour;
                        }
                    }
                }
                // Skip break and longBreak sessions from chart display
            });

            // Find max total minutes for scaling (only focus minutes now)
            const maxTotalMinutes = Math.max(
                ...hourlyData.map(data => data.focusMinutes),
                60 // Minimum scale of 1 hour
            );

            hours.forEach(hour => {
                const data = hourlyData[hour];
                const totalMinutes = data.focusMinutes; // Only focus minutes now

                const hourBar = document.createElement('div');
                hourBar.className = 'hour-bar';

                // Calculate height based on focus activity in this hour
                const height = totalMinutes > 0
                    ? Math.max((totalMinutes / maxTotalMinutes) * maxHeight, 8)
                    : 8; // Minimum height for visibility

                hourBar.style.height = `${height}px`;

                // Create focus segment if there's data
                if (totalMinutes > 0) {
                    const focusSegment = document.createElement('div');
                    focusSegment.className = 'hour-bar-focus';
                    focusSegment.style.height = '100%'; // Full height since only focus
                    hourBar.appendChild(focusSegment);
                } else {
                    // Empty hour - show subtle background
                    hourBar.classList.add('hour-bar-empty');
                }

                // Hour label at bottom
                const hourLabel = document.createElement('div');
                hourLabel.className = 'hour-label';
                hourLabel.textContent = hour.toString().padStart(2, '0');
                hourBar.appendChild(hourLabel);

                // Enhanced tooltip with session details (focus only)
                const focusText = data.focusMinutes > 0 ? `${data.focusMinutes}m focus` : '';
                const activityText = focusText || 'No activity';

                // Use custom tooltip instead of native title
                hourBar.dataset.tooltip = `${hour}:00 - ${activityText}`;

                // Add hover event listeners for custom tooltip
                this.addTooltipEvents(hourBar);

                // Add data attributes for potential future interactions
                hourBar.dataset.hour = hour;
                hourBar.dataset.focusMinutes = data.focusMinutes;

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

                let sessionsMinutes = 0;
                let sessions = 0;

                // Get sessions from SessionManager for this date
                if (window.sessionManager) {
                    const allSessions = window.sessionManager.getSessionsForDate(date);
                    const focusSessions = allSessions.filter(s => s.session_type === 'focus' || s.session_type === 'custom');
                    
                    // Calculate total minutes from session durations
                    sessionsMinutes = focusSessions.reduce((total, session) => total + (session.duration || 0), 0);
                    sessions = focusSessions.length;
                }

                // Only consider days that have completely passed (exclude today) for average calculation
                const isCompletePastDay = date.toDateString() !== today.toDateString() && date < today;
                if (isCompletePastDay && sessions > 0) {
                    totalSessionTime += sessionsMinutes;
                    totalSessions += sessions;
                    daysConsidered++;
                }

                weekData.push({
                    day,
                    date,
                    sessionsMinutes,
                    sessions,
                    isPast: date <= today
                });

                // Track maximum for proportional scaling
                if (sessionsMinutes > maxSessionsMinutes) {
                    maxSessionsMinutes = sessionsMinutes;
                }
            });

            // Calculate average daily session time (include all days with data, including today)
            let avgSessionTime = 0;
            let totalDailyTime = 0;
            let daysWithSessions = 0;

            weekData.forEach(({ sessionsMinutes }) => {
                if (sessionsMinutes > 0) {
                    totalDailyTime += sessionsMinutes;
                    daysWithSessions++;
                }
            });

            avgSessionTime = daysWithSessions > 0 ? totalDailyTime / daysWithSessions : 0;

            // Use a minimum baseline for maxSessionsMinutes to avoid tiny bars
            const scalingMax = Math.max(maxSessionsMinutes, Math.max(avgSessionTime, 60)); // Include average in scaling

            // Add average session time line if we have data
            if (avgSessionTime > 0 && daysWithSessions > 0) {
                const avgLine = document.createElement('div');
                avgLine.className = 'week-average-line';

                // Calculate position of average line
                const avgLineHeight = (avgSessionTime / scalingMax) * maxHeight;
                avgLine.style.bottom = `${avgLineHeight}px`;
                avgLine.style.left = '0';
                avgLine.style.right = '0';
                avgLine.style.position = 'absolute';
                avgLine.style.height = '1px'; // Reduced thickness for dashed line
                avgLine.style.backgroundColor = 'transparent'; // No solid background
                avgLine.style.borderTop = '1px dashed #d1d5db'; // Light gray dashed line
                avgLine.style.zIndex = '10';
                avgLine.style.opacity = '0.6'; // Semi-transparent

                // Add label for average
                const avgLabel = document.createElement('div');
                avgLabel.className = 'week-average-label';
                avgLabel.textContent = `Avg: ${Math.round(avgSessionTime)}m`;
                avgLabel.style.position = 'absolute';
                avgLabel.style.right = '5px';
                avgLabel.style.top = '-18px';
                avgLabel.style.fontSize = '10px';
                avgLabel.style.color = '#9ca3af'; // Light gray to match dashed line
                avgLabel.style.fontWeight = '500'; // Slightly lighter weight
                avgLabel.style.background = 'white';
                avgLabel.style.padding = '1px 4px';
                avgLabel.style.borderRadius = '3px';
                avgLabel.style.whiteSpace = 'nowrap';
                avgLabel.style.opacity = '0.8'; // Semi-transparent like the line

                avgLine.appendChild(avgLabel);

                // Set relative positioning on chart to contain the absolute line
                weeklyChart.style.position = 'relative';
                weeklyChart.appendChild(avgLine);
            }

            // Second pass: create the bars with proportional scaling
            weekData.forEach(({ day, sessionsMinutes, sessions, isPast }) => {
                const dayBar = document.createElement('div');
                dayBar.className = 'week-day-bar';

                // Scale height proportionally to the week's maximum value
                const height = sessionsMinutes > 0
                    ? Math.max((sessionsMinutes / scalingMax) * maxHeight, 8)
                    : 8;

                dayBar.style.height = `${height}px`;

                // Add visual indicator if this day was used in average calculation
                if (isPast && sessions > 0) {
                    dayBar.style.borderTop = '1px solid #d1d5db'; // Light gray to match dashed line
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

        // Reset timeline track height
        timelineTrack.style.height = '50px';

        try {
            // Get all sessions from SessionManager (now includes timer sessions automatically)
            let allSessions = [];
            if (window.sessionManager) {
                allSessions = window.sessionManager.getSessionsForDate(date);
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

            // Filter out break sessions from timeline display
            const visibleSessions = allSessions.filter(session => 
                session.session_type !== 'break' && session.session_type !== 'longBreak'
            );

            // Create timeline session blocks (excluding break sessions)
            visibleSessions.forEach(session => {
                this.createTimelineSession(session, date, timelineTrack, visibleSessions);
            });

            // Calculate and set timeline height after all sessions are added
            this.updateTimelineHeight(timelineTrack, visibleSessions.length);

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

            // Add session dots based on SessionManager data
            const dots = document.createElement('div');
            dots.className = 'calendar-day-dots';

            // Get sessions from SessionManager for this date
            if (window.sessionManager) {
                const sessions = window.sessionManager.getSessionsForDate(dayDate);
                const focusSessions = sessions.filter(s => s.session_type === 'focus' || s.session_type === 'custom');
                
                if (focusSessions.length > 0) {
                    dayEl.classList.add('has-sessions');
                    // Create dots for completed focus sessions
                    const numDots = Math.min(focusSessions.length, 5); // Max 5 dots
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

    updateTimelineHeight(timelineTrack, totalSessions) {
        const rowHeight = 20; // Spacing between rows
        const sessionHeight = 15; // Height of each session
        const topPadding = 10; // Top padding
        const bottomPadding = 10; // Bottom padding
        const minHeight = 60; // Minimum height even with no sessions
        
        if (totalSessions === 0) {
            timelineTrack.style.height = `${minHeight}px`;
        } else {
            // Calculate: top padding + (all session heights) + (spacing between sessions) + bottom padding
            const totalSessionHeights = totalSessions * sessionHeight;
            const totalSpacing = (totalSessions - 1) * rowHeight;
            const requiredHeight = topPadding + totalSessionHeights + totalSpacing + bottomPadding;
            console.log(`Timeline height calculation: ${topPadding} + ${totalSessionHeights} + ${totalSpacing} + ${bottomPadding} = ${requiredHeight}px for ${totalSessions} sessions`);
            timelineTrack.style.height = `${requiredHeight}px`;
        }
        
        // Add vertical grid lines
        this.addTimelineGridLines(timelineTrack);
    }

    addTimelineGridLines(timelineTrack) {
        // Remove existing grid lines
        const existingLines = timelineTrack.querySelectorAll('.timeline-grid-line');
        existingLines.forEach(line => line.remove());

        // Add grid lines for major hours: 0, 4, 8, 12, 16, 20
        const majorHours = [0, 4, 8, 12, 16, 20];
        const timelineStartHour = 0;
        const timelineRangeHours = 24;

        majorHours.forEach(hour => {
            const line = document.createElement('div');
            line.className = 'timeline-grid-line';
            
            // Calculate position percentage
            const hoursFromStart = hour - timelineStartHour;
            const percentage = (hoursFromStart / timelineRangeHours) * 100;
            line.style.left = `${percentage}%`;
            
            timelineTrack.appendChild(line);
        });
    }

    setupTimelineHours(timelineHours) {
        timelineHours.innerHTML = '';

        // Show major hours every 4 hours: 0, 4, 8, 12, 16, 20
        const majorHours = [0, 4, 8, 12, 16, 20];
        const timelineStartHour = 0; // 12 AM (midnight)
        const timelineRangeHours = 24; // Full day = 24 hours

        majorHours.forEach(hour => {
            const hourElement = document.createElement('div');
            hourElement.className = 'timeline-hour';
            hourElement.textContent = `${hour.toString().padStart(2, '0')}:00`;
            
            // Calculate correct position percentage
            const hoursFromStart = hour - timelineStartHour;
            const percentage = (hoursFromStart / timelineRangeHours) * 100;
            hourElement.style.left = `${percentage}%`;
            
            timelineHours.appendChild(hourElement);
        });
    }

    createTimelineSession(session, date, timelineTrack, allSessions = []) {
        const sessionElement = document.createElement('div');
        sessionElement.className = `timeline-session ${session.session_type}`;
        sessionElement.dataset.sessionId = session.id;

        // Check if this session is from today
        const isToday = this.isSameDay(date, new Date());

        // Parse start and end times
        const [startHour, startMinute] = session.start_time.split(':').map(Number);
        const [endHour, endMinute] = session.end_time.split(':').map(Number);

        // Calculate position and width (00:00 = 0%, 23:59 = 100%)
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;
        const timelineStartMinutes = 0; // 00:00 (midnight)
        const timelineEndMinutes = 24 * 60; // 24:00 (next midnight)
        const timelineRangeMinutes = timelineEndMinutes - timelineStartMinutes;

        const leftPercent = Math.max(0, ((startTimeInMinutes - timelineStartMinutes) / timelineRangeMinutes) * 100);
        const rightPercent = Math.min(100, ((endTimeInMinutes - timelineStartMinutes) / timelineRangeMinutes) * 100);
        const widthPercent = rightPercent - leftPercent;

        sessionElement.style.left = `${leftPercent}%`;
        sessionElement.style.width = `${widthPercent}%`;

        // Session content - different display for today's sessions
        const sessionType = this.getSessionTypeDisplay(session.session_type);

        if (isToday) {
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
            // For other days: show full content
            sessionElement.innerHTML = `
        <div class="session-handle left"></div>
        <div class="timeline-session-content">
          <span class="timeline-session-type">${sessionType}</span>
          <span class="timeline-session-time">${session.start_time} - ${session.end_time}</span>
        </div>
        <div class="session-handle right"></div>
      `;
        }

        // Add event listeners for all sessions (including historical ones)
        this.addTimelineSessionEventListeners(sessionElement, session, date);

        // Place sessions in their own rows
        const offset = this.calculateSessionOffset(session, allSessions);
        sessionElement.style.transform = `translateY(${offset}px)`;
        if (offset > 0) {
            sessionElement.classList.add('session-stacked');
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
            // Don't start drag if clicking on resize handles
            if (e.target.classList.contains('session-handle') || 
                e.target.closest('.session-handle')) return;
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

        // Hover tooltip
        let hoverTooltip = null;
        
        sessionElement.addEventListener('mouseenter', (e) => {
            // Don't show hover tooltip if dragging or resizing (they have their own tooltips)
            if (sessionElement.classList.contains('dragging') || sessionElement.classList.contains('resizing')) return;
            
            hoverTooltip = this.createSessionHoverTooltip(session);
            document.body.appendChild(hoverTooltip);
            this.updateHoverTooltip(hoverTooltip, e);
        });

        sessionElement.addEventListener('mousemove', (e) => {
            if (hoverTooltip && !sessionElement.classList.contains('dragging') && !sessionElement.classList.contains('resizing')) {
                this.updateHoverTooltip(hoverTooltip, e);
            }
        });

        sessionElement.addEventListener('mouseleave', () => {
            if (hoverTooltip && hoverTooltip.parentNode) {
                hoverTooltip.parentNode.removeChild(hoverTooltip);
                hoverTooltip = null;
            }
        });
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
      <div class="context-menu-item danger delete-item">Delete</div>
    `;

        // Add event listeners
        contextMenu.querySelector('.edit-item').addEventListener('click', () => {
            if (window.sessionManager) {
                window.sessionManager.openEditSessionModal(session, date);
            }
            contextMenu.remove();
        });

        const deleteItem = contextMenu.querySelector('.delete-item');
        if (deleteItem) {
            deleteItem.addEventListener('click', () => {
                if (window.sessionManager) {
                    window.sessionManager.currentEditingSession = session;
                    window.sessionManager.selectedDate = date;
                    window.sessionManager.deleteCurrentSession();
                }
                contextMenu.remove();
            });
        }

        document.body.appendChild(contextMenu);
    }

    startSessionDrag(e, sessionElement, session) {
        e.preventDefault();
        sessionElement.classList.add('dragging');
        
        // Remove any existing hover tooltip
        const existingHoverTooltip = document.querySelector('.session-hover-tooltip');
        if (existingHoverTooltip && existingHoverTooltip.parentNode) {
            existingHoverTooltip.parentNode.removeChild(existingHoverTooltip);
        }

        const timeline = document.getElementById('timeline-track');
        const timelineRect = timeline.getBoundingClientRect();
        
        // Calculate initial mouse position relative to timeline
        const initialMouseX = e.clientX - timelineRect.left;
        const currentLeft = parseFloat(sessionElement.style.left) || 0;
        const currentLeftPx = (currentLeft / 100) * timelineRect.width;
        
        // Calculate offset within the session element
        const offsetX = initialMouseX - currentLeftPx;

        // Create drag time tooltip
        const dragTooltip = this.createDragTimeTooltip();
        document.body.appendChild(dragTooltip);

        const handleMouseMove = (e) => {
            // Calculate the new position maintaining the original click offset
            const x = e.clientX - timelineRect.left - offsetX;
            const sessionWidth = parseFloat(sessionElement.style.width) || 0;
            const maxLeft = 100 - sessionWidth; // Prevent session from going beyond timeline
            const percentage = Math.max(0, Math.min(maxLeft, (x / timelineRect.width) * 100));
            sessionElement.style.left = `${percentage}%`;
            
            // Update drag tooltip with current time
            this.updateDragTooltip(dragTooltip, e, percentage, session);
        };

        const handleMouseUp = () => {
            sessionElement.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // Remove drag tooltip
            if (dragTooltip && dragTooltip.parentNode) {
                dragTooltip.parentNode.removeChild(dragTooltip);
            }

            // Update session time based on new position
            this.updateSessionTimeFromPosition(sessionElement, session);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    startSessionResize(e, sessionElement, session, side) {
        e.preventDefault();
        sessionElement.classList.add('resizing');
        
        // Remove any existing hover tooltip
        const existingHoverTooltip = document.querySelector('.session-hover-tooltip');
        if (existingHoverTooltip && existingHoverTooltip.parentNode) {
            existingHoverTooltip.parentNode.removeChild(existingHoverTooltip);
        }

        const timeline = document.getElementById('timeline-track');
        const timelineRect = timeline.getBoundingClientRect();

        // Create resize time tooltip
        const resizeTooltip = this.createDragTimeTooltip();
        document.body.appendChild(resizeTooltip);

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
            
            // Update tooltip with current time range
            this.updateResizeTooltip(resizeTooltip, e, sessionElement);
        };

        const handleMouseUp = () => {
            sessionElement.classList.remove('resizing');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // Remove tooltip
            if (resizeTooltip && resizeTooltip.parentNode) {
                resizeTooltip.parentNode.removeChild(resizeTooltip);
            }

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

        // Convert percentages back to time (00:00 to 23:59 range)
        const timelineStartMinutes = 0; // 00:00 (midnight)
        const timelineRangeMinutes = 24 * 60; // 24 hours (full day)

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

        // Save changes using SessionManager
        if (window.sessionManager) {
            // Set the selected date for SessionManager
            window.sessionManager.selectedDate = this.currentDate;
            
            // Use the proper updateSession method to ensure persistence
            window.sessionManager.updateSession(session);
        }
    }

    generateSessionId() {
        return Date.now().toString() + Math.random().toString(36).substring(2, 11);
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

    createDragTimeTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'drag-time-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: var(--shared-text);
            color: var(--card-bg);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            white-space: nowrap;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 12px var(--shared-border);
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        return tooltip;
    }

    updateDragTooltip(tooltip, mouseEvent, percentage, session) {
        // Calculate time from percentage
        const timelineStartMinutes = 0; // 00:00 (midnight)
        const timelineRangeMinutes = 24 * 60; // 24 hours (full day)
        
        const startMinutes = timelineStartMinutes + (percentage / 100) * timelineRangeMinutes;
        const endMinutes = startMinutes + (session.duration || 25); // Default 25 min if no duration
        
        const startHour = Math.floor(startMinutes / 60);
        const startMin = Math.round(startMinutes % 60);
        const endHour = Math.floor(endMinutes / 60);
        const endMin = Math.round(endMinutes % 60);
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        tooltip.textContent = `${startTime} - ${endTime}`;
        
        // Position tooltip near mouse
        tooltip.style.left = `${mouseEvent.clientX + 15}px`;
        tooltip.style.top = `${mouseEvent.clientY - 35}px`;
        tooltip.style.opacity = '1';
    }

    updateResizeTooltip(tooltip, mouseEvent, sessionElement) {
        const leftPercent = parseFloat(sessionElement.style.left);
        const widthPercent = parseFloat(sessionElement.style.width);
        const rightPercent = leftPercent + widthPercent;

        // Convert percentages to time (00:00 to 23:59 range)
        const timelineStartMinutes = 0; // 00:00 (midnight)
        const timelineRangeMinutes = 24 * 60; // 24 hours

        const startMinutes = timelineStartMinutes + (leftPercent / 100) * timelineRangeMinutes;
        const endMinutes = timelineStartMinutes + (rightPercent / 100) * timelineRangeMinutes;
        const durationMinutes = endMinutes - startMinutes;

        const startHour = Math.floor(startMinutes / 60);
        const startMin = Math.round(startMinutes % 60);
        const endHour = Math.floor(endMinutes / 60);
        const endMin = Math.round(endMinutes % 60);

        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        const duration = `${Math.round(durationMinutes)}min`;

        tooltip.textContent = `${startTime} - ${endTime} (${duration})`;

        // Position tooltip near mouse
        tooltip.style.left = `${mouseEvent.clientX + 15}px`;
        tooltip.style.top = `${mouseEvent.clientY - 35}px`;
        tooltip.style.opacity = '1';
    }

    calculateSessionOffset(session, allSessions) {
        if (!allSessions || allSessions.length <= 1) return 0;

        // Find the index of this session in the array
        const sessionIndex = allSessions.findIndex(s => s.id === session.id);
        
        // Each session gets its own row
        const rowHeight = 20; // 15px session height + 5px spacing
        return sessionIndex * rowHeight;
    }

    createSessionHoverTooltip(session) {
        const tooltip = document.createElement('div');
        tooltip.className = 'session-hover-tooltip';
        
        const sessionType = this.getSessionTypeDisplay(session.session_type);
        const notes = session.notes ? ` - ${session.notes}` : '';
        
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-type">${sessionType}</div>
                <div class="tooltip-time">${session.start_time} - ${session.end_time}</div>
                <div class="tooltip-duration">${session.duration} minutes</div>
                ${notes ? `<div class="tooltip-notes">${session.notes}</div>` : ''}
            </div>
        `;
        
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '1000';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s ease';
        tooltip.style.pointerEvents = 'none';
        
        return tooltip;
    }

    updateHoverTooltip(tooltip, mouseEvent) {
        tooltip.style.left = `${mouseEvent.clientX + 10}px`;
        tooltip.style.top = `${mouseEvent.clientY - 10}px`;
        tooltip.style.opacity = '1';
    }

    // Sessions History Table Methods
    async initSessionsTable() {
        await this.populateSessionsTable('today');
        this.setupSessionsTableEventListeners();
    }

    setupSessionsTableEventListeners() {
        const filterSelect = document.getElementById('sessions-filter-period');
        if (filterSelect) {
            filterSelect.addEventListener('change', async (e) => {
                await this.populateSessionsTable(e.target.value);
            });
        }
    }

    async populateSessionsTable(period = 'today') {
        const tableBody = document.getElementById('sessions-table-body');
        if (!tableBody || !window.sessionManager) return;

        const sessions = this.getSessionsForPeriod(period);
        tableBody.innerHTML = '';

        if (sessions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="sessions-table-empty">
                        No sessions found for the selected period
                    </td>
                </tr>
            `;
            return;
        }

        // Sort sessions by date and time (newest first)
        sessions.sort((a, b) => {
            const dateComparison = b.created_at.localeCompare(a.created_at);
            if (dateComparison !== 0) return dateComparison;
            return b.start_time.localeCompare(a.start_time);
        });

        for (const session of sessions) {
            const row = await this.createSessionTableRow(session);
            tableBody.appendChild(row);
        }
    }

    getSessionsForPeriod(period) {
        if (!window.sessionManager) return [];

        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'all':
                return this.getAllSessionsFromManager();
            default:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
        }

        return this.getAllSessionsFromManager().filter(session => {
            const sessionDate = new Date(session.created_at);
            return sessionDate >= startDate;
        });
    }

    getAllSessionsFromManager() {
        const allSessions = [];
        
        // Get all sessions from all dates in SessionManager
        for (const [dateString, sessions] of Object.entries(window.sessionManager.sessions)) {
            allSessions.push(...sessions);
        }
        
        return allSessions;
    }

    async createSessionTableRow(session) {
        const row = document.createElement('tr');
        
        // Format date
        const sessionDate = new Date(session.created_at);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // Format time range
        const timeRange = `${session.start_time} - ${session.end_time}`;

        // Get session tags (if tag system is available)
        const tags = await this.getSessionTags(session.id);
        const tagsHtml = tags.length > 0 
            ? tags.map(tag => `<span class="session-tag">${tag.name}</span>`).join('')
            : '<span class="text-muted">-</span>';

        // Create type badge
        const typeBadge = `<span class="session-type-badge ${session.session_type}">${session.session_type}</span>`;

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${timeRange}</td>
            <td>${session.duration}m</td>
            <td><div class="session-tags">${tagsHtml}</div></td>
            <td>${typeBadge}</td>
            <td>
                <div class="session-actions">
                    <button class="session-action-btn delete" onclick="navigationManager.deleteSessionFromTable('${session.id}')" title="Delete Session">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    async getSessionTags(sessionId) {
        // If tag system is available, get tags for this session
        if (window.tagManager) {
            try {
                return await window.tagManager.getSessionTags(sessionId);
            } catch (error) {
                console.log('Tags not available for session:', sessionId);
            }
        }
        return [];
    }

    async deleteSessionFromTable(sessionId) {
        if (!window.sessionManager || !sessionId) return;

        if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
            try {
                // Find and delete the session
                for (const [dateString, sessions] of Object.entries(window.sessionManager.sessions)) {
                    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
                    if (sessionIndex !== -1) {
                        sessions.splice(sessionIndex, 1);
                        await window.sessionManager.saveSessionsToStorage();
                        
                        // Refresh the table
                        const filterSelect = document.getElementById('sessions-filter-period');
                        const currentPeriod = filterSelect ? filterSelect.value : 'today';
                        await this.populateSessionsTable(currentPeriod);
                        
                        // Refresh other views
                        await this.updateDailyChart();
                        await this.updateFocusSummary();
                        await this.updateWeeklySessionsChart();
                        await this.updateTimelineForDate(new Date());
                        
                        console.log('Session deleted successfully:', sessionId);
                        break;
                    }
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                alert('Failed to delete session. Please try again.');
            }
        }
    }
}
