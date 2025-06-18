# Analytics Integration with Aptabase

Presto now includes analytics tracking using [Aptabase](https://aptabase.com), a privacy-first analytics platform for desktop, mobile, and web applications.

## What's Tracked

### Automatic Events
- **app_started**: When the application launches
- **app_exited**: When the application closes

### User Action Events
- **session_saved**: When a Pomodoro session data is saved
- **tasks_saved**: When task list is updated
- **settings_saved**: When app settings are changed

## Frontend Analytics

You can track custom events from the frontend using the `Analytics` utility class:

```javascript
import Analytics from './utils/analytics.js';

// Track timer events
Analytics.timer.started('focus', 25);
Analytics.timer.completed('focus', 25);
Analytics.timer.paused('break', 120);

// Track task events
Analytics.tasks.created();
Analytics.tasks.completed();

// Track feature usage
Analytics.features.used('smart_pause');
Analytics.features.shortcutUsed('start-stop');
Analytics.features.viewChanged('statistics');

// Track settings changes
Analytics.settings.changed('timer', 'focus_duration', 30);
Analytics.settings.themeChanged('dark');

// Track session progress
Analytics.sessions.completed(5, 1500); // 5 pomodoros, 1500 seconds
Analytics.sessions.goalProgress(125, 90); // goal: 125min, achieved: 90min
```

## Privacy

- Aptabase is privacy-first and GDPR compliant
- No personal data is collected
- Only aggregated usage patterns are tracked
- App key: `A-EU-9457123106` (European server)

## Data Collected

The analytics help understand:
- Which features are most used
- Average session lengths
- Common timer configurations
- App stability and error patterns

All data is anonymized and used solely for improving the user experience.

## Configuration

The analytics integration is configured in:
- **Rust backend**: `src-tauri/src/lib.rs` - Plugin initialization and core events
- **Frontend utility**: `src/utils/analytics.js` - User action tracking
- **App key**: Configured during plugin setup

## Viewing Analytics

Analytics data can be viewed in the Aptabase dashboard at [aptabase.com](https://aptabase.com) using the configured app key.
