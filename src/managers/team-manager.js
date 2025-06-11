// Team Manager for Team Dashboard
const { invoke } = window.__TAURI__.core;

export class TeamManager {
    constructor() {
        this.teamMembers = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            console.log('TeamManager already initialized, skipping...');
            return;
        }

        this.initialized = true;
        console.log('Initializing TeamManager...');

        // Initialize with demo data
        this.initializeDemoData();
        this.renderTeamMembers();
        this.updateTeamStats();

        // Update team data every 30 seconds to simulate real-time updates
        setInterval(() => {
            this.updateDemoData();
            this.renderTeamMembers();
            this.updateTeamStats();
        }, 30000);
    }

    initializeDemoData() {
        this.teamMembers = [
            {
                id: 1,
                name: "Marco Rossi",
                role: "Frontend Developer",
                avatar: "MR",
                status: "focus",
                timer: "18:35",
                activity: "Working on React components",
                lastSeen: new Date(),
                totalFocusToday: 180, // minutes
                currentSessionStart: new Date(Date.now() - 6.5 * 60 * 1000) // 6.5 minutes ago
            },
            {
                id: 2,
                name: "Sara Bianchi",
                role: "UX Designer",
                avatar: "SB",
                status: "break",
                timer: "3:20",
                activity: "Short break",
                lastSeen: new Date(),
                totalFocusToday: 125,
                currentSessionStart: new Date(Date.now() - 1.5 * 60 * 1000)
            },
            {
                id: 3,
                name: "Luca Verdi",
                role: "Backend Developer",
                avatar: "LV",
                status: "focus",
                timer: "12:45",
                activity: "API development",
                lastSeen: new Date(),
                totalFocusToday: 205,
                currentSessionStart: new Date(Date.now() - 12.3 * 60 * 1000)
            },
            {
                id: 4,
                name: "Giulia Neri",
                role: "Product Manager",
                avatar: "GN",
                status: "long-break",
                timer: "15:00",
                activity: "Long break",
                lastSeen: new Date(),
                totalFocusToday: 150,
                currentSessionStart: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
                id: 5,
                name: "Andrea Ferrari",
                role: "DevOps Engineer",
                avatar: "AF",
                status: "privacy",
                timer: "--:--",
                activity: "Privacy mode enabled",
                lastSeen: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
                totalFocusToday: 95,
                currentSessionStart: null
            },
            {
                id: 6,
                name: "Chiara Romano",
                role: "QA Engineer",
                avatar: "CR",
                status: "offline",
                timer: "--:--",
                activity: "Last seen 2 hours ago",
                lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                totalFocusToday: 75,
                currentSessionStart: null
            },
            {
                id: 7,
                name: "Francesco Galli",
                role: "Frontend Developer",
                avatar: "FG",
                status: "focus",
                timer: "22:10",
                activity: "Code review session",
                lastSeen: new Date(),
                totalFocusToday: 165,
                currentSessionStart: new Date(Date.now() - 2.8 * 60 * 1000)
            },
            {
                id: 8,
                name: "Elena Conti",
                role: "UI Designer",
                avatar: "EC",
                status: "offline",
                timer: "--:--",
                activity: "Last seen yesterday",
                lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                totalFocusToday: 0,
                currentSessionStart: null
            }
        ];
    }

    updateDemoData() {
        // Simulate status changes for demo
        this.teamMembers.forEach(member => {
            if (member.status === 'focus' || member.status === 'break' || member.status === 'long-break') {
                // Update timer
                if (member.currentSessionStart) {
                    const elapsed = Math.floor((Date.now() - member.currentSessionStart.getTime()) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    
                    if (member.status === 'focus') {
                        // Focus sessions are 25 minutes, count down
                        const remaining = (25 * 60) - elapsed;
                        if (remaining > 0) {
                            const remMin = Math.floor(remaining / 60);
                            const remSec = remaining % 60;
                            member.timer = `${remMin.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
                        } else {
                            // Session ended, randomly change to break or continue
                            if (Math.random() > 0.7) {
                                member.status = 'break';
                                member.currentSessionStart = new Date();
                                member.timer = '05:00';
                                member.activity = 'Short break';
                            }
                        }
                    } else if (member.status === 'break') {
                        // Break sessions are 5 minutes, count down
                        const remaining = (5 * 60) - elapsed;
                        if (remaining > 0) {
                            const remMin = Math.floor(remaining / 60);
                            const remSec = remaining % 60;
                            member.timer = `${remMin.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
                        } else {
                            // Break ended, randomly start focus or stay on break
                            if (Math.random() > 0.5) {
                                member.status = 'focus';
                                member.currentSessionStart = new Date();
                                member.timer = '25:00';
                                member.activity = this.getRandomFocusActivity();
                            }
                        }
                    } else if (member.status === 'long-break') {
                        // Long break sessions are 15-20 minutes
                        const remaining = (20 * 60) - elapsed;
                        if (remaining > 0) {
                            const remMin = Math.floor(remaining / 60);
                            const remSec = remaining % 60;
                            member.timer = `${remMin.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
                        }
                    }
                }
                
                // Update last seen
                member.lastSeen = new Date();
            }

            // Randomly change some statuses
            if (Math.random() > 0.95) {
                const possibleStatuses = ['focus', 'break', 'privacy'];
                const newStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];
                if (newStatus !== member.status && member.status !== 'offline') {
                    member.status = newStatus;
                    member.currentSessionStart = new Date();
                    if (newStatus === 'focus') {
                        member.timer = '25:00';
                        member.activity = this.getRandomFocusActivity();
                    } else if (newStatus === 'break') {
                        member.timer = '05:00';
                        member.activity = 'Short break';
                    } else if (newStatus === 'privacy') {
                        member.timer = '--:--';
                        member.activity = 'Privacy mode enabled';
                        member.currentSessionStart = null;
                    }
                }
            }
        });
    }

    getRandomFocusActivity() {
        const activities = [
            "Working on React components",
            "API development",
            "Code review session",
            "Writing documentation",
            "Bug fixing",
            "Database optimization",
            "UI/UX design",
            "Testing new features",
            "Refactoring code",
            "Planning sprint tasks"
        ];
        return activities[Math.floor(Math.random() * activities.length)];
    }

    renderTeamMembers() {
        const container = document.getElementById('team-members-grid');
        if (!container) return;

        container.innerHTML = '';

        this.teamMembers.forEach(member => {
            const memberCard = this.createMemberCard(member);
            container.appendChild(memberCard);
        });
    }

    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = `team-member-card status-${member.status}`;

        const statusInfo = this.getStatusInfo(member.status);
        const onlineStatus = this.getOnlineStatus(member);

        card.innerHTML = `
            <div class="member-header">
                <div class="member-avatar">
                    ${member.avatar}
                    <div class="online-indicator ${onlineStatus}"></div>
                </div>
                <div class="member-info">
                    <h3>${member.name}</h3>
                    <p class="member-role">${member.role}</p>
                </div>
            </div>
            
            <div class="status-badge ${member.status}">
                <span class="status-icon">${statusInfo.icon}</span>
                <span>${statusInfo.label}</span>
            </div>
            
            <div class="member-timer ${member.status}">
                ${member.timer}
            </div>
            
            <div class="member-activity">
                ${member.activity}
            </div>
        `;

        return card;
    }

    getStatusInfo(status) {
        const statusMap = {
            'focus': { icon: '🧠', label: 'Deep Focus' },
            'break': { icon: '☕', label: 'Short Break' },
            'long-break': { icon: '🌙', label: 'Long Break' },
            'offline': { icon: '⚫', label: 'Offline' },
            'privacy': { icon: '🔒', label: 'Privacy Mode' }
        };
        return statusMap[status] || { icon: '❓', label: 'Unknown' };
    }

    getOnlineStatus(member) {
        const now = new Date();
        const lastSeenMinutes = (now - member.lastSeen) / (1000 * 60);

        if (member.status === 'offline') return 'offline';
        if (member.status === 'privacy') return 'privacy';
        if (lastSeenMinutes < 5) return 'online';
        return 'offline';
    }

    updateTeamStats() {
        const stats = this.calculateTeamStats();
        
        document.getElementById('team-focusing').textContent = stats.focusing;
        document.getElementById('team-on-break').textContent = stats.onBreak;
        document.getElementById('team-privacy').textContent = stats.privacy;
        document.getElementById('team-offline').textContent = stats.offline;
    }

    calculateTeamStats() {
        const stats = {
            focusing: 0,
            onBreak: 0,
            privacy: 0,
            offline: 0
        };

        this.teamMembers.forEach(member => {
            switch (member.status) {
                case 'focus':
                    stats.focusing++;
                    break;
                case 'break':
                case 'long-break':
                    stats.onBreak++;
                    break;
                case 'privacy':
                    stats.privacy++;
                    break;
                case 'offline':
                    stats.offline++;
                    break;
            }
        });

        return stats;
    }
}
