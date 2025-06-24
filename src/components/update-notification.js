/**
 * Update Notification Component
 * 
 * Componente per mostrare notifiche di aggiornamento nell'interfaccia utente
 */

import { updateManager } from '../managers/update-manager.js';

export class UpdateNotification {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.animationDuration = 300;

        this.createNotificationContainer();
        this.bindEvents();
    }

    /**
     * Crea il container per le notifiche di aggiornamento
     */
    createNotificationContainer() {
        this.container = document.createElement('div');
        this.container.className = 'update-notification-container';
        this.container.innerHTML = `
            <div class="update-notification">
                <div class="update-content">
                    <div class="update-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L13.09 8.26L19 7L17.74 13.26L22 12L20.74 18.26L24 17L22.74 23.26L12 22L10.91 15.74L5 17L6.26 10.74L2 12L3.26 5.74L0 7L1.26 0.74L12 2Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <span class="update-message">Aggiornamento disponibile</span>
                    <span class="update-version"></span>
                    <div class="update-actions">
                        <button class="update-btn update-btn-primary" data-action="download">
                            Aggiorna
                        </button>
                        <button class="update-btn update-btn-secondary" data-action="dismiss">
                            Ignora
                        </button>
                    </div>
                </div>
                <div class="update-progress-container" style="display: none;">
                    <div class="update-progress-icon">
                        <div class="spinner"></div>
                    </div>
                    <span class="update-progress-message">Download in corso...</span>
                    <div class="update-progress-bar">
                        <div class="update-progress-fill"></div>
                        <span class="update-progress-text">0%</span>
                    </div>
                </div>
                <button class="update-close" data-action="close">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;

        // Aggiungi gli stili
        this.injectStyles();

        // Aggiungi al DOM ma nascosto
        this.container.style.display = 'none';
        document.body.appendChild(this.container);

        // Bind degli eventi sui pulsanti
        this.bindButtonEvents();
    }

    /**
     * Inietta gli stili CSS per la notifica
     */
    injectStyles() {
        if (document.getElementById('update-notification-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'update-notification-styles';
        styles.textContent = `
            .update-notification-container {
            position: fixed;
            top: 44px;
            left: 80px;
            right: 0;
            z-index: 10000;
            transform: translateY(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .update-notification-container.visible {
            transform: translateY(0);
            }

            .update-notification {
            background: var(--accent-color, #007AFF);
            color: white;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }

            .update-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
            }

            .update-icon {
            color: white;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            }

            .update-message {
            font-weight: 500;
            white-space: nowrap;
            }

            .update-version {
            font-size: 13px;
            opacity: 0.9;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            margin-left: 8px;
            }

            .update-actions {
            display: flex;
            gap: 8px;
            margin-left: auto;
            flex-shrink: 0;
            }

            .update-btn {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            }

            .update-btn-primary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .update-btn-primary:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.4);
            }

            .update-btn-secondary {
            background: transparent;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .update-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.4);
            }

            .update-close {
            background: transparent;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: white;
            opacity: 0.8;
            transition: opacity 0.2s ease;
            border-radius: 3px;
            margin-left: 8px;
            flex-shrink: 0;
            }

            .update-close:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.1);
            }

            .update-progress-container {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
            }

            .update-progress-icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            }

            .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            }

            @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
            }

            .update-progress-message {
            font-weight: 500;
            white-space: nowrap;
            }

            .update-progress-bar {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            height: 4px;
            position: relative;
            overflow: hidden;
            flex: 1;
            min-width: 100px;
            margin: 0 12px;
            }

            .update-progress-fill {
            background: white;
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 3px;
            }

            .update-progress-text {
            font-size: 12px;
            font-weight: 600;
            color: white;
            opacity: 0.9;
            white-space: nowrap;
            flex-shrink: 0;
            }

            /* Responsive */
            @media (max-width: 768px) {
            .update-notification-container {
                left: 0;
            }

            .update-notification {
                padding: 6px 12px;
                font-size: 13px;
            }

            .update-btn {
                padding: 3px 8px;
                font-size: 12px;
            }

            .update-version {
                display: none;
            }

            .update-progress-bar {
                min-width: 80px;
                margin: 0 8px;
            }
            }

            @media (max-width: 480px) {
            .update-actions {
                gap: 6px;
            }

            .update-btn {
                padding: 3px 6px;
            }

            .update-close {
                margin-left: 4px;
            }
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Associa gli eventi ai pulsanti
     */
    bindButtonEvents() {
        const buttons = this.container.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleAction(action);
            });
        });
    }

    /**
     * Gestisce le azioni dei pulsanti
     */
    handleAction(action) {
        switch (action) {
            case 'download':
                this.startDownload();
                break;
            case 'dismiss':
                this.hide();
                break;
            case 'close':
                this.hide();
                break;
        }
    }

    /**
     * Avvia il download dell'aggiornamento
     */
    async startDownload() {
        // Mostra la sezione di progresso
        const content = this.container.querySelector('.update-content');
        const progressContainer = this.container.querySelector('.update-progress-container');

        content.style.display = 'none';
        progressContainer.style.display = 'block';

        // Avvia il download tramite il manager
        await updateManager.downloadAndInstall();
    }

    /**
     * Aggiorna il progresso del download
     */
    updateProgress(progress, chunkLength = 0, contentLength = 0) {
        const progressFill = this.container.querySelector('.update-progress-fill');
        const progressText = this.container.querySelector('.update-progress-text');

        if (progressFill && progressText) {
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }
    }

    /**
     * Associa gli eventi del manager degli aggiornamenti
     */
    bindEvents() {
        updateManager.on('updateAvailable', (event) => {
            this.showUpdateAvailable(event.detail);
        });

        updateManager.on('downloadProgress', (event) => {
            const { progress } = event.detail;
            this.updateProgress(progress);
        });

        updateManager.on('downloadFinished', () => {
            this.showInstalling();
        });

        updateManager.on('downloadError', (event) => {
            this.showError(event.detail);
        });
    }

    /**
     * Mostra la notifica di aggiornamento disponibile
     */
    showUpdateAvailable(updateInfo) {
        const versionElement = this.container.querySelector('.update-version');
        if (versionElement && updateInfo) {
            versionElement.textContent = `Versione ${updateInfo.version}`;
        }

        this.show();
    }

    /**
     * Mostra lo stato di installazione
     */
    showInstalling() {
        const message = this.container.querySelector('.update-progress-message');

        if (message) message.textContent = 'Installazione in corso...';

        this.updateProgress(100);
    }

    /**
     * Mostra un errore
     */
    showError() {
        const message = this.container.querySelector('.update-progress-message');

        if (message) message.textContent = 'Errore aggiornamento';

        // Nascondi dopo 5 secondi
        setTimeout(() => {
            this.hide();
        }, 5000);
    }

    /**
     * Mostra la notifica
     */
    show() {
        if (this.isVisible) return;

        this.container.style.display = 'block';

        // Forza un reflow prima di aggiungere la classe
        this.container.offsetHeight;

        requestAnimationFrame(() => {
            this.container.classList.add('visible');
        });

        this.isVisible = true;
    }

    /**
     * Nasconde la notifica
     */
    hide() {
        if (!this.isVisible) return;

        this.container.classList.remove('visible');

        setTimeout(() => {
            this.container.style.display = 'none';
            this.resetToInitialState();
        }, this.animationDuration);

        this.isVisible = false;
    }

    /**
     * Resetta la notifica allo stato iniziale
     */
    resetToInitialState() {
        const content = this.container.querySelector('.update-content');
        const progressContainer = this.container.querySelector('.update-progress-container');

        content.style.display = 'flex';
        progressContainer.style.display = 'none';

        this.updateProgress(0);
    }

    /**
     * Distrugge il componente
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.isVisible = false;
    }
}

// Esporta un'istanza singleton
export const updateNotification = new UpdateNotification();
