# Testing Reset All Data Function

## What Has Been Implemented

### 1. Event Listeners Setup
- ✅ Removed inline `onclick` attributes from settings buttons
- ✅ Added proper event listeners in `DOMContentLoaded`
- ✅ Added debug logging for troubleshooting

### 2. Complete Data Reset Function
The `performTotalReset()` function now:
- ✅ Calls backend `reset_all_data()` to delete files
- ✅ Clears all localStorage data:
  - `pomodoro-session`
  - `pomodoro-tasks`
  - `pomodoro-settings`
  - `pomodoro-history`
  - `pomodoro-stats`
- ✅ Resets timer to initial state
- ✅ Resets settings to defaults (forced)
- ✅ Clears tasks array
- ✅ Switches back to timer view
- ✅ Reloads the page to ensure clean state

### 3. Backend Reset Function
The Rust `reset_all_data()` function deletes:
- ✅ `session.json`
- ✅ `tasks.json`
- ✅ `history.json`
- ✅ `settings.json`

### 4. User Experience
- ✅ Double confirmation dialogs
- ✅ Loading state during reset
- ✅ Detailed error logging
- ✅ Page reload for clean state

## How to Test

1. **Start the application**: `npm run tauri dev`
2. **Create some data**:
   - Start some pomodoro sessions
   - Add some tasks
   - Change some settings
3. **Navigate to Settings**:
   - Click the settings icon in sidebar
   - Scroll down to "Danger Zone"
4. **Test the reset**:
   - Click "Reset All Data"
   - Confirm first dialog
   - Confirm second dialog
   - Watch console for debug logs
   - Verify page reloads with clean state

## Expected Behavior

After reset:
- Timer should show 25:00
- Session should be 1/10
- All tasks should be gone
- Settings should be back to defaults
- All statistics should be reset
- Application should look like first launch

## Debug Information

Check browser console for these logs:
- "Reset button clicked via event listener"
- "confirmTotalReset called"
- "performTotalReset started"
- "Calling reset_all_data..."
- "reset_all_data completed successfully"
- "Clearing localStorage..."
- "localStorage cleared"
- "Timer reset to initial state"
- "Settings reset to defaults"
- "Switched to timer view"
- "Refreshing UI..."
