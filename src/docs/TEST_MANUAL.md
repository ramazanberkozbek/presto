# Testing Commands for Timer Sessions

This document contains JavaScript console commands to test the unified session management system by adding fake timer sessions and cleaning them up afterward.

## Add Fake Timer Sessions

Use this command in the browser console to generate realistic fake timer sessions for testing:

```javascript
// Command to add fake timer sessions for testing
(async function addFakeTimerSessions() {
    if (!window.sessionManager) {
        console.error('SessionManager not available');
        return;
    }
    
    // Generate sessions for the last 7 days
    const sessions = [];
    const now = new Date();
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(now);
        date.setDate(now.getDate() - dayOffset);
        
        // Generate 2-4 random sessions per day
        const sessionsPerDay = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < sessionsPerDay; i++) {
            // Random time between 9:00 and 18:00
            const startHour = Math.floor(Math.random() * 9) + 9;
            const startMinute = Math.floor(Math.random() * 60);
            
            // Random duration between 20-30 minutes (simulates timer sessions)
            const duration = Math.floor(Math.random() * 11) + 20;
            
            const endTotalMinutes = startHour * 60 + startMinute + duration;
            const endHour = Math.floor(endTotalMinutes / 60);
            const endMinute = endTotalMinutes % 60;
            
            const session = {
                id: `timer_fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                session_type: 'focus',
                duration: duration,
                start_time: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
                end_time: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
                notes: `Timer session ${i + 1}`,
                created_at: new Date(date.getTime() + startHour * 3600000 + startMinute * 60000).toISOString()
            };
            
            sessions.push({ session, date });
        }
    }
    
    // Add all sessions
    for (const { session, date } of sessions) {
        window.sessionManager.selectedDate = date;
        await window.sessionManager.addSession(session);
    }
    
    console.log(` Added ${sessions.length} fake timer sessions!`);
    
    // Update statistics
    if (window.navigationManager) {
        await window.navigationManager.updateCalendar();
        await window.navigationManager.updateFocusSummary();
        await window.navigationManager.updateWeeklySessionsChart();
        await window.navigationManager.updateDailyChart();
        console.log('=Ê Statistics updated!');
    }
})();
```

## Clean Up Fake Sessions

Use this command to remove all fake sessions after testing:

```javascript
// Remove all fake sessions
(async function removeFakeSessions() {
    if (!window.sessionManager) {
        console.error('SessionManager not available');
        return;
    }
    
    const allSessions = window.sessionManager.sessions;
    let removedCount = 0;
    
    for (const dateKey in allSessions) {
        const sessions = allSessions[dateKey];
        const filtered = sessions.filter(s => !s.id.includes('timer_fake_'));
        const removed = sessions.length - filtered.length;
        removedCount += removed;
        allSessions[dateKey] = filtered;
    }
    
    await window.sessionManager.saveSessionsToStorage();
    console.log(`=Ñ Removed ${removedCount} fake sessions`);
    
    // Update statistics
    if (window.navigationManager) {
        await window.navigationManager.updateCalendar();
        await window.navigationManager.updateFocusSummary();
        await window.navigationManager.updateWeeklySessionsChart();
        await window.navigationManager.updateDailyChart();
        console.log('=Ê Statistics refreshed!');
    }
})();
```

## How to Use

1. Open the browser console (F12 ’ Console tab)
2. Copy and paste the first command to add fake sessions
3. Navigate to the Statistics page to verify the sessions appear
4. Use the second command to clean up when done testing

## What the Commands Do

### Add Fake Sessions Command:
- Creates realistic focus sessions with 20-30 minute durations
- Distributes sessions during work hours (9:00 AM - 6:00 PM)
- Adds 2-4 sessions per day for the last 7 days
- Uses unique IDs with "timer_fake_" prefix for easy identification
- Automatically updates all charts and statistics

### Clean Up Command:
- Removes all sessions containing "timer_fake_" in their ID
- Preserves all real sessions (both manual and actual timer sessions)
- Updates storage and refreshes all statistics
- Provides count of removed sessions

## Expected Results

After running the add command, you should see:
- Calendar dots appearing on the last 7 days
- Weekly statistics showing focus time and session counts
- Charts populated with session data
- Session history showing the fake timer sessions

This helps verify that the unified session management system correctly handles timer sessions alongside manual sessions.