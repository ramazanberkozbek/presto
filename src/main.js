// Pomodoro Timer Application
const { invoke } = window.__TAURI__.core;

class PomodoroTimer {
  constructor() {
    // Timer states
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = 'focus'; // 'focus', 'break', 'longBreak'
    this.timeRemaining = 25 * 60; // 25 minutes in seconds
    this.timerInterval = null;
    
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
    this.timerDisplay = document.getElementById('timer-display');
    this.timerStatus = document.getElementById('timer-status');
    this.sessionInfo = document.getElementById('session-info');
    this.startBtn = document.getElementById('start-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.skipBtn = document.getElementById('skip-btn');
    this.pomodoroDotsContainer = document.getElementById('pomodoro-dots');
    this.completedCountEl = document.getElementById('completed-count');
    this.focusTimeEl = document.getElementById('focus-time');
    this.taskInput = document.getElementById('task-input');
    this.taskList = document.getElementById('task-list');
    this.weeklyStatsContainer = document.getElementById('weekly-stats');
    this.showHistoryBtn = document.getElementById('show-history-btn');
    
    // Task management
    this.tasks = [];
    this.currentTask = '';
    
    this.init();
  }
  
  async init() {
    this.tasks = await this.loadTasks();
    this.updateDisplay();
    this.updateProgress();
    this.setupEventListeners();
    this.renderTasks();
    await this.loadSessionData();
    await this.updateWeeklyStats();
  }
  
  setupEventListeners() {
    this.startBtn.addEventListener('click', () => this.startTimer());
    this.pauseBtn.addEventListener('click', () => this.pauseTimer());
    this.resetBtn.addEventListener('click', () => this.resetTimer());
    this.skipBtn.addEventListener('click', () => this.skipSession());
    this.showHistoryBtn.addEventListener('click', () => this.showHistoryModal());
    
    this.taskInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await this.addTask();
      }
    });
    
    // Auto-save current task
    this.taskInput.addEventListener('input', (e) => {
      this.currentTask = e.target.value;
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only trigger if not typing in an input
      if (e.target.tagName !== 'INPUT') {
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            if (this.isRunning) {
              this.pauseTimer();
            } else {
              this.startTimer();
            }
            break;
          case 'KeyR':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.resetTimer();
            }
            break;
          case 'KeyS':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.skipSession();
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
  
  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.isPaused = false;
      
      this.timerInterval = setInterval(() => {
        this.timeRemaining--;
        this.updateDisplay();
        
        // Warning when less than 2 minutes remaining
        if (this.timeRemaining <= 120 && this.timeRemaining > 0) {
          this.addWarningClass();
        }
        
        if (this.timeRemaining <= 0) {
          this.completeSession();
        }
      }, 1000);
      
      this.updateButtons();
      this.playNotificationSound();
      this.showNotificationPing('Timer started! 🍅');
    }
  }
  
  pauseTimer() {
    if (this.isRunning) {
      this.isRunning = false;
      this.isPaused = true;
      clearInterval(this.timerInterval);
      this.updateButtons();
      this.showNotificationPing('Timer paused ⏸️');
    }
  }
  
  resetTimer() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);
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
    
    this.showNotificationPing(messages[this.currentMode] || messages.focus);
  }
  
  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update status
    const statusTexts = {
      focus: 'Focus Time! 🍅',
      break: 'Short Break 😌',
      longBreak: 'Long Break 🎉'
    };
    this.timerStatus.textContent = statusTexts[this.currentMode];
    
    // Update session info
    if (this.currentMode === 'focus') {
      this.sessionInfo.textContent = `Session ${this.currentSession} of ${this.totalSessions}`;
    } else {
      this.sessionInfo.textContent = `Take a ${this.currentMode === 'longBreak' ? 'long' : 'short'} break`;
    }
    
    // Update container class for styling
    const container = document.querySelector('.timer-container');
    container.className = `timer-container ${this.currentMode}`;
    
    // Add running class when timer is active
    if (this.isRunning) {
      container.classList.add('running');
    }
    
    // Add warning class when time is running low
    if (this.timeRemaining <= 120 && this.timeRemaining > 0 && this.isRunning) {
      container.classList.add('warning');
    }
    
    // Update page title
    const statusIcon = this.currentMode === 'focus' ? '🍅' : (this.currentMode === 'break' ? '😌' : '🎉');
    document.title = `${statusIcon} ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - Tempo`;
  }
  
  updateButtons() {
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
  }
  
  updateProgress() {
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
    const today = new Date();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    this.weeklyStatsContainer.innerHTML = '';
    
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
        dayElement.classList.add('completed');
      }
      
      const hours = Math.floor(focusTime / 3600);
      const minutes = Math.floor((focusTime % 3600) / 60);
      
      dayElement.innerHTML = `
        <div class="day-label">${weekDays[date.getDay()]}</div>
        <div class="day-count">${completed}</div>
        <div class="day-time">${hours}h ${minutes}m</div>
      `;
      
      this.weeklyStatsContainer.appendChild(dayElement);
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
      const tasks = await invoke('load_tasks');
      return tasks || [];
    } catch (error) {
      console.error('Failed to load tasks from Tauri, using localStorage:', error);
      const saved = localStorage.getItem('pomodoro-tasks');
      return saved ? JSON.parse(saved) : [];
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
          this.updateProgress();
        }
      }
    }
  }
  
  // Notifications
  showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const messages = {
        focus: 'Break time! Take a rest 😌',
        break: 'Break over! Time to focus 🍅',
        longBreak: 'Long break over! Ready for more focus? 🚀'
      };
      
      new Notification('Tempo - Pomodoro Timer', {
        body: messages[this.currentMode],
        icon: '/assets/tauri.svg'
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
  
  // Visual notification helper
  showNotificationPing(message) {
    // Remove existing notification
    const existing = document.querySelector('.notification-ping');
    if (existing) {
      existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification-ping';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }
  
  // Add warning styling
  addWarningClass() {
    const container = document.querySelector('.timer-container');
    if (!container.classList.contains('warning')) {
      container.classList.add('warning');
    }
  }
}

// Initialize the timer when the page loads
let timer;

window.addEventListener("DOMContentLoaded", () => {
  // Request notification permission
  if ('Notification' in window) {
    Notification.requestPermission();
  }
  
  // Initialize the timer
  timer = new PomodoroTimer();
});
