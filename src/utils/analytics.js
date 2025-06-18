// Analytics utility for tracking events with Aptabase
import { trackEvent } from "@aptabase/tauri";

/**
 * Analytics utility class for tracking user events
 */
class Analytics {
    /**
     * Track timer-related events
     */
    static timer = {
        /**
         * Track when a timer is started
         * @param {string} mode - The timer mode (focus, break, longBreak)
         * @param {number} duration - Duration in minutes
         */
        started(mode, duration) {
            trackEvent("timer_started", {
                mode,
                duration_minutes: duration
            });
        },

        /**
         * Track when a timer is paused
         * @param {string} mode - The timer mode
         * @param {number} remainingTime - Remaining time in seconds
         */
        paused(mode, remainingTime) {
            trackEvent("timer_paused", {
                mode,
                remaining_seconds: remainingTime
            });
        },

        /**
         * Track when a timer is completed
         * @param {string} mode - The timer mode
         * @param {number} duration - Duration in minutes
         */
        completed(mode, duration) {
            trackEvent("timer_completed", {
                mode,
                duration_minutes: duration
            });
        },

        /**
         * Track when a timer is skipped
         * @param {string} mode - The timer mode
         * @param {number} remainingTime - Remaining time in seconds
         */
        skipped(mode, remainingTime) {
            trackEvent("timer_skipped", {
                mode,
                remaining_seconds: remainingTime
            });
        },

        /**
         * Track when a timer is reset
         * @param {string} mode - The timer mode
         */
        reset(mode) {
            trackEvent("timer_reset", { mode });
        }
    };

    /**
     * Track task-related events
     */
    static tasks = {
        /**
         * Track when a task is created
         */
        created() {
            trackEvent("task_created");
        },

        /**
         * Track when a task is completed
         */
        completed() {
            trackEvent("task_completed");
        },

        /**
         * Track when a task is deleted
         */
        deleted() {
            trackEvent("task_deleted");
        },

        /**
         * Track when tasks are bulk imported/exported
         * @param {number} count - Number of tasks
         * @param {string} action - 'import' or 'export'
         */
        bulkAction(count, action) {
            trackEvent("tasks_bulk_action", {
                count,
                action
            });
        }
    };

    /**
     * Track feature usage
     */
    static features = {
        /**
         * Track when a specific feature is used
         * @param {string} feature - Feature name
         * @param {Object} properties - Additional properties
         */
        used(feature, properties = {}) {
            trackEvent("feature_used", {
                feature,
                ...properties
            });
        },

        /**
         * Track shortcuts usage
         * @param {string} shortcut - Shortcut name (start-stop, reset, skip)
         */
        shortcutUsed(shortcut) {
            trackEvent("shortcut_used", { shortcut });
        },

        /**
         * Track when smart pause is triggered
         * @param {number} inactiveTime - Time inactive in seconds
         */
        smartPauseTriggered(inactiveTime) {
            trackEvent("smart_pause_triggered", {
                inactive_seconds: inactiveTime
            });
        },

        /**
         * Track view changes
         * @param {string} view - View name (timer, tasks, statistics, settings)
         */
        viewChanged(view) {
            trackEvent("view_changed", { view });
        }
    };

    /**
     * Track settings changes
     */
    static settings = {
        /**
         * Track when settings are changed
         * @param {string} category - Settings category
         * @param {string} setting - Setting name
         * @param {any} value - New value
         */
        changed(category, setting, value) {
            trackEvent("setting_changed", {
                category,
                setting,
                value: String(value)
            });
        },

        /**
         * Track when theme is changed
         * @param {string} theme - Theme name
         */
        themeChanged(theme) {
            trackEvent("theme_changed", { theme });
        }
    };

    /**
     * Track session-related events
     */
    static sessions = {
        /**
         * Track session completion
         * @param {number} completedPomodoros - Number of completed pomodoros
         * @param {number} totalFocusTime - Total focus time in minutes
         */
        completed(completedPomodoros, totalFocusTime) {
            trackEvent("session_completed", {
                completed_pomodoros: completedPomodoros,
                total_focus_minutes: Math.round(totalFocusTime / 60)
            });
        },

        /**
         * Track daily goal achievement
         * @param {number} goalMinutes - Goal in minutes
         * @param {number} achievedMinutes - Achieved minutes
         */
        goalProgress(goalMinutes, achievedMinutes) {
            const percentage = Math.round((achievedMinutes / goalMinutes) * 100);
            trackEvent("daily_goal_progress", {
                goal_minutes: goalMinutes,
                achieved_minutes: achievedMinutes,
                percentage
            });
        }
    };

    /**
     * Track errors and issues
     */
    static errors = {
        /**
         * Track when an error occurs
         * @param {string} error - Error message or type
         * @param {string} context - Where the error occurred
         */
        occurred(error, context) {
            trackEvent("error_occurred", {
                error: String(error),
                context
            });
        }
    };
}

export default Analytics;
