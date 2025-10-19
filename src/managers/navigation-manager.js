// Navigation Manager for Sidebar
import { TimeUtils } from '../utils/common-utils.js';
import { TagStatistics } from '../utils/tag-statistics.js';
import { BarChart } from '../components/bar-chart.js';
import { FocusTrend } from '../components/focus-trend.js';

export class NavigationManager {
    constructor() {
        this.currentView = 'timer';
        this.initialized = false;
        this.currentTooltip = null; // Track current tooltip for proper cleanup
        this.tooltipTimeout = null; // Track timeout for debounced tooltip removal
        this.tagStatistics = new TagStatistics(); // Initialize tag statistics utility
        
        // Time period management
        this.currentPeriod = 'daily'; // 'daily', 'weekly', 'monthly', 'yearly'
        this.currentDate = new Date();
        
        // Initialize bar chart components
        this.dailyBarChart = new BarChart({
            containerId: 'daily-focus-distribution',
            barsContainerId: 'timeline-bars',
            yAxisId: 'timeline-y-axis',
            gridId: 'timeline-grid',
            totalDisplayId: 'daily-total-focus',
            maxValue: 60,           // Max 60 minutes per hour
            useFixedMax: true,      // Always show 0-60 scale
            barMaxWidth: 30,        // Thinner bars for 24 hours
            xAxisLabels: Array.from({length: 24}, (_, i) => i.toString())
        });

        this.weeklyBarChart = new BarChart({
            containerId: 'weekly-focus-distribution',
            barsContainerId: 'weekly-bars',
            yAxisId: 'weekly-y-axis',
            gridId: 'weekly-grid',
            totalDisplayId: 'weekly-total-focus',
            useFixedMax: false,     // Dynamic scale based on data
            barMaxWidth: 50,        // Wider bars for 7 days
            minScale: 20,
            xAxisLabels: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
        });

        this.monthlyBarChart = new BarChart({
            containerId: 'monthly-focus-distribution',
            barsContainerId: 'monthly-bars',
            yAxisId: 'monthly-y-axis',
            gridId: 'monthly-grid',
            totalDisplayId: 'monthly-total-focus',
            useFixedMax: false,     // Dynamic scale based on data
            barMaxWidth: 12,        // Thin bars for 30+ days
            minScale: 50,           // Higher minimum scale for monthly view
            xAxisLabels: []         // Will be populated dynamically based on month
        });

        this.yearlyBarChart = new BarChart({
            containerId: 'yearly-focus-distribution',
            barsContainerId: 'yearly-bars',
            yAxisId: 'yearly-y-axis',
            gridId: 'yearly-grid',
            totalDisplayId: 'yearly-total-focus',
            useFixedMax: false,     // Dynamic scale based on data
            barMaxWidth: 60,        // Wider bars for 12 months
            minScale: 100,          // Higher minimum scale for yearly view
            xAxisLabels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        });

        // Initialize Focus Trend component for weekly view
        this.weeklyFocusTrend = new FocusTrend({
            containerId: 'weekly-focus-trend',
            type: 'weekly',
            title: 'Haftalık Odaklanma Trendi',
            comparisonTextId: 'weekly-trend-comparison-text'
        });

        // Placeholder for Peak Focus Time component (initialized lazily)
        this.weeklyPeakFocus = null;

        // Initialize Focus Trend component for monthly view
        this.monthlyFocusTrend = new FocusTrend({
            containerId: 'monthly-focus-trend',
            type: 'monthly',
            title: 'Aylık Odaklanma Trendi',
            comparisonTextId: 'monthly-trend-comparison-text'
        });

        // Initialize Focus Trend component for yearly view
        this.yearlyFocusTrend = new FocusTrend({
            containerId: 'yearly-focus-trend',
            type: 'yearly',
            title: 'Yıllık Odaklanma Trendi',
            comparisonTextId: 'yearly-trend-comparison-text'
        });
        
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
        
        // Initialize time period selector
        this.initTimePeriodSelector();
        
        // Initialize sessions table
        await this.initSessionsTable();

        // Ensure initial period matches any active period button in the DOM
        // and trigger the period switch so period-specific components (like
        // the weekly PeakFocusTime) are initialized on first load.
        const activePeriodBtn = document.querySelector('.period-btn.active');
        if (activePeriodBtn && activePeriodBtn.dataset && activePeriodBtn.dataset.period) {
            this.currentPeriod = activePeriodBtn.dataset.period;
        }
        // Trigger the UI/data refresh for the current period
        await this.switchPeriod(this.currentPeriod);
    }

    async handleNavClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const view = e.currentTarget.dataset.view;
        if (view) {
            await this.switchView(view);
        }
    }

    async switchView(view) {
        if (!view) {
            console.warn('No view specified for switchView');
            return;
        }

        // Update active button - ensure all are deactivated first
        document.querySelectorAll('.sidebar-icon, .sidebar-icon-large').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the target button
        const targetButton = document.querySelector(`[data-view="${view}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }

        // Hide all views
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.add('hidden');
        });

        // Show selected view
        const targetView = document.getElementById(`${view}-view`);
        if (!targetView) {
            console.error(`View element not found: ${view}-view`);
            return;
        }
        
        targetView.classList.remove('hidden');
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
            // Refresh all period-specific data (daily/weekly/monthly/yearly)
            await this.refreshDataForPeriod();
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
        
        // Calendar has been removed from the UI, skip initialization
        if (!calendarGrid || !currentMonthEl || !prevBtn || !nextBtn) {
            // Initialize dates for other features
            this.currentDate = new Date();
            this.displayMonth = new Date(this.currentDate);
            this.selectedWeek = this.getWeekStart(this.currentDate);
            return;
        }

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
            await this.updateTagUsageChart();
            this.updateWeeklyFocusDistribution(); // Add weekly distribution update
        });

        nextWeekBtn.addEventListener('click', async () => {
            this.selectedWeek.setDate(this.selectedWeek.getDate() + 7);
            this.updateWeekDisplay();
            await this.updateFocusSummary();
            await this.updateWeeklySessionsChart();
            this.updateDailyChart();
            await this.updateTagUsageChart();
            this.updateWeeklyFocusDistribution(); // Add weekly distribution update
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

        // If elements don't exist (card removed), skip update silently
        if (!totalFocusWeekEl && !avgFocusDayEl && !weeklySessionsEl && !weeklyFocusTimeEl) {
            return;
        }

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
                    const focusSessions = sessions; // All sessions are focus sessions now
                    
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
                    const focusSessions = sessions; // All sessions are focus sessions now
                    
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

        // Update UI (only if elements exist)
        if (totalFocusWeekEl) {
            totalFocusWeekEl.textContent = TimeUtils.formatTime(weeklyFocusTime);
        }
        if (totalFocusChangeEl) {
            this.updateChangeElement(totalFocusChangeEl, weeklyFocusChange);
        }

        if (avgFocusDayEl) {
            avgFocusDayEl.textContent = TimeUtils.formatTime(avgFocus);
        }
        if (avgFocusChangeEl) {
            this.updateChangeElement(avgFocusChangeEl, avgFocusChange);
        }

        if (weeklySessionsEl) {
            weeklySessionsEl.textContent = weeklySessions.toString();
        }
        if (weeklySessionsChangeEl) {
            this.updateChangeElement(weeklySessionsChangeEl, weeklySessionsChange);
        }

        if (weeklyFocusTimeEl) {
            weeklyFocusTimeEl.textContent = TimeUtils.formatTime(weeklyFocusTime);
        }
        if (weeklyFocusChangeEl) {
            this.updateChangeElement(weeklyFocusChangeEl, weeklyFocusChange);
        }
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
        
        if (!dailyChart) {
            return;
        }

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
                if (true) { // All sessions are focus sessions now
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
        
        // If element doesn't exist (card removed), skip update silently
        if (!weeklyChart) {
            return;
        }
        
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
                    const focusSessions = allSessions; // All sessions are focus sessions now
                    
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

    // Compute weekly peak focus: averages per hour over last 7 days and peak hour
    computeWeeklyPeakFocus() {
        const averages = new Array(24).fill(0);
        if (!window.sessionManager) {
            return { averages, peakHour: 0, peakValue: 0 };
        }

        // Sum minutes per hour across last 7 days (including today backward)
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date(this.currentDate);
            date.setDate(this.currentDate.getDate() - dayOffset);

            const sessions = window.sessionManager.getSessionsForDate(date) || [];

            sessions.forEach(session => {
                // consider focus/custom sessions only
                const type = session.session_type || session.type;
                if (type !== 'focus' && type !== 'custom') return;
                if (!session.start_time || !session.end_time) return;

                const [sh, sm] = session.start_time.split(':').map(Number);
                const [eh, em] = session.end_time.split(':').map(Number);
                let startMin = sh * 60 + sm;
                let endMin = eh * 60 + em;

                // normalize if session ends past midnight (endMin < startMin)
                if (endMin <= startMin) endMin = startMin; // guard - assume no cross-midnight

                // iterate over hours covered
                let cur = startMin;
                while (cur < endMin) {
                    const hour = Math.floor(cur / 60);
                    const hourStart = hour * 60;
                    const hourEnd = hourStart + 60;
                    const segEnd = Math.min(endMin, hourEnd);
                    const segStart = Math.max(cur, hourStart);
                    const minutes = Math.max(0, segEnd - segStart);
                    if (hour >= 0 && hour < 24) averages[hour] += minutes;
                    cur = segEnd;
                }
            });
        }

        // Convert totals to averages per day (divide by 7)
        for (let h = 0; h < 24; h++) {
            averages[h] = averages[h] / 7;
        }

        // Find peak hour (highest average). If multiple, pick first
        let peakHour = 0;
        let peakValue = averages[0];
        for (let h = 1; h < 24; h++) {
            if (averages[h] > peakValue) {
                peakValue = averages[h];
                peakHour = h;
            }
        }

        return { averages, peakHour, peakValue };
    }

    // Compute monthly peak focus: average minutes per hour across the selected month
    // The averages are computed by summing minutes in each hour across every day of the month
    // and dividing by the number of days in that month (even if some days have no data).
    computeMonthlyPeakFocus() {
        const averages = new Array(24).fill(0);
        if (!window.sessionManager) {
            return { averages, peakHour: 0, peakValue: 0 };
        }

    const current = this.displayMonth ? new Date(this.displayMonth) : new Date(this.currentDate);
    const year = current.getFullYear();
    const month = current.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        // Sum minutes per hour across all days of the month
        for (let d = 1; d <= lastDay; d++) {
            const date = new Date(year, month, d);
            const sessions = window.sessionManager.getSessionsForDate(date) || [];

            sessions.forEach(session => {
                const type = session.session_type || session.type;
                if (type !== 'focus' && type !== 'custom') return;
                if (!session.start_time || !session.end_time) return;

                const [sh, sm] = session.start_time.split(':').map(Number);
                const [eh, em] = session.end_time.split(':').map(Number);
                let startMin = sh * 60 + sm;
                let endMin = eh * 60 + em;

                // normalize if session ends past midnight (endMin <= startMin)
                if (endMin <= startMin) endMin = startMin; // same handling as weekly

                // iterate over hours covered
                let cur = startMin;
                while (cur < endMin) {
                    const hour = Math.floor(cur / 60);
                    const hourStart = hour * 60;
                    const hourEnd = hourStart + 60;
                    const segEnd = Math.min(endMin, hourEnd);
                    const segStart = Math.max(cur, hourStart);
                    const minutes = Math.max(0, segEnd - segStart);
                    if (hour >= 0 && hour < 24) averages[hour] += minutes;
                    cur = segEnd;
                }
            });
        }

        // Convert totals to averages per day (divide by number of days in the month)
        for (let h = 0; h < 24; h++) {
            averages[h] = averages[h] / lastDay;
        }

        // Find peak hour (highest average). If multiple, pick first
        let peakHour = 0;
        let peakValue = averages[0];
        for (let h = 1; h < 24; h++) {
            if (averages[h] > peakValue) {
                peakValue = averages[h];
                peakHour = h;
            }
        }

        return { averages, peakHour, peakValue };
    }

    async updateTagUsageChart() {
        try {
            // Only render tag usage chart in weekly period to avoid confusion and extra work
            if (this.currentPeriod && this.currentPeriod !== 'weekly') {
                // If card exists, clear its contents to avoid stale visuals
                const chartContainer = document.getElementById('tag-pie-chart');
                const legendContainer = document.getElementById('tag-legend');
                if (chartContainer) chartContainer.innerHTML = '';
                if (legendContainer) legendContainer.innerHTML = '';
                return;
            }
            // Get all available tags
            const tags = window.tagManager ? window.tagManager.tags : [];
            
            // Get sessions for the current week
            const sessions = [];
            const startOfWeek = this.getWeekStart(this.currentDate);
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                
                if (window.sessionManager) {
                    const dailySessions = window.sessionManager.getSessionsForDate(date);
                    
                    // Filter to focus sessions only and add date info
                    const focusSessions = dailySessions
                        .filter(s => {
                            const sessionType = s.session_type || s.type;
                            return sessionType === 'focus' || sessionType === 'custom';
                        })
                        .map(session => ({
                            ...session,
                            date: date.toISOString().split('T')[0] // Add date in YYYY-MM-DD format
                        }));
                    sessions.push(...focusSessions);
                }
            }

                // Build start/end without mutating the original date object
                const startDate = new Date(startOfWeek);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(startOfWeek);
                endDate.setHours(23, 59, 59, 999);
                // Get tag statistics for the specific date
                const tagStatsData = this.tagStatistics.getTagUsageStatistics(sessions, tags, startDate, endDate);
            // Render the pie chart (only when weekly)
            this.tagStatistics.renderTagPieChart('tag-pie-chart', 'tag-legend', tagStatsData);
            
        } catch (error) {
            console.error('Error updating tag usage chart:', error);
            
            // Show placeholder on error
            const chartContainer = document.getElementById('tag-pie-chart');
            const legendContainer = document.getElementById('tag-legend');
            
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="pie-chart-placeholder">
                        <i class="ri-price-tag-line"></i>
                        <span>Error loading data</span>
                    </div>
                `;
            }
            
            if (legendContainer) {
                legendContainer.innerHTML = '';
            }
        }
    }

    async updateSelectedDayDetails(date = this.currentDate) {
        const selectedDayTitle = document.getElementById('selected-day-title');
        const timelineTrack = document.getElementById('timeline-track');
        const timelineHours = document.getElementById('timeline-hours');
        
        // Calendar details have been removed from the UI, skip update
        if (!selectedDayTitle || !timelineTrack || !timelineHours) return;

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
true // All sessions are focus sessions now
            );

            // Create timeline session blocks (excluding break sessions)
            visibleSessions.forEach(session => {
                this.createTimelineSession(session, date, timelineTrack, visibleSessions);
            });

            // Calculate and set timeline height after all sessions are added
            this.updateTimelineHeight(timelineTrack, visibleSessions.length);

            // Initialize timeline interactions
            this.initializeTimelineInteractions();

            // Also update the daily tag usage chart for this selected date
            try {
                await this.updateDailyTagUsageChart(date);
            } catch (e) {
                console.warn('Failed to update daily tag usage chart for selected day:', e);
            }

        } catch (error) {
            console.error('Failed to load session details:', error);
            const errorItem = document.createElement('div');
            errorItem.className = 'timeline-empty';
            errorItem.textContent = 'Error loading session data';
            timelineTrack.appendChild(errorItem);
        }
    }


    async updateCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthEl = document.getElementById('current-month');
        
        // Calendar has been removed from the UI, skip update
        if (!calendarGrid || !currentMonthEl) return;

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
        const calendarDays = document.querySelectorAll('.calendar-day');
        if (calendarDays.length > 0) {
            calendarDays.forEach(day => {
                day.classList.remove('selected');
            });

            // Add selection to clicked day
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('selected');
            }
        }

        this.selectedDate = date;
        await this.updateSelectedDayDetails(date);
        await this.updateFocusSummary();
        await this.updateWeeklySessionsChart();
        this.updateDailyChart();
        this.updateDailyFocusDistribution(); // Update daily focus distribution
        await this.updateTagUsageChart();
        await this.updateFocusTrend(date); // Add focus trend update
        
        // Update session history table for selected date
        await this.populateSessionsTableForDate(date);
    }

    updateDailyDetails(date = this.currentDate) {
        // This method is now replaced by updateSelectedDayDetails, updateFocusSummary, and updateDailyChart
        // Keeping it for compatibility, but it just calls the new methods
        this.updateSelectedDayDetails(date);
        this.updateFocusSummary();
        this.updateWeeklySessionsChart();
        this.updateDailyChart();
        this.updateTagUsageChart();
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
        sessionElement.className = `timeline-session focus`; // All sessions are focus sessions
        sessionElement.dataset.sessionId = session.id;

        // Check if this session is from today
        const isToday = this.isSameDay(date, new Date());
        
        // Define session type for display
        const sessionType = session.session_type || session.type || 'Focus';

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
        if (isToday) {
            // For today's sessions: minimal display, information only in tooltip
            sessionElement.classList.add('today-session');
            sessionElement.innerHTML = `
        <div class="session-handle left"></div>
        <div class="timeline-session-content-minimal"></div>
        <div class="session-handle right"></div>
      `;

            // Set tooltip with full information
            sessionElement.title = `Focus: ${session.start_time} - ${session.end_time} (${session.duration}m)`;
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
            sessionElement.title = `Focus: ${newStartTime} - ${newEndTime} (${newDuration}m)`;
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
        
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-type">Focus Session</div>
                <div class="tooltip-time">${session.start_time} - ${session.end_time}</div>
                <div class="tooltip-duration">${session.duration} minutes</div>
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
        await this.populateSessionsTableForDate(this.currentDate);
        this.setupSessionsTableEventListeners();
    }

    setupSessionsTableEventListeners() {
        const exportBtn = document.getElementById('export-sessions-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSessionsToExcel();
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
                    <td colspan="5" class="sessions-table-empty">
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

    async populateSessionsTableForDate(date) {
        const tableBody = document.getElementById('sessions-table-body');
        if (!tableBody || !window.sessionManager) return;

        const sessions = window.sessionManager.getSessionsForDate(date);
        tableBody.innerHTML = '';

        if (sessions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="sessions-table-empty">
                        No sessions found for selected date
                    </td>
                </tr>
            `;
            return;
        }

        // Sort sessions by time (newest first)
        sessions.sort((a, b) => b.start_time.localeCompare(a.start_time));

        for (const session of sessions) {
            const row = await this.createSessionTableRow(session);
            tableBody.appendChild(row);
        }
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
        let tagsHtml;
        
        if (tags.length === 0) {
            tagsHtml = '<span class="text-muted">-</span>';
        } else if (tags.length === 1) {
            // Single tag - show with icon
            const tag = tags[0];
            const iconHtml = tag.icon.startsWith('ri-') || tag.icon.startsWith('ph-') 
                ? `<i class="${tag.icon.startsWith('ph-') ? 'ph ' + tag.icon : tag.icon}"></i>` 
                : tag.icon;
            tagsHtml = `<span class="session-tag">${iconHtml} ${tag.name}</span>`;
        } else {
            // Multiple tags - show first with icon + count indicator with tooltip
            const firstTag = tags[0];
            const remainingCount = tags.length - 1;
            const allTagNames = tags.map(tag => tag.name).join(', ');
            const iconHtml = firstTag.icon.startsWith('ri-') || firstTag.icon.startsWith('ph-') 
                ? `<i class="${firstTag.icon.startsWith('ph-') ? 'ph ' + firstTag.icon : firstTag.icon}"></i>` 
                : firstTag.icon;
            
            tagsHtml = `
                <div class="session-tags-compact" title="${allTagNames}">
                    <span class="session-tag">${iconHtml} ${firstTag.name}</span>
                    <span class="session-tag-count">+${remainingCount}</span>
                </div>
            `;
        }

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${timeRange}</td>
            <td>${session.duration}m</td>
            <td><div class="session-tags">${tagsHtml}</div></td>
            <td>
                <div class="session-actions">
                    <button class="session-action-btn edit" onclick="navigationManager.editSessionFromTable('${session.id}')" title="Edit Session">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="session-action-btn delete" onclick="navigationManager.deleteSessionFromTable('${session.id}')" title="Delete Session">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    async getSessionTags(sessionId) {
        // Get tags directly from session data
        if (window.sessionManager) {
            try {
                // Find the session in all dates
                for (const dateString in window.sessionManager.sessions) {
                    const dateSessions = window.sessionManager.sessions[dateString];
                    if (dateSessions) {
                        const session = dateSessions.find(s => s.id === sessionId);
                        if (session && session.tags) {
                            return session.tags;
                        }
                    }
                }
            } catch (error) {
                console.log('Tags not available for session:', sessionId);
            }
        }
        return [];
    }

    async deleteSessionFromTable(sessionId) {
        if (!window.sessionManager || !sessionId) return;

        try {
            let sessionFound = false;
            
            // Find and delete the session
            let deletedFromDate = null;
            for (const [dateString, sessions] of Object.entries(window.sessionManager.sessions)) {
                const sessionIndex = sessions.findIndex(s => s.id === sessionId);
                if (sessionIndex !== -1) {
                    sessions.splice(sessionIndex, 1);
                    sessionFound = true;
                    deletedFromDate = dateString;
                    console.log('Session deleted successfully:', sessionId);
                    break;
                }
            }

            if (!sessionFound) {
                console.warn('Session not found for deletion:', sessionId);
                return;
            }

            // Save the updated sessions
            await window.sessionManager.saveSessionsToStorage();

            // Dispatch session deleted event for synchronization with other components
            window.dispatchEvent(new CustomEvent('sessionDeleted', { 
                detail: { sessionId, date: deletedFromDate } 
            }));
            
            // Refresh the table
            const currentDate = this.selectedDate || this.currentDate;
            await this.populateSessionsTableForDate(currentDate);
            
            // Refresh other views (with error handling for each)
            try {
                await this.updateDailyChart();
            } catch (e) {
                console.warn('Failed to update daily chart after deletion:', e);
            }
            
            try {
                await this.updateFocusSummary();
            } catch (e) {
                console.warn('Failed to update focus summary after deletion:', e);
            }
            
            try {
                await this.updateWeeklySessionsChart();
            } catch (e) {
                console.warn('Failed to update weekly chart after deletion:', e);
            }
            
            try {
                await this.updateTagUsageChart();
            } catch (e) {
                console.warn('Failed to update tag usage chart after deletion:', e);
            }
            
            try {
                await this.updateTimelineForDate(new Date());
            } catch (e) {
                console.warn('Failed to update timeline after deletion:', e);
            }
            
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Failed to delete session. Please try again.');
        }
    }

    async editSessionFromTable(sessionId) {
        if (!window.sessionManager || !sessionId) return;

        try {
            // Find the session
            let sessionToEdit = null;
            let sessionDate = null;
            
            for (const [dateString, sessions] of Object.entries(window.sessionManager.sessions)) {
                const session = sessions.find(s => s.id === sessionId);
                if (session) {
                    sessionToEdit = session;
                    sessionDate = dateString;
                    break;
                }
            }

            if (!sessionToEdit) {
                console.warn('Session not found for editing:', sessionId);
                return;
            }

            // Open the edit modal using SessionManager
            window.sessionManager.openEditSessionModal(sessionToEdit, sessionDate);
            
        } catch (error) {
            console.error('Error opening edit session modal:', error);
            alert('Failed to open edit session. Please try again.');
        }
    }

    async exportSessionsToExcel() {
        try {
            const currentDate = this.selectedDate || this.currentDate;
            const sessions = window.sessionManager.getSessionsForDate(currentDate);

            if (sessions.length === 0) {
                alert('No sessions to export for the selected period.');
                return;
            }

            const XLSX = window.XLSX;
            if (!XLSX) {
                console.error('XLSX library not found');
                alert('Excel export functionality is not available.');
                return;
            }

            // Prepare export data
            const exportData = [];
            for (const session of sessions) {
                const sessionDate = new Date(session.created_at);
                const formattedDate = sessionDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                const tags = await this.getSessionTags(session.id);
                const tagNames = tags.map(tag => tag.name).join(', ');

                exportData.push({
                    'Date': formattedDate,
                    'Start Time': session.start_time,
                    'End Time': session.end_time,
                    'Duration (minutes)': session.duration,
                    'Tags': tagNames || '-'
                });
            }

            exportData.sort((a, b) => {
                const dateComparison = new Date(b.Date).getTime() - new Date(a.Date).getTime();
                if (dateComparison !== 0) return dateComparison;
                return b['Start Time'].localeCompare(a['Start Time']);
            });

            // Create Excel workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Session History');

            // Generate default filename
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const currentPeriod = this.selectedDate ? 'selected-date' : 'today';
            const defaultFilename = `presto-session-history-${currentPeriod}-${dateStr}.xlsx`;

            // Check if we're in Tauri environment
            if (window.__TAURI__) {
                try {
                    // Use Tauri's save dialog
                    const filePath = await window.__TAURI__.dialog.save({
                        defaultPath: defaultFilename,
                        filters: [{
                            name: 'Excel files',
                            extensions: ['xlsx']
                        }]
                    });

                    if (filePath) {
                        // Convert workbook to base64 for Tauri
                        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                        
                        // Use invoke to call Rust backend to save file
                        await window.__TAURI__.core.invoke('write_excel_file', {
                            path: filePath,
                            data: wbout
                        });
                        
                        console.log(`Exported ${sessions.length} sessions to ${filePath}`);
                        alert(`Sessions exported successfully to:\n${filePath}`);
                    } else {
                        console.log('Export cancelled by user');
                    }
                } catch (tauriError) {
                    console.error('Tauri save error:', tauriError);
                    // Fallback to direct download
                    XLSX.writeFile(wb, defaultFilename);
                    console.log(`Tauri save failed, using fallback download: ${defaultFilename}`);
                    alert(`File saved to Downloads folder as: ${defaultFilename}`);
                }
            } else {
                // Fallback for web environment - direct download
                XLSX.writeFile(wb, defaultFilename);
                console.log(`Exported ${sessions.length} sessions to ${defaultFilename}`);
            }
            
        } catch (error) {
            console.error('Error exporting sessions:', error);
            alert('Failed to export sessions. Please try again.');
        }
    }

    // ========================================
    // TIME PERIOD MANAGEMENT
    // ========================================

    initTimePeriodSelector() {
        const periodButtons = document.querySelectorAll('.period-btn');
        
        periodButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const period = btn.dataset.period;
                await this.switchPeriod(period);
            });
        });

        // Initialize navigators for each period
        this.initPeriodNavigators();
        
        // Initial button state update
        this.updateNavigatorButtons();
    }

    initPeriodNavigators() {
        // Daily navigator
        const prevDayBtn = document.getElementById('prev-day');
        const nextDayBtn = document.getElementById('next-day');
        
        if (prevDayBtn) {
            prevDayBtn.addEventListener('click', () => this.navigatePeriod(-1));
        }
        if (nextDayBtn) {
            nextDayBtn.addEventListener('click', () => this.navigatePeriod(1));
        }

        // Weekly navigator (already initialized in initCalendar, but update references)
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        
        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => this.navigatePeriod(-1));
        }
        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', () => this.navigatePeriod(1));
        }

        // Monthly navigator
        const prevMonthBtn = document.getElementById('prev-month-period');
        const nextMonthBtn = document.getElementById('next-month-period');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.navigatePeriod(-1));
        }
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.navigatePeriod(1));
        }

        // Yearly navigator
        const prevYearBtn = document.getElementById('prev-year');
        const nextYearBtn = document.getElementById('next-year');
        
        if (prevYearBtn) {
            prevYearBtn.addEventListener('click', () => this.navigatePeriod(-1));
        }
        if (nextYearBtn) {
            nextYearBtn.addEventListener('click', () => this.navigatePeriod(1));
        }
    }

    async switchPeriod(period) {
        // Update active button
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            }
        });

        // Update current period
        this.currentPeriod = period;

        // Show/hide daily distribution card
        const dailyDistCard = document.getElementById('daily-focus-distribution');
        if (dailyDistCard) {
            if (period === 'daily') {
                dailyDistCard.classList.remove('hidden');
            } else {
                dailyDistCard.classList.add('hidden');
            }
        }

        // Show/hide weekly distribution card
        const weeklyDistCard = document.getElementById('weekly-focus-distribution');
        if (weeklyDistCard) {
            if (period === 'weekly') {
                weeklyDistCard.classList.add('active');
            } else {
                weeklyDistCard.classList.remove('active');
            }
        }

        // Show/hide weekly focus trend card
        const weeklyTrendCard = document.getElementById('weekly-focus-trend');
        if (weeklyTrendCard) {
            if (period === 'weekly') {
                weeklyTrendCard.classList.add('active');
            } else {
                weeklyTrendCard.classList.remove('active');
            }
        }

        // Show/hide weekly peak focus card (only visible in weekly period)
        const weeklyPeakCard = document.getElementById('weekly-peak-focus');
        if (weeklyPeakCard) {
            if (period === 'weekly') {
                weeklyPeakCard.classList.add('active');
            } else {
                weeklyPeakCard.classList.remove('active');
            }
        }

        // Show/hide monthly focus trend card
        const monthlyTrendCard = document.getElementById('monthly-focus-trend');
        if (monthlyTrendCard) {
            if (period === 'monthly') {
                monthlyTrendCard.classList.add('active');
            } else {
                monthlyTrendCard.classList.remove('active');
            }
        }

        // Show/hide monthly distribution card
        const monthlyDistCard = document.getElementById('monthly-focus-distribution');
        if (monthlyDistCard) {
            if (period === 'monthly') {
                monthlyDistCard.classList.add('active');
            } else {
                monthlyDistCard.classList.remove('active');
            }
        }

        // Show/hide monthly peak focus card (only visible in monthly period)
        const monthlyPeakCard = document.getElementById('monthly-peak-focus');
        if (monthlyPeakCard) {
            if (period === 'monthly') {
                monthlyPeakCard.classList.add('active');
            } else {
                monthlyPeakCard.classList.remove('active');
            }
        }

        // Show/hide yearly focus trend card
        const yearlyTrendCard = document.getElementById('yearly-focus-trend');
        if (yearlyTrendCard) {
            if (period === 'yearly') {
                yearlyTrendCard.classList.add('active');
            } else {
                yearlyTrendCard.classList.remove('active');
            }
        }

        // Show/hide yearly distribution card
        const yearlyDistCard = document.getElementById('yearly-focus-distribution');
        if (yearlyDistCard) {
            if (period === 'yearly') {
                yearlyDistCard.classList.add('active');
            } else {
                yearlyDistCard.classList.remove('active');
            }
        }

        // Show/hide focus trend card
        const focusTrendCard = document.getElementById('focus-trend-card');
        if (focusTrendCard) {
            if (period === 'daily') {
                focusTrendCard.classList.remove('hidden');
            } else {
                focusTrendCard.classList.add('hidden');
            }
        }

        // Show/hide Tag Usage card (only visible in weekly period)
        // Weekly tag usage card
        const tagUsageCard = document.querySelector('.tag-usage-week-card');
        if (tagUsageCard) {
            if (period === 'weekly') {
                tagUsageCard.classList.remove('hidden');
            } else {
                tagUsageCard.classList.add('hidden');
            }
        }

        // Daily tag usage card (only visible in daily period)
        const tagUsageDayCard = document.querySelector('.tag-usage-day-card');
        if (tagUsageDayCard) {
            if (period === 'daily') {
                tagUsageDayCard.classList.remove('hidden');
            } else {
                tagUsageDayCard.classList.add('hidden');
            }
        }

        // Show/hide appropriate navigator
        this.updateNavigatorDisplay();

        // Update period display
        this.updatePeriodDisplay();

        // Update navigator buttons state
        this.updateNavigatorButtons();

        // Refresh data based on period
        await this.refreshDataForPeriod();
    }

    updateNavigatorDisplay() {
        // Hide all navigators
        const navigators = document.querySelectorAll('.navigator-content');
        navigators.forEach(nav => nav.classList.add('hidden'));

        // Show current period's navigator
        const currentNav = document.getElementById(`${this.currentPeriod}-navigator`);
        if (currentNav) {
            currentNav.classList.remove('hidden');
        }
    }

    updatePeriodDisplay() {
        const date = this.currentDate;

        switch (this.currentPeriod) {
            case 'daily':
                this.updateDailyDisplay(date);
                break;
            case 'weekly':
                this.updateWeekDisplay();
                break;
            case 'monthly':
                this.updateMonthlyDisplay(date);
                break;
            case 'yearly':
                this.updateYearlyDisplay(date);
                break;
        }
    }

    updateDailyDisplay(date) {
        const dayDisplay = document.getElementById('day-display');
        if (dayDisplay) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dayDisplay.textContent = date.toLocaleDateString('en-US', options);
        }
    }

    updateMonthlyDisplay(date) {
        const monthDisplay = document.getElementById('month-display');
        if (monthDisplay) {
            const options = { year: 'numeric', month: 'long' };
            monthDisplay.textContent = date.toLocaleDateString('en-US', options);
        }
    }

    updateYearlyDisplay(date) {
        const yearDisplay = document.getElementById('year-display');
        if (yearDisplay) {
            yearDisplay.textContent = date.getFullYear();
        }
    }

    navigatePeriod(direction) {
        // direction: -1 for previous, 1 for next
        const newDate = new Date(this.currentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (this.currentPeriod) {
            case 'daily':
                newDate.setDate(newDate.getDate() + direction);
                break;
            case 'weekly':
                newDate.setDate(newDate.getDate() + (direction * 7));
                break;
            case 'monthly':
                newDate.setMonth(newDate.getMonth() + direction);
                break;
            case 'yearly':
                newDate.setFullYear(newDate.getFullYear() + direction);
                break;
        }

        // Don't allow navigation to future dates
        if (direction > 0) {
            newDate.setHours(0, 0, 0, 0);
            if (newDate > today) {
                // Don't navigate - stay at current date
                return;
            }
        }

        this.currentDate = newDate;
        this.updatePeriodDisplay();
        this.refreshDataForPeriod();
        this.updateNavigatorButtons();
    }

    updateNavigatorButtons() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let nextDate = new Date(this.currentDate);
        nextDate.setHours(0, 0, 0, 0);
        
        // Calculate what the next date would be
        switch (this.currentPeriod) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        
        // Get the appropriate next button based on current period
        let nextBtn;
        switch (this.currentPeriod) {
            case 'daily':
                nextBtn = document.getElementById('next-day');
                break;
            case 'weekly':
                nextBtn = document.getElementById('next-week');
                break;
            case 'monthly':
                nextBtn = document.getElementById('next-month-period');
                break;
            case 'yearly':
                nextBtn = document.getElementById('next-year');
                break;
        }
        
        // Disable next button if it would go to the future
        if (nextBtn) {
            if (nextDate > today) {
                nextBtn.disabled = true;
                nextBtn.style.opacity = '0.5';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.disabled = false;
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }
    }

    async refreshDataForPeriod() {
        // Refresh all data visualizations based on current period
        switch (this.currentPeriod) {
            case 'daily':
                await this.refreshDailyData();
                break;
            case 'weekly':
                await this.refreshWeeklyData();
                break;
            case 'monthly':
                await this.refreshMonthlyData();
                break;
            case 'yearly':
                await this.refreshYearlyData();
                break;
        }
    }

    async refreshDailyData() {
        // Update for single day view
        await this.updateSelectedDayDetails(this.currentDate);
        await this.updateFocusSummaryForPeriod();
        this.updateDailyChart();
        // Update daily tag usage chart for the selected date
        await this.updateDailyTagUsageChart(this.currentDate);
        await this.updateFocusTrend(this.currentDate); // Add focus trend update
    // Ensure yearly focus trend updates too
    this.updateYearlyFocusTrend();
        
        // Show/hide daily distribution
        this.updateDailyFocusDistribution();
        
        // Update navigator buttons
        this.updateNavigatorButtons();
        
        // Ensure PeakFocusTime component exists for monthly and render
        await this.ensureMonthlyPeakFocusInitialized();
        if (this.monthlyPeakFocus) {
            const peakResult = this.computeMonthlyPeakFocus();
            this.monthlyPeakFocus.render(peakResult);
        }
    }

    async updateDailyTagUsageChart(date = this.currentDate) {
        try {
            // Collect tags and sessions for the specific date
            const tags = window.tagManager ? window.tagManager.tags : [];
            const sessions = window.sessionManager ? window.sessionManager.getSessionsForDate(date) : [];

            // If no sessions, we'll still call render to show placeholder / empty slices
            const tagStatsData = this.tagStatistics.getTagUsageStatistics(sessions, tags, new Date(date.setHours(0,0,0,0)), new Date(date.setHours(23,59,59,999)));

            // Render into daily containers
            this.tagStatistics.renderTagPieChart('tag-pie-chart-day', 'tag-legend-day', tagStatsData);
        } catch (error) {
            console.error('Error updating daily tag usage chart:', error);
            const chartContainer = document.getElementById('tag-pie-chart-day');
            const legendContainer = document.getElementById('tag-legend-day');
            if (chartContainer) chartContainer.innerHTML = `<div class="pie-chart-placeholder"><i class="ri-price-tag-line"></i><span>Error loading data</span></div>`;
            if (legendContainer) legendContainer.innerHTML = '';
        }
    }

    async refreshWeeklyData() {
        // Update for weekly view (existing functionality)
        this.selectedWeek = this.getWeekStart(this.currentDate);
        this.updateWeekDisplay();
        await this.updateFocusSummary();
        await this.updateWeeklySessionsChart();
        this.updateDailyChart();
        await this.updateTagUsageChart();
        
        // Update weekly focus distribution
        this.updateWeeklyFocusDistribution();
        
        // Update weekly focus trend
        this.updateWeeklyFocusTrend();
    // Update yearly focus trend as well
    this.updateYearlyFocusTrend();
        
        // Ensure PeakFocusTime component exists and render
        await this.ensureWeeklyPeakFocusInitialized();
        if (this.weeklyPeakFocus) {
            const peakResult = this.computeWeeklyPeakFocus();
            this.weeklyPeakFocus.render(peakResult);
        }
        
        // Update navigator buttons
        this.updateNavigatorButtons();
    }

    // Lazy initialize PeakFocusTime component via dynamic import
    async ensureWeeklyPeakFocusInitialized() {
        if (this.weeklyPeakFocus) return;
        try {
            const module = await import('../components/peak-focus-time.js');
            const PeakFocusTime = module.PeakFocusTime;
            this.weeklyPeakFocus = new PeakFocusTime({ containerId: 'weekly-peak-focus' });
        } catch (e) {
            console.warn('Failed to initialize PeakFocusTime component:', e);
            this.weeklyPeakFocus = null;
        }
    }

    // Lazy initialize Monthly PeakFocusTime component via dynamic import
    async ensureMonthlyPeakFocusInitialized() {
        if (this.monthlyPeakFocus) return;
        try {
            const module = await import('../components/peak-focus-time.js');
            const PeakFocusTime = module.PeakFocusTime;
            this.monthlyPeakFocus = new PeakFocusTime({ containerId: 'monthly-peak-focus' });
        } catch (e) {
            console.warn('Failed to initialize Monthly PeakFocusTime component:', e);
            this.monthlyPeakFocus = null;
        }
    }

    async refreshMonthlyData() {
        // Update for monthly view
        this.displayMonth = new Date(this.currentDate);
        await this.updateCalendar();
        await this.updateFocusSummaryForPeriod();
        await this.updateMonthlyChart();
    // Update yearly focus trend too
    this.updateYearlyFocusTrend();
        await this.updateTagUsageChart();
        
        // Update monthly focus distribution
        this.updateMonthlyFocusDistribution();
        
        // Update monthly focus trend
        this.updateMonthlyFocusTrend();
        
        // Update navigator buttons
        this.updateNavigatorButtons();
    }

    // MONTHLY FOCUS TREND
    // ========================================
    updateMonthlyFocusTrend() {
        if (!window.sessionManager) {
            this.monthlyFocusTrend.render([]);
            return;
        }

        const current = new Date(this.currentDate);

        // Helper to get month start
        const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

        // This month, last month, month before
        const thisMonthStart = getMonthStart(current);
        const lastMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1);
        const twoMonthsStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 2, 1);

        const getMonthTotal = (monthStart) => {
            const year = monthStart.getFullYear();
            const month = monthStart.getMonth();
            const lastDay = new Date(year, month + 1, 0).getDate();
            let total = 0;
            for (let d = 1; d <= lastDay; d++) {
                const day = new Date(year, month, d);
                const sessions = window.sessionManager.getSessionsForDate(day) || [];
                total += sessions.reduce((sum, s) => {
                    if (s.session_type === 'focus' || s.session_type === 'custom') return sum + (s.duration || 0);
                    return sum;
                }, 0);
            }
            return total;
        };

        const thisMonthTotal = getMonthTotal(thisMonthStart);
        const lastMonthTotal = getMonthTotal(lastMonthStart);
        const twoMonthsTotal = getMonthTotal(twoMonthsStart);

        // For comparison up-to-current-day: compute totals up to today's date in previous months
        const today = new Date();
        const currentDayOfMonth = today.getDate();

        const getUpToDayTotal = (monthStart, upToDay) => {
            const year = monthStart.getFullYear();
            const month = monthStart.getMonth();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const dayLimit = Math.min(upToDay, lastDay);
            let total = 0;
            for (let d = 1; d <= dayLimit; d++) {
                const day = new Date(year, month, d);
                const sessions = window.sessionManager.getSessionsForDate(day) || [];
                total += sessions.reduce((sum, s) => {
                    if (s.session_type === 'focus' || s.session_type === 'custom') return sum + (s.duration || 0);
                    return sum;
                }, 0);
            }
            return total;
        };

        const lastMonthUpToToday = getUpToDayTotal(lastMonthStart, currentDayOfMonth);
        const twoMonthsUpToToday = getUpToDayTotal(twoMonthsStart, currentDayOfMonth);

        // Prepare data for component (percentages will be handled by component using max value)
        const maxTotal = Math.max(thisMonthTotal, lastMonthTotal, twoMonthsTotal, 1);

        const data = [
            {
                label: 'Bu Ay',
                time: this.formatTimeForTrend(thisMonthTotal),
                date: `${thisMonthStart.getMonth() + 1}/${thisMonthStart.getFullYear()}`,
                value: thisMonthTotal,
                percentage: (thisMonthTotal / maxTotal) * 100
            },
            {
                label: 'Geçen Ay',
                time: this.formatTimeForTrend(lastMonthTotal),
                date: `${lastMonthStart.getMonth() + 1}/${lastMonthStart.getFullYear()}`,
                value: lastMonthTotal,
                percentage: (lastMonthTotal / maxTotal) * 100,
                comparisonPercentage: (lastMonthUpToToday / maxTotal) * 100,
                comparisonTooltip: this.formatTimeForTrend(lastMonthUpToToday)
            },
            {
                label: 'Evvelki Ay',
                time: this.formatTimeForTrend(twoMonthsTotal),
                date: `${twoMonthsStart.getMonth() + 1}/${twoMonthsStart.getFullYear()}`,
                value: twoMonthsTotal,
                percentage: (twoMonthsTotal / maxTotal) * 100,
                comparisonPercentage: (twoMonthsUpToToday / maxTotal) * 100,
                comparisonTooltip: this.formatTimeForTrend(twoMonthsUpToToday)
            }
        ];

        this.monthlyFocusTrend.render(data);
    }

    async refreshYearlyData() {
        // Update for yearly view
        await this.updateFocusSummaryForPeriod();
        await this.updateYearlyChart();
        await this.updateTagUsageChart();
        
        // Update yearly focus distribution
        this.updateYearlyFocusDistribution();

        // Update yearly focus trend
        this.updateYearlyFocusTrend();
        
        // Update navigator buttons
        this.updateNavigatorButtons();
    }

    async updateFocusSummaryForPeriod() {
        // This will be similar to updateFocusSummary but adapt to current period
        // For now, reuse existing logic
        await this.updateFocusSummary();
    }

    async updateMonthlyChart() {
        // Create a monthly chart (to be implemented)
        // This could show daily averages across the month
        console.log('Monthly chart update - to be implemented');
    }

    async updateYearlyChart() {
        // Create a yearly chart (to be implemented)
        // This could show monthly totals across the year
        console.log('Yearly chart update - to be implemented');
    }

    getPeriodDateRange() {
        const date = this.currentDate;
        let startDate, endDate;

        switch (this.currentPeriod) {
            case 'daily':
                startDate = new Date(date);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);
                break;
            
            case 'weekly':
                startDate = this.getWeekStart(date);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            
            case 'monthly':
                startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            
            case 'yearly':
                startDate = new Date(date.getFullYear(), 0, 1);
                endDate = new Date(date.getFullYear(), 11, 31);
                endDate.setHours(23, 59, 59, 999);
                break;
            
            default:
                startDate = date;
                endDate = date;
        }

        return { startDate, endDate };
    }

    // ========================================
    // DAILY FOCUS TIME DISTRIBUTION
    // ========================================

    updateDailyFocusDistribution() {
        const timelineBars = document.getElementById('timeline-bars');
        const yAxisContainer = document.getElementById('timeline-y-axis');
        const gridContainer = document.getElementById('timeline-grid');
        const totalDisplay = document.getElementById('daily-total-focus');

        if (!timelineBars || !window.sessionManager) {
            return;
        }

        const sessions = window.sessionManager.getSessionsForDate(this.currentDate);
        
        if (!sessions || sessions.length === 0) {
            // When there are no sessions for the day, render 24 hoverable columns
            // with zero heights so the user can still interact with the timeline.
            const hourlyData = this.createHourlyDistribution([]); // creates 24 empty hours

            // Update total display
            if (totalDisplay) totalDisplay.textContent = '0 saat 0 dk';

            // Render Y-axis and grid (60-minute scale)
            if (yAxisContainer) this.renderDailyYAxis(yAxisContainer, 60);
            if (gridContainer) this.renderDailyGrid(gridContainer);

            // Render zero-height bars (scaleMax = 60 minutes)
            const scaleMax = 60;
            this.renderDailyTimelineBars(timelineBars, hourlyData, scaleMax);

            return;
        }

        // Create 24-hour timeline data
        const hourlyData = this.createHourlyDistribution(sessions);
        
        // Calculate total focus time
        const totalFocus = hourlyData.reduce((sum, hour) => sum + hour.focus, 0);
        
        // Update total display
        if (totalDisplay) {
            const hours = Math.floor(totalFocus / 60);
            const mins = Math.round(totalFocus % 60);
            totalDisplay.textContent = hours > 0 ? `${hours} saat ${mins} dk` : `${mins} dakika`;
        }

        // Find max value for scaling
        const maxMinutes = Math.max(...hourlyData.map(h => h.total), 1);
        const scaleMax = maxMinutes > 60 ? 60 : 60; // Always use 60-minute scale

        // Render Y-axis and grid
        if (yAxisContainer) this.renderDailyYAxis(yAxisContainer, scaleMax);
        if (gridContainer) this.renderDailyGrid(gridContainer);

        // Render bars
        this.renderDailyTimelineBars(timelineBars, hourlyData, scaleMax);
    }

    showDailyNoDataMessage(container) {
        // Do not show a "No data" label; keep the area empty so grid lines remain visible.
        container.innerHTML = '';
    }

    renderDailyYAxis(container, maxValue) {
        const labels = [60, 50, 40, 30, 20, 10, 0];
        container.innerHTML = labels.map(value => 
            `<span class="timeline-y-label">${value === 0 ? '0 dk' : value}</span>`
        ).join('');
    }

    renderDailyGrid(container) {
        const lines = Array.from({ length: 7 }, () => 
            '<div class="timeline-grid-line"></div>'
        ).join('');
        container.innerHTML = lines;
    }

    renderDailyTimelineBars(container, hourlyData, scaleMax) {
        container.innerHTML = '';

        hourlyData.forEach((hour, index) => {
            const bar = document.createElement('div');
            bar.className = 'timeline-bar';
            
            if (hour.total === 0) {
                bar.classList.add('empty');
            }

            // Calculate heights
            const focusPercent = (hour.focus / scaleMax) * 100;
            const breakPercent = (hour.break / scaleMax) * 100;
            const emptyPercent = 100 - focusPercent - breakPercent;

            // Focus segment
            if (hour.focus > 0) {
                const focusSegment = document.createElement('div');
                focusSegment.className = 'timeline-bar-segment focus';
                focusSegment.style.height = `${focusPercent}%`;
                bar.appendChild(focusSegment);
            }

            // Break segment
            if (hour.break > 0) {
                const breakSegment = document.createElement('div');
                breakSegment.className = 'timeline-bar-segment break';
                breakSegment.style.height = `${breakPercent}%`;
                bar.appendChild(breakSegment);
            }

            // Empty segment (remaining space up to 60 minutes)
            if (emptyPercent > 0) {
                const emptySegment = document.createElement('div');
                emptySegment.className = 'timeline-bar-segment empty-remaining';
                emptySegment.style.height = `${emptyPercent}%`;
                bar.appendChild(emptySegment);
            }

            // Add hover indicator
            const indicator = document.createElement('div');
            indicator.className = 'timeline-bar-indicator';
            bar.appendChild(indicator);

            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'timeline-bar-tooltip';
            
            let tooltipText = '';
            if (hour.focus > 0) {
                const focusHours = Math.floor(hour.focus / 60);
                const focusMins = Math.round(hour.focus % 60);
                tooltipText = focusHours > 0 ? `${focusHours} S ${focusMins} D` : `${focusMins} D`;
            }
            if (hour.break > 0) {
                const breakHours = Math.floor(hour.break / 60);
                const breakMins = Math.round(hour.break % 60);
                const breakText = breakHours > 0 ? `${breakHours} S ${breakMins} D` : `${breakMins} D`;
                tooltipText += tooltipText ? ` + ${breakText} (mola)` : `${breakText} (mola)`;
            }
            
            tooltip.textContent = tooltipText || '0 D';
            bar.appendChild(tooltip);

            container.appendChild(bar);
        });
    }

    createHourlyDistribution(sessions) {
        // Initialize 24 hours with empty data
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            focus: 0,
            break: 0,
            total: 0
        }));

        // Aggregate session data by distributing across hours
        sessions.forEach(session => {
            if (!session.start_time || !session.end_time || !session.duration) return;

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
                    
                    if (session.session_type === 'focus' || session.session_type === 'custom') {
                        hourlyData[hour].focus += minutesInThisHour;
                    } else if (session.session_type === 'break') {
                        hourlyData[hour].break += minutesInThisHour;
                    }
                    
                    hourlyData[hour].total += minutesInThisHour;
                }
            }
        });

        return hourlyData;
    }

    // ========================================
    // FOCUS TREND CARD
    // ========================================

    async updateFocusTrend(date = this.currentDate) {
        const trendCard = document.getElementById('focus-trend-card');
        const comparisonText = document.getElementById('trend-comparison-text');
        
        // Time displays
        const trendToday = document.getElementById('trend-today');
        const trendYesterday = document.getElementById('trend-yesterday');
        const trendDayBefore = document.getElementById('trend-day-before');
        
        // Date displays
        const trendTodayDate = document.getElementById('trend-today-date');
        const trendYesterdayDate = document.getElementById('trend-yesterday-date');
        const trendDayBeforeDate = document.getElementById('trend-day-before-date');
        
        // Bar fills
        const todayFill = document.getElementById('trend-today-fill');
        const yesterdayFill = document.getElementById('trend-yesterday-fill');
        const dayBeforeFill = document.getElementById('trend-day-before-fill');
        
        // Comparison dots
        const yesterdayDot = document.getElementById('trend-yesterday-dot');
        const yesterdayTooltip = document.getElementById('trend-yesterday-tooltip');
        const dayBeforeDot = document.getElementById('trend-day-before-dot');
        const dayBeforeTooltip = document.getElementById('trend-day-before-tooltip');

        if (!trendCard || !window.sessionManager) {
            return;
        }

        // Helper function to get total focus time for a date
        const getTotalFocusTime = (targetDate) => {
            const sessions = window.sessionManager.getSessionsForDate(targetDate);
            const totalMinutes = sessions.reduce((sum, session) => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    return sum + (session.duration || 0);
                }
                return sum;
            }, 0);
            return totalMinutes;
        };

        // Helper function to get focus time up to current hour for a date
        const getFocusTimeUpToCurrentHour = (targetDate) => {
            const currentHour = new Date().getHours();
            const currentMinute = new Date().getMinutes();
            const sessions = window.sessionManager.getSessionsForDate(targetDate);
            
            const totalMinutes = sessions.reduce((sum, session) => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    const sessionDate = new Date(session.start_time);
                    const sessionHour = sessionDate.getHours();
                    const sessionMinute = sessionDate.getMinutes();
                    
                    // Only count sessions that started before or at current time
                    if (sessionHour < currentHour || (sessionHour === currentHour && sessionMinute <= currentMinute)) {
                        return sum + (session.duration || 0);
                    }
                }
                return sum;
            }, 0);
            return totalMinutes;
        };

        // Helper function to format time
        const formatTime = (minutes) => {
            if (minutes === 0) return '0 S';
            if (minutes < 60) {
                return `${minutes} D`;
            }
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes === 0) {
                return `${hours} S`;
            }
            return `${hours} S ${remainingMinutes} D`;
        };

        // Helper function to format date (Turkish short month)
        const formatDate = (date) => {
            const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
            return `${date.getDate()} ${months[date.getMonth()]}`;
        };

        // Calculate dates
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);

        // Get focus times
        const todayTotal = getTotalFocusTime(today);
        const yesterdayTotal = getTotalFocusTime(yesterday);
        const dayBeforeTotal = getTotalFocusTime(dayBefore);
        
        // Get focus times up to current hour for comparison
        const yesterdaySameTimeTotal = getFocusTimeUpToCurrentHour(yesterday);
        const dayBeforeSameTimeTotal = getFocusTimeUpToCurrentHour(dayBefore);

        // Update text displays
        trendToday.textContent = formatTime(todayTotal);
        trendYesterday.textContent = formatTime(yesterdayTotal);
        trendDayBefore.textContent = formatTime(dayBeforeTotal);

        // Update dates
        if (trendTodayDate) trendTodayDate.textContent = formatDate(today);
        if (trendYesterdayDate) trendYesterdayDate.textContent = formatDate(yesterday);
        if (trendDayBeforeDate) trendDayBeforeDate.textContent = formatDate(dayBefore);

        // Calculate comparison text
        const hasData = todayTotal > 0 || yesterdayTotal > 0 || dayBeforeTotal > 0;
        if (hasData && comparisonText) {
            const diff = todayTotal - yesterdayTotal;
            if (diff > 0) {
                comparisonText.textContent = `Dünden ${diff} dakika daha fazla çalıştın`;
                comparisonText.style.color = '#48C9A8';
            } else if (diff < 0) {
                comparisonText.textContent = `Dünden ${Math.abs(diff)} dakika daha az çalıştın`;
                comparisonText.style.color = '#48C9A8';
            } else {
                comparisonText.textContent = `Dünle aynı`;
                comparisonText.style.color = '#48C9A8';
            }
        } else if (comparisonText) {
            comparisonText.textContent = 'Analiz edilecek veri yok';
            comparisonText.style.color = '#48C9A8';
        }

        // Calculate bar widths and dot positions
        // Minimum is 25 minutes, bars scale proportionally
        const minBarMinutes = 25;
        const maxMinutes = Math.max(todayTotal, yesterdayTotal, dayBeforeTotal, minBarMinutes);
        
        // Calculate percentages
        const todayPercent = (todayTotal / maxMinutes) * 100;
        const yesterdayPercent = (yesterdayTotal / maxMinutes) * 100;
        const dayBeforePercent = (dayBeforeTotal / maxMinutes) * 100;
        
        // Calculate dot positions (percentage of the ENTIRE bar background for that day)
        // This positions the dot relative to the background container, not just the filled portion
        const yesterdayDotPercent = yesterdayTotal > 0 ? (yesterdaySameTimeTotal / maxMinutes) * 100 : 0;
        const dayBeforeDotPercent = dayBeforeTotal > 0 ? (dayBeforeSameTimeTotal / maxMinutes) * 100 : 0;

        // Update bars
        if (todayFill) {
            todayFill.style.width = `${Math.max(todayPercent, 0)}%`;
        }
        if (yesterdayFill) {
            yesterdayFill.style.width = `${Math.max(yesterdayPercent, 0)}%`;
        }
        if (dayBeforeFill) {
            dayBeforeFill.style.width = `${Math.max(dayBeforePercent, 0)}%`;
        }

        // Update dots - positioned on the bar showing "at this same time yesterday/day before"
        // If no work was done, show dot at the start (0%) to indicate comparison point
        if (yesterdayDot && yesterdayTooltip) {
            // Always show dot, even if no work was done (position at 0%)
            yesterdayDot.style.left = `${yesterdayDotPercent}%`;
            yesterdayDot.style.display = 'block';
            yesterdayTooltip.textContent = formatTime(yesterdaySameTimeTotal);
        }

        if (dayBeforeDot && dayBeforeTooltip) {
            // Always show dot, even if no work was done (position at 0%)
            dayBeforeDot.style.left = `${dayBeforeDotPercent}%`;
            dayBeforeDot.style.display = 'block';
            dayBeforeTooltip.textContent = formatTime(dayBeforeSameTimeTotal);
        }

        // Show the card only if:
        // 1. We're in daily view AND
        // 2. The selected date is TODAY (not a past date)
        const isDaily = this.currentPeriod === 'daily';
        const selectedDate = new Date(date);
        const todayDate = new Date();
        
        // Compare dates (ignore time)
        const isToday = selectedDate.toDateString() === todayDate.toDateString();
        
        if (isDaily && isToday) {
            trendCard.classList.remove('hidden');
        } else {
            trendCard.classList.add('hidden');
        }
    }

    // Update Weekly Focus Distribution
    // ========================================
    // WEEKLY FOCUS TIME DISTRIBUTION
    // ========================================

    updateWeeklyFocusDistribution() {
        if (!window.sessionManager) {
            this.weeklyBarChart.render([]);
            return;
        }

        // Get week start (Sunday)
        const weekStart = this.getWeekStart(this.selectedWeek || this.currentDate);
        
        // Create array of 7 days starting from Sunday
        const weekData = [];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            
            const sessions = window.sessionManager.getSessionsForDate(dayDate);
            const focusMinutes = sessions.reduce((sum, session) => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    return sum + (session.duration || 0);
                }
                return sum;
            }, 0);
            
            weekData.push({
                label: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][i],
                value: focusMinutes,
                isActive: this.isSameDay(dayDate, new Date())
            });
        }

        // Render using component
        this.weeklyBarChart.render(weekData);
    }

    // MONTHLY FOCUS TIME DISTRIBUTION
    // ========================================

    updateMonthlyFocusDistribution() {
        if (!window.sessionManager) {
            this.monthlyBarChart.render([]);
            return;
        }

        // Get the current month's start and end dates
        const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = monthEnd.getDate();
        
        // Create array for all days in the month
        const monthData = [];
        const xAxisLabels = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            
            const sessions = window.sessionManager.getSessionsForDate(dayDate);
            const focusMinutes = sessions.reduce((sum, session) => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    return sum + (session.duration || 0);
                }
                return sum;
            }, 0);
            
            monthData.push({
                label: `${this.currentDate.getMonth() + 1}/${day}`,
                value: focusMinutes,
                isActive: this.isSameDay(dayDate, new Date())
            });
        }

        // Generate X-axis labels (show dates at intervals)
        // For ~30 days, show ~5 labels: 1st, 8th, 16th, 24th, last
        const labelPositions = [1, 8, 16, 24, daysInMonth];
        for (let i = 0; i < daysInMonth; i++) {
            const day = i + 1;
            if (labelPositions.includes(day)) {
                xAxisLabels.push(`${this.currentDate.getMonth() + 1}/${day}`);
            } else {
                xAxisLabels.push(''); // Empty label for other positions
            }
        }

        // Update component's X-axis labels and render
        this.monthlyBarChart.config.xAxisLabels = xAxisLabels;
        this.monthlyBarChart.render(monthData);
        
        // Render X-axis labels manually since we have dynamic positioning
        this.renderMonthlyXAxisLabels(xAxisLabels, daysInMonth);
    }

    renderMonthlyXAxisLabels(labels, totalDays) {
        const xAxisContainer = document.getElementById('monthly-x-axis');
        if (!xAxisContainer) return;

        xAxisContainer.innerHTML = '';
        
        // Show labels at key positions: 1st, 8th, 16th, 24th, last day
        const labelDays = [1, 8, 16, 24, totalDays];
        
        // Create a wrapper that matches the bars grid
        const wrapper = document.createElement('div');
        wrapper.style.display = 'grid';
        wrapper.style.gridTemplateColumns = `repeat(${totalDays}, 1fr)`;
        wrapper.style.gap = '6px'; // Same as bars gap
        wrapper.style.width = '100%';
        
        // Create all grid items (one for each day)
        for (let day = 1; day <= totalDays; day++) {
            const span = document.createElement('span');
            span.style.textAlign = 'center';
            span.style.fontSize = '11px';
            span.style.color = '#999999';
            span.style.fontWeight = '500';
            
            // Only show label for specific days
            if (labelDays.includes(day)) {
                span.textContent = `${this.currentDate.getMonth() + 1}/${day}`;
            } else {
                span.innerHTML = '&nbsp;'; // Empty but maintains grid position
            }
            
            wrapper.appendChild(span);
        }
        
        xAxisContainer.appendChild(wrapper);
    }

    // YEARLY FOCUS TIME DISTRIBUTION
    // ========================================

    updateYearlyFocusDistribution() {
        if (!window.sessionManager) {
            this.yearlyBarChart.render([]);
            return;
        }

        // Get all months in the current year
        const year = this.currentDate.getFullYear();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Create array for all 12 months
        const yearData = [];

        for (let month = 0; month < 12; month++) {
            // Get first and last day of the month
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            
            let totalMinutes = 0;
            
            // Aggregate all sessions in this month
            for (let day = 1; day <= monthEnd.getDate(); day++) {
                const dayDate = new Date(year, month, day);
                const sessions = window.sessionManager.getSessionsForDate(dayDate);
                
                totalMinutes += sessions.reduce((sum, session) => {
                    if (session.session_type === 'focus' || session.session_type === 'custom') {
                        return sum + (session.duration || 0);
                    }
                    return sum;
                }, 0);
            }
            
            yearData.push({
                label: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][month],
                value: totalMinutes,
                isActive: month === currentMonth && year === currentYear // Highlight current month
            });
        }

        // Render using component
        this.yearlyBarChart.render(yearData);
    }

    // WEEKLY FOCUS TREND
    // ========================================

    updateWeeklyFocusTrend() {
        if (!window.sessionManager) {
            this.weeklyFocusTrend.render([]);
            return;
        }

        // Get current week, last week, and week before
        const thisWeekStart = this.getWeekStart(this.currentDate);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const weekBeforeStart = new Date(thisWeekStart);
        weekBeforeStart.setDate(weekBeforeStart.getDate() - 14);

        // Calculate total minutes for each week
        const thisWeekTotal = this.getWeekTotalMinutes(thisWeekStart);
        const lastWeekTotal = this.getWeekTotalMinutes(lastWeekStart);
        const weekBeforeTotal = this.getWeekTotalMinutes(weekBeforeStart);

        // Calculate "up to this point" for last week (same day/time comparison)
        const now = new Date();
        const currentDayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Calculate minutes elapsed in current week up to now
        const elapsedMinutesThisWeek = (currentDayOfWeek * 24 * 60) + (currentHour * 60) + currentMinute;
        
        // Get last week's total up to the same point in time
        const lastWeekUpToNow = this.getWeekTotalUpToPoint(lastWeekStart, currentDayOfWeek, currentHour, currentMinute);
        const weekBeforeUpToNow = this.getWeekTotalUpToPoint(weekBeforeStart, currentDayOfWeek, currentHour, currentMinute);

        // Find max for percentage calculation
        const maxTotal = Math.max(thisWeekTotal, lastWeekTotal, weekBeforeTotal, 1);

        // Format dates for display
        const formatWeekDate = (weekStart) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const startDay = weekStart.getDate();
            const endDay = weekEnd.getDate();
            const month = weekEnd.toLocaleDateString('tr-TR', { month: 'short' });
            return `${startDay}-${endDay} ${month}`;
        };

        // Prepare data for component
        const data = [
            {
                label: 'Bu Hafta (şu ana kadar)',
                time: this.formatTimeForTrend(thisWeekTotal),
                date: formatWeekDate(thisWeekStart),
                value: thisWeekTotal,
                percentage: (thisWeekTotal / maxTotal) * 100,
            },
            {
                label: 'Geçen Hafta',
                time: this.formatTimeForTrend(lastWeekTotal),
                date: formatWeekDate(lastWeekStart),
                value: lastWeekTotal,
                percentage: (lastWeekTotal / maxTotal) * 100,
                comparisonPercentage: (lastWeekUpToNow / maxTotal) * 100,
                comparisonTooltip: this.formatTimeForTrend(lastWeekUpToNow)
            },
            {
                label: 'Evvelki Hafta',
                time: this.formatTimeForTrend(weekBeforeTotal),
                date: formatWeekDate(weekBeforeStart),
                value: weekBeforeTotal,
                percentage: (weekBeforeTotal / maxTotal) * 100,
                comparisonPercentage: (weekBeforeUpToNow / maxTotal) * 100,
                comparisonTooltip: this.formatTimeForTrend(weekBeforeUpToNow)
            }
        ];

        // Render using component
        this.weeklyFocusTrend.render(data);
    }

    // YEARLY FOCUS TREND
    // ========================================
    updateYearlyFocusTrend() {
        if (!window.sessionManager) {
            this.yearlyFocusTrend.render([]);
            return;
        }

        const currentYear = this.currentDate.getFullYear();
        const lastYear = currentYear - 1;
        const yearBefore = currentYear - 2;

        // Helper to get total minutes for a full year
        const getYearTotal = (year) => {
            let total = 0;
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const sessions = window.sessionManager.getSessionsForDate(new Date(d));
                total += sessions.reduce((sum, session) => {
                    if (session.session_type === 'focus' || session.session_type === 'custom') {
                        return sum + (session.duration || 0);
                    }
                    return sum;
                }, 0);
            }
            return total;
        };

        // Helper to compute up-to-now total for a given year (same day-of-year and time)
        const getYearTotalUpToPoint = (year) => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentDate = now.getDate();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            let total = 0;

            // Add full days from Jan 1 up to yesterday of the current date in that year
            const start = new Date(year, 0, 1);
            const todayInYear = new Date(year, currentMonth, currentDate);

            for (let d = new Date(start); d < todayInYear; d.setDate(d.getDate() + 1)) {
                const sessions = window.sessionManager.getSessionsForDate(new Date(d));
                total += sessions.reduce((sum, session) => {
                    if (session.session_type === 'focus' || session.session_type === 'custom') {
                        return sum + (session.duration || 0);
                    }
                    return sum;
                }, 0);
            }

            // Add partial for today's date up to current hour/minute
            const sessionsToday = window.sessionManager.getSessionsForDate(todayInYear);
            const currentTimeInMinutes = currentHour * 60 + currentMinute;

            sessionsToday.forEach(session => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    if (!session.start_time || !session.end_time) return;
                    const [sh, sm] = session.start_time.split(':').map(Number);
                    const [eh, em] = session.end_time.split(':').map(Number);
                    const s = sh * 60 + sm;
                    const e = eh * 60 + em;
                    if (s < currentTimeInMinutes) {
                        const effectiveEnd = Math.min(e, currentTimeInMinutes);
                        const duration = Math.max(0, effectiveEnd - s);
                        total += duration;
                    }
                }
            });

            return total;
        };

        const thisYearTotal = getYearTotal(currentYear);
        const lastYearTotal = getYearTotal(lastYear);
        const yearBeforeTotal = getYearTotal(yearBefore);

        const lastYearUpToNow = getYearTotalUpToPoint(lastYear);
        const yearBeforeUpToNow = getYearTotalUpToPoint(yearBefore);

        const maxTotal = Math.max(thisYearTotal, lastYearTotal, yearBeforeTotal, 1);

        const data = [
            {
                label: `${currentYear} (şu ana kadar)`,
                time: this.formatTimeForTrend(thisYearTotal),
                date: currentYear.toString(),
                value: thisYearTotal,
                percentage: (thisYearTotal / maxTotal) * 100
            },
            {
                label: `${lastYear}`,
                time: this.formatTimeForTrend(lastYearTotal),
                date: lastYear.toString(),
                value: lastYearTotal,
                percentage: (lastYearTotal / maxTotal) * 100,
                comparisonPercentage: (lastYearUpToNow / maxTotal) * 100,
                comparisonTooltip: this.formatTimeForTrend(lastYearUpToNow)
            },
            {
                label: `${yearBefore}`,
                time: this.formatTimeForTrend(yearBeforeTotal),
                date: yearBefore.toString(),
                value: yearBeforeTotal,
                percentage: (yearBeforeTotal / maxTotal) * 100,
                comparisonPercentage: (yearBeforeUpToNow / maxTotal) * 100,
                comparisonTooltip: this.formatTimeForTrend(yearBeforeUpToNow)
            }
        ];

        this.yearlyFocusTrend.render(data);
    }

    getWeekTotalMinutes(weekStart) {
        let total = 0;
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const sessions = window.sessionManager.getSessionsForDate(dayDate);
            total += sessions.reduce((sum, session) => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    return sum + (session.duration || 0);
                }
                return sum;
            }, 0);
        }
        return total;
    }

    getWeekTotalUpToPoint(weekStart, dayOfWeek, hour, minute) {
        let total = 0;
        
        // Add full days before current day
        for (let i = 0; i < dayOfWeek; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const sessions = window.sessionManager.getSessionsForDate(dayDate);
            total += sessions.reduce((sum, session) => {
                if (session.session_type === 'focus' || session.session_type === 'custom') {
                    return sum + (session.duration || 0);
                }
                return sum;
            }, 0);
        }
        
        // Add partial day up to current hour/minute
        const currentDayDate = new Date(weekStart);
        currentDayDate.setDate(currentDayDate.getDate() + dayOfWeek);
        const sessions = window.sessionManager.getSessionsForDate(currentDayDate);
        
        const currentTimeInMinutes = hour * 60 + minute;
        
        sessions.forEach(session => {
            if (session.session_type === 'focus' || session.session_type === 'custom') {
                if (!session.start_time || !session.end_time) return;
                
                const [startHour, startMinute] = session.start_time.split(':').map(Number);
                const [endHour, endMinute] = session.end_time.split(':').map(Number);
                
                const sessionStart = startHour * 60 + startMinute;
                const sessionEnd = endHour * 60 + endMinute;
                
                // Only count sessions that started before current time
                if (sessionStart < currentTimeInMinutes) {
                    const effectiveEnd = Math.min(sessionEnd, currentTimeInMinutes);
                    const duration = Math.max(0, effectiveEnd - sessionStart);
                    total += duration;
                }
            }
        });
        
        return total;
    }

    formatTimeForTrend(minutes) {
        if (minutes === 0) return '0 S';
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0 && mins > 0) {
            return `${hours} S ${mins} D`;
        } else if (hours > 0) {
            return `${hours} S`;
        } else {
            return `${mins} D`;
        }
    }

}


