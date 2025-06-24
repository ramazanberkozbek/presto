// Session Management Functions
import { NotificationUtils } from '../utils/common-utils.js';

// Get Tauri invoke function
const { invoke } = window.__TAURI__ ? window.__TAURI__.core : { invoke: null };

export class SessionManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.currentEditingSession = null;
        this.selectedDate = null;
        this.sessions = []; // Local session storage for backward compatibility
        this.isUsingTauri = !!invoke; // Check if Tauri is available
        this.init();
    }

    async init() {
        await this.loadSessionsFromStorage();
        this.setupEventListeners();
    }

    // Load sessions from storage (Tauri backend or localStorage fallback)
    async loadSessionsFromStorage() {
        try {
            if (this.isUsingTauri) {
                // Use Tauri backend for persistent storage
                const sessions = await invoke('load_manual_sessions');
                
                // Convert array to date-keyed object for backward compatibility
                this.sessions = {};
                sessions.forEach(session => {
                    if (!this.sessions[session.date]) {
                        this.sessions[session.date] = [];
                    }
                    this.sessions[session.date].push(session);
                });
                
                console.log('Loaded', sessions.length, 'manual sessions from Tauri backend');
            } else {
                // Fallback to localStorage
                const savedSessions = localStorage.getItem('presto_manual_sessions');
                if (savedSessions) {
                    this.sessions = JSON.parse(savedSessions);
                    console.log('Loaded manual sessions from localStorage (fallback)');
                }
            }
        } catch (error) {
            console.error('Error loading sessions from storage:', error);
            this.sessions = {};
        }
    }

    // Save sessions to storage (Tauri backend or localStorage fallback)
    async saveSessionsToStorage() {
        try {
            if (this.isUsingTauri) {
                // Convert date-keyed object to array for Tauri backend
                const sessionsArray = [];
                Object.keys(this.sessions).forEach(date => {
                    this.sessions[date].forEach(session => {
                        sessionsArray.push({
                            ...session,
                            date: date // Ensure date is included
                        });
                    });
                });
                
                await invoke('save_manual_sessions', { sessions: sessionsArray });
                console.log('Saved', sessionsArray.length, 'manual sessions to Tauri backend');
            } else {
                // Fallback to localStorage
                localStorage.setItem('presto_manual_sessions', JSON.stringify(this.sessions));
                console.log('Saved manual sessions to localStorage (fallback)');
            }
        } catch (error) {
            console.error('Error saving sessions to storage:', error);
        }
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
            created_at: new Date().toISOString(),
            tags: [] // Manual sessions start without tags, but field is included for compatibility
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
                NotificationUtils.showNotificationPing('Session updated successfully', 'success');
            } else {
                // Add new session
                await this.addSession(sessionData);
                NotificationUtils.showNotificationPing('Session added successfully', 'success');
            }

            // Store the selected date before closing modal (as closeModal sets it to null)
            const dateForRefresh = this.selectedDate;
            this.closeModal();

            // Refresh the session list
            if (this.navManager) {
                await this.navManager.updateSelectedDayDetails(dateForRefresh);
                await this.navManager.updateFocusSummary();
                await this.navManager.updateWeeklySessionsChart();
                await this.navManager.updateDailyChart();
            }

        } catch (error) {
            console.error('Error saving session:', error);
            NotificationUtils.showNotificationPing('Failed to save session', 'error');
        }
    }

    async addSession(sessionData) {
        // Use current date if selectedDate is null (e.g., when called from timer)
        const targetDate = this.selectedDate || new Date();
        const dateString = targetDate.toDateString();

        // Add to local storage
        if (!this.sessions[dateString]) {
            this.sessions[dateString] = [];
        }

        this.sessions[dateString].push(sessionData);
        
        // Save to storage (Tauri backend or localStorage)
        await this.saveSessionsToStorage();
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

        // Save to storage (Tauri backend or localStorage)
        await this.saveSessionsToStorage();
    }

    async deleteCurrentSession() {
        if (!this.currentEditingSession) return;

        try {
            const dateString = this.selectedDate.toDateString();

            // Remove from local storage
            if (this.sessions[dateString]) {
                this.sessions[dateString] = this.sessions[dateString].filter(s => s.id !== this.currentEditingSession.id);
            }

            // Save to storage (Tauri backend or localStorage)
            await this.saveSessionsToStorage();

            // Store the selected date before closing modal (as closeModal sets it to null)
            const dateForRefresh = this.selectedDate;
            this.closeModal();
            NotificationUtils.showNotificationPing('Session deleted successfully', 'success');

            // Refresh the session list
            if (this.navManager) {
                await this.navManager.updateSelectedDayDetails(dateForRefresh);
                await this.navManager.updateFocusSummary();
                await this.navManager.updateWeeklySessionsChart();
                await this.navManager.updateDailyChart();
            }

        } catch (error) {
            console.error('Error deleting session:', error);
            NotificationUtils.showNotificationPing('Failed to delete session', 'error');
        }
    }

    getSessionsForDate(date) {
        const dateString = date.toDateString();
        return this.sessions[dateString] || [];
    }

    generateSessionId() {
        return Date.now().toString() + Math.random().toString(36).substring(2, 11);
    }

    calculateEndTime(startTime, durationMinutes) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }
}
