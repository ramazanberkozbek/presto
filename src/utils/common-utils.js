// Notification Utility Functions
export class NotificationUtils {
    static showNotificationPing(message, type = null) {
        // Ensure notification container exists
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Remove existing notifications
        const existingNotifications = container.querySelectorAll('.notification-ping');
        existingNotifications.forEach(notification => {
            this.dismissNotification(notification);
        });

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification-ping ${type || 'info'}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                this.dismissNotification(notification);
            }
        }, 3000);

        // Click to dismiss
        notification.addEventListener('click', () => {
            this.dismissNotification(notification);
        });
    }

    static dismissNotification(notification) {
        if (!notification || !notification.parentNode) return;

        notification.classList.add('dismissing');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    static playNotificationSound() {
        try {
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
        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    }

    static async showDesktopNotification(title, message, icon = '/assets/tauri.svg') {
        try {
            // Check if we're in a Tauri context
            if (window.__TAURI__ && window.__TAURI__.notification) {
                const { isPermissionGranted, requestPermission, sendNotification } = window.__TAURI__.notification;

                // Check if permission is granted
                let permissionGranted = await isPermissionGranted();

                // If not granted, request permission
                if (!permissionGranted) {
                    const permission = await requestPermission();
                    permissionGranted = permission === 'granted';
                }

                // Send notification if permission is granted
                if (permissionGranted) {
                    await sendNotification({
                        title: title,
                        body: message,
                        icon: icon
                    });
                } else {
                    console.warn('Notification permission denied');
                }
            } else {
                // Fallback to Web Notification API if not in Tauri context
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, {
                        body: message,
                        icon: icon,
                        silent: false,
                        requireInteraction: false
                    });
                }
            }
        } catch (error) {
            console.error('Failed to show desktop notification:', error);
            // Fallback to Web Notification API
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: icon,
                    silent: false,
                    requireInteraction: false
                });
            }
        }
    }

    // Helper method to check notification permission status
    static async getNotificationPermission() {
        try {
            if (window.__TAURI__ && window.__TAURI__.notification) {
                const { isPermissionGranted } = window.__TAURI__.notification;
                const granted = await isPermissionGranted();
                return granted ? 'granted' : 'denied';
            } else {
                // Fallback to Web API
                if (!('Notification' in window)) {
                    return 'unsupported';
                }
                return Notification.permission;
            }
        } catch (error) {
            console.error('Failed to check notification permission:', error);
            return 'denied';
        }
    }

    // Helper method to request notification permission (must be called from user gesture)
    static async requestNotificationPermission() {
        try {
            if (window.__TAURI__ && window.__TAURI__.notification) {
                const { requestPermission } = window.__TAURI__.notification;
                const permission = await requestPermission();
                return permission;
            } else {
                // Fallback to Web API
                if (!('Notification' in window)) {
                    return 'unsupported';
                }

                const permission = await Notification.requestPermission();
                return permission;
            }
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return 'denied';
        }
    }
}

// Time Formatting Utilities
export class TimeUtils {
    static formatTime(seconds) {
        if (!seconds || seconds < 0) return '0m';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    static formatTimeDetailed(seconds) {
        if (!seconds || seconds < 0) return '0h 0m';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        return `${hours}h ${minutes}m`;
    }

    static getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        start.setDate(diff);
        return start;
    }

    static isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    static formatDateRange(startDate, endDate) {
        const formatOptions = { day: 'numeric', month: 'short' };
        const startStr = startDate.toLocaleDateString('en-US', formatOptions);
        const endStr = endDate.toLocaleDateString('en-US', formatOptions);
        const year = endDate.getFullYear();

        return `${startStr} - ${endStr} ${year}`;
    }
}

// Storage Utilities
export class StorageUtils {
    static async saveToTauri(invokeCommand, data, fallbackKey) {
        try {
            const { invoke } = window.__TAURI__.core;
            await invoke(invokeCommand, data);
            return true;
        } catch (error) {
            console.error(`Failed to save to Tauri (${invokeCommand}):`, error);
            // Fallback to localStorage
            localStorage.setItem(fallbackKey, JSON.stringify(data));
            return false;
        }
    }

    static async loadFromTauri(invokeCommand, fallbackKey) {
        try {
            const { invoke } = window.__TAURI__.core;
            return await invoke(invokeCommand);
        } catch (error) {
            console.error(`Failed to load from Tauri (${invokeCommand}):`, error);
            // Fallback to localStorage
            const saved = localStorage.getItem(fallbackKey);
            return saved ? JSON.parse(saved) : null;
        }
    }

    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Failed to save to localStorage (${key}):`, error);
            return false;
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (error) {
            console.error(`Failed to load from localStorage (${key}):`, error);
            return defaultValue;
        }
    }
}

// DOM Utilities
export class DOMUtils {
    static createModal(title, content, className = '') {
        // Remove existing modal if any
        const existing = document.querySelector('.modal-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = `modal-overlay ${className}`;

        const modal = document.createElement('div');
        modal.className = 'modal-content';

        modal.innerHTML = `
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Add event listeners
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.closeModal(overlay));

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal(overlay);
            }
        });

        // Show modal with animation
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);

        return overlay;
    }

    static closeModal(modal) {
        if (!modal) {
            modal = document.querySelector('.modal-overlay');
        }

        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    static updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    static toggleClass(element, className, condition = null) {
        if (!element) return;

        if (condition === null) {
            element.classList.toggle(className);
        } else if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
}

// Keyboard Shortcut Utilities
export class KeyboardUtils {
    static parseShortcut(shortcutString) {
        if (!shortcutString) return null;

        const parts = shortcutString.split('+');
        const result = {
            meta: false,
            ctrl: false,
            alt: false,
            shift: false,
            key: ''
        };

        parts.forEach(part => {
            const partLower = part.toLowerCase();
            switch (partLower) {
                case 'commandorcontrol':
                case 'cmd':
                case 'command':
                    result.meta = true;
                    result.ctrl = true; // For cross-platform compatibility
                    break;
                case 'alt':
                    result.alt = true;
                    break;
                case 'shift':
                    result.shift = true;
                    break;
                case 'space':
                    result.key = ' ';
                    break;
                default:
                    result.key = partLower;
            }
        });

        return result;
    }

    static matchesShortcut(event, shortcutString) {
        const shortcut = this.parseShortcut(shortcutString);
        if (!shortcut) return false;

        const eventKey = event.key.toLowerCase();

        // Handle special key matches
        let keyMatches = false;
        if (shortcut.key === ' ') {
            keyMatches = event.code === 'Space' || eventKey === ' ';
        } else if (shortcut.key === 's') {
            keyMatches = eventKey === 's' || event.code === 'KeyS';
        } else if (shortcut.key === 'r') {
            keyMatches = eventKey === 'r' || event.code === 'KeyR';
        } else {
            keyMatches = shortcut.key === eventKey;
        }

        const modifiersMatch =
            (!shortcut.meta || event.metaKey || event.ctrlKey) &&
            (!shortcut.ctrl || event.ctrlKey || event.metaKey) &&
            (!shortcut.alt || event.altKey) &&
            (!shortcut.shift || event.shiftKey);

        return keyMatches && modifiersMatch;
    }
}
