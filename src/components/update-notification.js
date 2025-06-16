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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L13.09 8.26L19 7L17.74 13.26L22 12L20.74 18.26L24 17L22.74 23.26L12 22L10.91 15.74L5 17L6.26 10.74L2 12L3.26 5.74L0 7L1.26 0.74L12 2Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="update-message">
                        <h4 class="update-title">Aggiornamento disponibile</h4>
                        <p class="update-description">È disponibile una nuova versione dell'applicazione</p>
                        <div class="update-version"></div>
                    </div>
                    <div class="update-actions">
                        <button class="update-btn update-btn-secondary" data-action="dismiss">
                            Più tardi
                        </button>
                        <button class="update-btn update-btn-primary" data-action="download">
                            Aggiorna ora
                        </button>
                    </div>
                </div>
                <div class="update-progress-container" style="display: none;">
                    <div class="update-progress-content">
                        <div class="update-progress-icon">
                            <div class="spinner"></div>
                        </div>
                        <div class="update-progress-message">
                            <h4 class="update-progress-title">Download in corso...</h4>
                            <p class="update-progress-description">Attendere, l'aggiornamento verrà installato automaticamente</p>
                            <div class="update-progress-bar">
                                <div class="update-progress-fill"></div>
                                <span class="update-progress-text">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="update-close" data-action="close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                min-width: 350px;
            }

            .update-notification {
                background: var(--background-primary, #ffffff);
                border: 1px solid var(--border-color, #e2e2e2);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                overflow: hidden;
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                position: relative;
            }

            .update-notification.visible {
                transform: translateX(0);
            }

            .update-content {
                padding: 20px;
                display: flex;
                gap: 16px;
                align-items: flex-start;
            }

            .update-icon {
                color: var(--accent-color, #007AFF);
                flex-shrink: 0;
                margin-top: 2px;
            }

            .update-message {
                flex: 1;
                min-width: 0;
            }

            .update-title {
                margin: 0 0 4px 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary, #333333);
                line-height: 1.3;
            }

            .update-description {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: var(--text-secondary, #666666);
                line-height: 1.4;
            }

            .update-version {
                font-size: 12px;
                color: var(--text-tertiary, #999999);
                font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            }

            .update-actions {
                display: flex;
                gap: 8px;
                margin-top: 16px;
            }

            .update-btn {
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
            }

            .update-btn-primary {
                background: var(--accent-color, #007AFF);
                color: white;
            }

            .update-btn-primary:hover {
                background: var(--accent-color-hover, #0056CC);
                transform: translateY(-1px);
            }

            .update-btn-secondary {
                background: transparent;
                color: var(--text-secondary, #666666);
                border: 1px solid var(--border-color, #e2e2e2);
            }

            .update-btn-secondary:hover {
                background: var(--background-secondary, #f5f5f5);
                border-color: var(--border-color-hover, #cccccc);
            }

            .update-close {
                position: absolute;
                top: 12px;
                right: 12px;
                background: transparent;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: var(--text-tertiary, #999999);
                transition: color 0.2s ease;
                border-radius: 4px;
            }

            .update-close:hover {
                color: var(--text-secondary, #666666);
                background: var(--background-secondary, #f5f5f5);
            }

            .update-progress-container {
                padding: 20px;
                border-top: 1px solid var(--border-color, #e2e2e2);
                background: var(--background-secondary, #f8f9fa);
            }

            .update-progress-content {
                display: flex;
                gap: 16px;
                align-items: flex-start;
            }

            .update-progress-icon {
                flex-shrink: 0;
                margin-top: 2px;
            }

            .spinner {
                width: 24px;
                height: 24px;
                border: 2px solid var(--border-color, #e2e2e2);
                border-top: 2px solid var(--accent-color, #007AFF);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .update-progress-message {
                flex: 1;
            }

            .update-progress-title {
                margin: 0 0 4px 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary, #333333);
            }

            .update-progress-description {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: var(--text-secondary, #666666);
            }

            .update-progress-bar {
                background: var(--background-primary, #ffffff);
                border-radius: 8px;
                height: 8px;
                position: relative;
                overflow: hidden;
                border: 1px solid var(--border-color, #e2e2e2);
            }

            .update-progress-fill {
                background: var(--accent-color, #007AFF);
                height: 100%;
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 7px;
            }

            .update-progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 10px;
                font-weight: 600;
                color: var(--text-primary, #333333);
                text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
            }

            /* Animazioni di entrata/uscita */
            .update-notification-container.slide-in {
                animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .update-notification-container.slide-out {
                animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            /* Responsive */
            @media (max-width: 480px) {
                .update-notification-container {
                    left: 10px;
                    right: 10px;
                    top: 10px;
                    max-width: none;
                    min-width: auto;
                }

                .update-actions {
                    flex-direction: column;
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
        const title = this.container.querySelector('.update-progress-title');
        const description = this.container.querySelector('.update-progress-description');

        if (title) title.textContent = 'Installazione in corso...';
        if (description) description.textContent = 'L\'aggiornamento verrà applicato al riavvio';

        this.updateProgress(100);
    }

    /**
     * Mostra un errore
     */
    showError(error) {
        const title = this.container.querySelector('.update-progress-title');
        const description = this.container.querySelector('.update-progress-description');

        if (title) title.textContent = 'Errore aggiornamento';
        if (description) description.textContent = 'Si è verificato un errore durante l\'aggiornamento';

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
            this.container.classList.add('slide-in');
            this.container.querySelector('.update-notification').classList.add('visible');
        });

        this.isVisible = true;
    }

    /**
     * Nasconde la notifica
     */
    hide() {
        if (!this.isVisible) return;

        this.container.classList.add('slide-out');
        this.container.querySelector('.update-notification').classList.remove('visible');

        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.classList.remove('slide-in', 'slide-out');
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
