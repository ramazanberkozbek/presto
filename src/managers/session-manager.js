// Session Management Functions
import { NotificationUtils, TimeUtils, DOMUtils } from '../utils/common-utils.js';

export class SessionManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.currentEditingSession = null;
        this.selectedDate = null;
        this.sessions = []; // Local session storage for now
        this.init();
    }

    init() {
        this.setupEventListeners();
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
            created_at: new Date().toISOString()
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

            this.closeModal();

            // Refresh the session list
            if (this.navManager) {
                await this.navManager.updateSelectedDayDetails(this.selectedDate);
                await this.navManager.updateFocusSummary();
                await this.navManager.updateWeeklySessionsChart();
            }

        } catch (error) {
            console.error('Error saving session:', error);
            NotificationUtils.showNotificationPing('Failed to save session', 'error');
        }
    }

    async addSession(sessionData) {
        const dateString = this.selectedDate.toDateString();

        // For now, store locally (later we'll integrate with backend)
        if (!this.sessions[dateString]) {
            this.sessions[dateString] = [];
        }

        this.sessions[dateString].push(sessionData);

        // TODO: Call backend when available
        // await invoke('add_session', { date: dateString, session: sessionData });
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

        // TODO: Call backend when available
        // await invoke('update_session', { date: dateString, sessionId: sessionData.id, updatedSession: sessionData });
    }

    async deleteCurrentSession() {
        if (!this.currentEditingSession) return;

        if (!confirm('Are you sure you want to delete this session?')) return;

        try {
            const dateString = this.selectedDate.toDateString();

            // Remove from local storage
            if (this.sessions[dateString]) {
                this.sessions[dateString] = this.sessions[dateString].filter(s => s.id !== this.currentEditingSession.id);
            }

            // TODO: Call backend when available
            // await invoke('delete_session', { date: dateString, sessionId: this.currentEditingSession.id });

            this.closeModal();
            NotificationUtils.showNotificationPing('Session deleted successfully', 'success');

            // Refresh the session list
            if (this.navManager) {
                await this.navManager.updateSelectedDayDetails(this.selectedDate);
                await this.navManager.updateFocusSummary();
                await this.navManager.updateWeeklySessionsChart();
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
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    calculateEndTime(startTime, durationMinutes) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }
}
