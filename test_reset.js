// Test Script for Reset Function
// Run this in the browser console to test the reset function

console.log("=== TESTING RESET FUNCTION ===");

// Test 1: Check if functions exist
console.log("1. Checking function existence:");
console.log("  confirmTotalReset:", typeof window.confirmTotalReset);
console.log("  performTotalReset:", typeof window.performTotalReset);
console.log("  pomodoroTimer:", typeof window.pomodoroTimer);
console.log("  settingsManager:", typeof window.settingsManager);
console.log("  navigationManager:", typeof window.navigationManager);

// Test 2: Check localStorage before reset
console.log("\n2. Current localStorage data:");
console.log("  pomodoro-session:", localStorage.getItem('pomodoro-session'));
console.log("  pomodoro-tasks:", localStorage.getItem('pomodoro-tasks'));
console.log("  pomodoro-settings:", localStorage.getItem('pomodoro-settings'));

// Test 3: Check current timer state
if (window.pomodoroTimer) {
  console.log("\n3. Current timer state:");
  console.log("  completedPomodoros:", window.pomodoroTimer.completedPomodoros);
  console.log("  currentSession:", window.pomodoroTimer.currentSession);
  console.log("  tasks length:", window.pomodoroTimer.tasks ? window.pomodoroTimer.tasks.length : 'undefined');
  console.log("  timeRemaining:", window.pomodoroTimer.timeRemaining);
}

// Test 4: Check button exists
const resetBtn = document.getElementById('reset-all-data-btn');
console.log("\n4. Reset button check:");
console.log("  Button exists:", !!resetBtn);
console.log("  Button text:", resetBtn ? resetBtn.textContent : 'N/A');

console.log("\n=== TEST COMPLETE ===");
console.log("To run manual reset test: confirmTotalReset()");
