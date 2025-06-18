/**
 * Update Manager
 * 
 * Gestisce il controllo e l'installazione degli aggiornamenti dell'applicazione
 * tramite GitHub releases utilizzando il plugin updater di Tauri.
 */

export class UpdateManager {
    constructor() {
        this.updateAvailable = false;
        this.currentUpdate = null;
        this.isChecking = false;
        this.isDownloading = false;
        this.downloadProgress = 0;
        this.autoCheck = true;
        this.checkInterval = null;

        // Eventi personalizzati
        this.eventTarget = new EventTarget();

        // Inizializza il controllo automatico solo se non siamo in dev mode
        if (!this.isDevelopmentMode()) {
            this.startAutoCheck();
        }
    }

    /**
     * Verifica se siamo in modalità sviluppo
     */
    isDevelopmentMode() {
        // Permetti override per test degli aggiornamenti
        if (localStorage.getItem('presto_force_update_test') === 'true') {
            console.log('🧪 Modalità test aggiornamenti attiva - bypass controllo sviluppo');
            return false;
        }

        // Verifica se siamo in un ambiente Tauri
        if (!window.__TAURI__) {
            console.log('🔍 Non è un ambiente Tauri - modalità sviluppo');
            return true;
        }

        // Verifica se stiamo running da tauri dev (protocollo tauri: indica app compilata)
        if (window.location.protocol === 'tauri:') {
            console.log('🔍 Protocollo tauri: - app compilata');
            return false;
        }

        // Se stiamo usando localhost, siamo probabilmente in modalità dev
        if (window.location.hostname === 'localhost' ||
            window.location.href.includes('localhost') ||
            window.location.href.includes('127.0.0.1')) {
            console.log('🔍 Localhost rilevato - modalità sviluppo');
            return true;
        }

        // Default: se arriviamo qui probabilmente siamo in un'app compilata
        console.log('🔍 Ambiente sconosciuto - assumo app compilata');
        return false;
    }

    /**
     * Attiva la modalità test per gli aggiornamenti (solo per sviluppo)
     * ATTENZIONE: Questo permette di testare gli aggiornamenti in modalità dev
     */
    enableTestMode() {
        localStorage.setItem('presto_force_update_test', 'true');
        console.warn('⚠️ MODALITÀ TEST AGGIORNAMENTI ATTIVATA - Solo per sviluppo!');
        console.log('🔄 Ricarica la pagina o riavvia l\'app per attivare la modalità test');

        // Riaggiorna il controllo automatico se necessario
        if (!this.isDevelopmentMode() && this.autoCheck && !this.checkInterval) {
            this.startAutoCheck();
        }

        return 'Modalità test attivata! Ora puoi testare gli aggiornamenti con checkForUpdates()';
    }

    /**
     * Disattiva la modalità test per gli aggiornamenti
     */
    disableTestMode() {
        localStorage.removeItem('presto_force_update_test');
        console.log('✅ Modalità test aggiornamenti disattivata');

        // Ferma il controllo automatico se siamo in modalità dev
        if (this.isDevelopmentMode()) {
            this.stopAutoCheck();
        }

        return 'Modalità test disattivata';
    }

    /**
     * Ottiene l'API updater di Tauri in modo sicuro
     */
    async getTauriUpdater() {
        if (!window.__TAURI__) {
            throw new Error('API Tauri non disponibili');
        }

        // Se siamo in modalità test in ambiente sviluppo, simula l'API
        if (this.isDevelopmentMode() && localStorage.getItem('presto_force_update_test') === 'true') {
            console.log('🧪 Usando API updater simulata per test');
            return await this.getSimulatedUpdater();
        }

        try {
            // Per Tauri v2, usa l'API globale direttamente
            if (window.__TAURI__.updater) {
                console.log('✅ Usando API updater globale');
                return window.__TAURI__.updater;
            }

            // Se non disponibile globalmente, usa l'invoke
            if (window.__TAURI__.core && window.__TAURI__.core.invoke) {
                console.log('✅ Usando API updater via invoke');
                return {
                    check: async () => {
                        return await window.__TAURI__.core.invoke('plugin:updater|check');
                    },
                    relaunch: async () => {
                        return await window.__TAURI__.core.invoke('plugin:updater|relaunch');
                    }
                };
            }

            throw new Error('API updater non trovata');
        } catch (error) {
            console.error('Errore caricamento API updater:', error);
            throw new Error('Plugin updater non disponibile');
        }
    }

    /**
     * Crea un'API updater simulata per test
     */
    async getSimulatedUpdater() {
        return {
            check: async () => {
                console.log('🧪 Simulazione: Controllo aggiornamenti...');

                // Simula una richiesta di rete con delay
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Ottieni la versione corrente dell'app
                const currentVersion = await this.getCurrentVersion();
                console.log('🔍 Versione corrente simulata:', currentVersion);

                // Simula controllo con GitHub API (usando fetch diretto)
                try {
                    // Verifica se il repository presto è accessibile
                    const response = await fetch('https://api.github.com/repos/murdercode/presto/releases/latest');

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const latestRelease = await response.json();

                    console.log('📦 Release più recente da GitHub:', latestRelease.tag_name);

                    // Pulisci la versione usando la stessa logica robusta
                    const latestVersion = this.cleanVersionString(latestRelease.tag_name);
                    const isNewer = this.compareVersions(latestVersion, currentVersion) > 0;

                    if (isNewer) {
                        console.log('✅ Simulazione: Aggiornamento disponibile!');
                        return {
                            available: true,
                            version: latestVersion,
                            date: latestRelease.published_at,
                            body: latestRelease.body,
                            downloadAndInstall: this.simulateDownloadAndInstall.bind(this)
                        };
                    } else {
                        console.log('✅ Simulazione: Nessun aggiornamento disponibile');
                        return {
                            available: false,
                            version: currentVersion
                        };
                    }
                } catch (error) {
                    console.error('❌ Errore simulazione GitHub API:', error);
                    throw new Error(`Errore simulazione: ${error.message}`);
                }
            },
            relaunch: async () => {
                console.log('🧪 Simulazione: Riavvio app...');
                await this.showMessage('🧪 MODALITÀ TEST: In una vera app, ora verrebbe riavviata.', {
                    title: 'Simulazione Riavvio',
                    kind: 'info'
                });
            }
        };
    }

    /**
     * Simula il download e installazione dell'aggiornamento
     */
    async simulateDownloadAndInstall(progressCallback) {
        console.log('🧪 Simulazione: Download e installazione...');

        const totalSize = 5 * 1024 * 1024; // 5MB simulati
        let downloaded = 0;

        // Simula l'evento di inizio
        if (progressCallback) {
            progressCallback({
                event: 'Started',
                data: { contentLength: totalSize }
            });
        }

        // Simula il download con progresso
        const chunks = 20;
        const chunkSize = totalSize / chunks;

        for (let i = 0; i < chunks; i++) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms per chunk
            downloaded += chunkSize;

            if (progressCallback) {
                progressCallback({
                    event: 'Progress',
                    data: {
                        chunkLength: downloaded,
                        contentLength: totalSize
                    }
                });
            }
        }

        // Simula completamento
        if (progressCallback) {
            progressCallback({
                event: 'Finished',
                data: {}
            });
        }

        console.log('🧪 Simulazione: Download completato!');
    }

    /**
     * Confronta due versioni (formato semver)
     */
    compareVersions(a, b) {
        try {
            console.log('🔍 Confronto versioni:', { a, b });
            
            // Pulisci le versioni da prefissi e suffissi non numerici
            const cleanA = this.cleanVersionString(a);
            const cleanB = this.cleanVersionString(b);

            console.log('🧹 Versioni pulite:', { cleanA, cleanB });

            const aParts = cleanA.split('.').map(part => {
                const num = parseInt(part, 10);
                return isNaN(num) ? 0 : num;
            });
            const bParts = cleanB.split('.').map(part => {
                const num = parseInt(part, 10);
                return isNaN(num) ? 0 : num;
            });

            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aPart = aParts[i] || 0;
                const bPart = bParts[i] || 0;

                if (aPart > bPart) return 1;
                if (aPart < bPart) return -1;
            }

            return 0;
        } catch (error) {
            console.error('❌ Errore nel confronto versioni:', error);
            console.error('❌ Parametri:', { a, b });
            // In caso di errore, assumiamo che non ci siano aggiornamenti
            return 0;
        }
    }

    /**
     * Pulisce una stringa di versione da prefissi e caratteri non numerici
     */
    cleanVersionString(version) {
        if (!version || typeof version !== 'string') {
            return '0.0.0';
        }

        // Rimuovi prefissi comuni come "v", "app-v", etc.
        let cleaned = version
            .replace(/^(app-)?v/i, '')           // Rimuovi "v" o "app-v"
            .replace(/^presto\s+v?/i, '')        // Rimuovi "Presto v" o "Presto"
            .replace(/^release\s+v?/i, '')       // Rimuovi "Release v" o "Release"
            .trim();

        // Estrai solo la parte numerica con punti (x.y.z)
        const versionMatch = cleaned.match(/^(\d+(?:\.\d+)*)/);
        if (versionMatch) {
            return versionMatch[1];
        }

        // Se non riusciamo a estrarre una versione valida, ritorna 0.0.0
        console.warn('⚠️ Versione non valida:', version, '- usando 0.0.0');
        return '0.0.0';
    }

    /**
     * Mostra un messaggio all'utente in modo sicuro
     */
    async showMessage(content, options = {}) {
        try {
            // Prova prima con l'API globale
            if (window.__TAURI__?.dialog?.message) {
                return await window.__TAURI__.dialog.message(content, options);
            }

            // Altrimenti prova l'import dinamico
            const { message } = await import('@tauri-apps/plugin-dialog');
            return await message(content, options);
        } catch (error) {
            console.error('Errore mostrando messaggio:', error);
            // Fallback al browser alert
            alert(content);
        }
    }

    /**
     * Chiede conferma all'utente
     */
    async askUser(content, options = {}) {
        try {
            // Prova prima con l'API globale
            if (window.__TAURI__?.dialog?.ask) {
                return await window.__TAURI__.dialog.ask(content, options);
            }

            // Altrimenti prova l'import dinamico
            const { ask } = await import('@tauri-apps/plugin-dialog');
            return await ask(content, options);
        } catch (error) {
            console.error('Errore chiedendo conferma:', error);
            // Fallback al browser confirm
            return confirm(content);
        }
    }

    /**
     * Mostra messaggio per modalità sviluppo
     */
    async showDevelopmentMessage() {
        await this.showMessage(
            'Controllo aggiornamenti non disponibile in modalità sviluppo.\n\nGli aggiornamenti funzioneranno solo nell\'applicazione compilata.',
            {
                title: 'Modalità Sviluppo',
                kind: 'info'
            }
        );
    }

    /**
     * Avvia il controllo automatico degli aggiornamenti
     */
    startAutoCheck() {
        if (this.autoCheck && !this.checkInterval && !this.isDevelopmentMode()) {
            // Controlla ogni ora
            this.checkInterval = setInterval(() => {
                this.checkForUpdates(false); // silent check
            }, 60 * 60 * 1000);

            // Controllo iniziale dopo 30 secondi
            setTimeout(() => {
                this.checkForUpdates(false);
            }, 30000);
        }
    }

    /**
     * Ferma il controllo automatico degli aggiornamenti
     */
    stopAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Controlla se sono disponibili aggiornamenti
     * @param {boolean} showDialog - Se mostrare dialoghi all'utente
     * @returns {Promise<boolean>} - True se sono disponibili aggiornamenti
     */
    async checkForUpdates(showDialog = true) {
        if (this.isChecking) {
            return false;
        }

        this.isChecking = true;
        this.emit('checkStarted');

        try {
            console.log('🔄 Controllo aggiornamenti...');

            // Verifica se siamo in un ambiente Tauri con controllo intelligente
            const isDevMode = this.isDevelopmentMode();
            const hasTestMode = localStorage.getItem('presto_force_update_test') === 'true';

            if (isDevMode && !hasTestMode) {
                console.warn('⚠️  Controllo aggiornamenti non disponibile in modalità sviluppo');
                this.emit('updateNotAvailable');
                if (showDialog) {
                    await this.showDevelopmentMessage();
                }
                return false;
            }

            // Debug: stampa informazioni sull'ambiente
            console.log('🔍 Debug API Tauri:', {
                hasTauri: !!window.__TAURI__,
                hasUpdater: !!window.__TAURI__?.updater,
                hasCore: !!window.__TAURI__?.core,
                hasInvoke: !!window.__TAURI__?.core?.invoke,
                isDevMode,
                hasTestMode
            });

            // Usa l'API updater di Tauri (o simulata se in test mode)
            const updater = await this.getTauriUpdater();

            console.log('🔍 Effettuando richiesta controllo aggiornamenti...');
            const update = await updater.check();
            console.log('📦 Risposta controllo aggiornamenti:', update);

            if (update?.available) {
                console.log('✅ Aggiornamento disponibile:', update.version);
                this.updateAvailable = true;
                this.currentUpdate = update;
                this.emit('updateAvailable', update);

                if (showDialog) {
                    await this.showUpdateDialog(update);
                }

                return true;
            } else {
                console.log('✅ Nessun aggiornamento disponibile');
                this.updateAvailable = false;
                this.currentUpdate = null;
                this.emit('updateNotAvailable');

                if (showDialog) {
                    await this.showMessage('Stai usando la versione più recente!', {
                        title: 'Nessun aggiornamento',
                        kind: 'info'
                    });
                }

                return false;
            }
        } catch (error) {
            console.error('❌ Errore durante il controllo aggiornamenti:', error);
            console.error('❌ Stack trace:', error?.stack);
            console.error('❌ Tipo errore:', typeof error);
            console.error('❌ Errore stringificato:', JSON.stringify(error, null, 2));
            this.emit('checkError', error);

            let errorMessage = 'Errore durante il controllo degli aggiornamenti.';

            // Fornisci messaggi di errore più specifici
            if (error && typeof error === 'string') {
                if (error.includes('network') || error.includes('request')) {
                    errorMessage = 'Errore di rete durante il controllo degli aggiornamenti. Verifica la connessione a Internet.';
                } else if (error === 'error sending request') {
                    errorMessage = 'Errore di connessione al server degli aggiornamenti. Verifica la connessione a Internet e riprova più tardi.';
                } else if (error.includes('parsing') && error.includes('version')) {
                    errorMessage = 'Errore nel formato delle informazioni di versione. Questo verrà risolto nel prossimo aggiornamento.';
                }
            } else if (error && error.message) {
                if (error.message.includes('network') || error.message.includes('request')) {
                    errorMessage = 'Errore di rete durante il controllo degli aggiornamenti. Verifica la connessione a Internet.';
                } else if (error.message.includes('permission')) {
                    errorMessage = 'Permessi insufficienti per controllare gli aggiornamenti.';
                } else if (error.message.includes('not available')) {
                    errorMessage = 'Sistema di aggiornamenti non disponibile in questa versione.';
                }
            }

            if (showDialog) {
                const errorDetail = error && error.message ? error.message : (typeof error === 'string' ? error : 'Errore sconosciuto');
                await this.showMessage(`${errorMessage}\n\nDettagli: ${errorDetail}`, {
                    title: 'Errore Aggiornamenti',
                    kind: 'error'
                });
            }

            return false;
        } finally {
            this.isChecking = false;
            this.emit('checkFinished');
        }
    }

    /**
     * Mostra il dialogo di conferma aggiornamento
     * @param {object} update - Informazioni sull'aggiornamento
     */
    async showUpdateDialog(update) {
        const shouldUpdate = await this.askUser(
            `È disponibile una nuova versione (${update.version}).\n\nVuoi scaricare e installare l'aggiornamento ora?`,
            {
                title: 'Aggiornamento disponibile',
                kind: 'info'
            }
        );

        if (shouldUpdate) {
            await this.downloadAndInstall();
        }
    }

    /**
     * Scarica e installa l'aggiornamento
     */
    async downloadAndInstall() {
        if (!this.currentUpdate || this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.downloadProgress = 0;
        this.emit('downloadStarted');

        try {
            console.log('📥 Inizio download aggiornamento...');

            // Monitora il progresso del download
            await this.currentUpdate.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        console.log('📥 Download iniziato');
                        this.emit('downloadProgress', { progress: 0, contentLength: event.data.contentLength });
                        break;
                    case 'Progress':
                        this.downloadProgress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
                        console.log(`📊 Progresso download: ${this.downloadProgress}%`);
                        this.emit('downloadProgress', {
                            progress: this.downloadProgress,
                            chunkLength: event.data.chunkLength,
                            contentLength: event.data.contentLength
                        });
                        break;
                    case 'Finished':
                        console.log('✅ Download completato');
                        this.downloadProgress = 100;
                        this.emit('downloadFinished');
                        break;
                }
            });

            console.log('🔄 Aggiornamento installato, riavvio...');
            this.emit('installFinished');

            // Mostra messaggio di successo prima del riavvio
            await this.showMessage('Aggiornamento installato con successo!\n\nL\'applicazione verrà riavviata ora.', {
                title: 'Aggiornamento completato',
                kind: 'info'
            });

            // Riavvia l'applicazione
            await this.relaunchApplication();

        } catch (error) {
            console.error('❌ Errore durante l\'installazione:', error);
            this.emit('downloadError', error);

            await this.showMessage(`Errore durante l'installazione dell'aggiornamento: ${error.message}`, {
                title: 'Errore',
                kind: 'error'
            });
        } finally {
            this.isDownloading = false;
        }
    }

    /**
     * Riavvia l'applicazione in modo sicuro
     */
    async relaunchApplication() {
        try {
            // Usa l'API updater per il riavvio
            const updater = await this.getTauriUpdater();
            if (updater.relaunch) {
                await updater.relaunch();
            } else {
                throw new Error('Metodo relaunch non disponibile');
            }
        } catch (error) {
            console.error('Errore durante il riavvio:', error);
            await this.showMessage('L\'aggiornamento è stato installato ma c\'è stato un problema con il riavvio automatico.\n\nRiavvia manualmente l\'applicazione.', {
                title: 'Riavvio manuale richiesto',
                kind: 'warning'
            });
        }
    }

    /**
     * Ottiene la versione corrente dell'applicazione
     */
    async getCurrentVersion() {
        try {
            // Se siamo in modalità test, usa la versione test se impostata
            const testVersion = localStorage.getItem('presto_test_current_version');
            if (testVersion && localStorage.getItem('presto_force_update_test') === 'true') {
                console.log('🧪 Usando versione di test:', testVersion);
                return testVersion;
            }

            if (window.__TAURI__?.app?.getVersion) {
                return await window.__TAURI__.app.getVersion();
            }
            return '0.1.0'; // fallback
        } catch (error) {
            console.warn('Non riesco a ottenere la versione corrente:', error);
            return '0.1.0';
        }
    }

    /**
     * Apre la pagina delle release su GitHub
     */
    async openReleasePage() {
        try {
            const url = 'https://github.com/murdercode/presto/releases';
            if (window.__TAURI__?.shell?.open) {
                await window.__TAURI__.shell.open(url);
            } else {
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Errore aprendo pagina release:', error);
        }
    }

    /**
     * Ottiene lo stato corrente degli aggiornamenti
     */
    getStatus() {
        return {
            updateAvailable: this.updateAvailable,
            currentUpdate: this.currentUpdate,
            isChecking: this.isChecking,
            isDownloading: this.isDownloading,
            downloadProgress: this.downloadProgress,
            autoCheck: this.autoCheck,
            developmentMode: this.isDevelopmentMode()
        };
    }

    /**
     * Attiva/disattiva il controllo automatico
     * @param {boolean} enabled 
     */
    setAutoCheck(enabled) {
        this.autoCheck = enabled;
        if (enabled) {
            this.startAutoCheck();
        } else {
            this.stopAutoCheck();
        }

        // Salva la preferenza nell'storage locale
        try {
            localStorage.setItem('presto_auto_check_updates', enabled.toString());
        } catch (error) {
            console.warn('Non riesco a salvare la preferenza auto-check:', error);
        }
    }

    /**
     * Carica le preferenze dell'utente
     */
    loadPreferences() {
        try {
            const autoCheck = localStorage.getItem('presto_auto_check_updates');
            if (autoCheck !== null) {
                this.setAutoCheck(autoCheck === 'true');
            }
        } catch (error) {
            console.warn('Non riesco a caricare le preferenze:', error);
        }
    }

    /**
     * Registra un listener per gli eventi
     * @param {string} event 
     * @param {function} callback 
     */
    on(event, callback) {
        this.eventTarget.addEventListener(event, callback);
    }

    /**
     * Rimuove un listener per gli eventi
     * @param {string} event 
     * @param {function} callback 
     */
    off(event, callback) {
        this.eventTarget.removeEventListener(event, callback);
    }

    /**
     * Emette un evento personalizzato
     * @private
     */
    emit(event, data = null) {
        this.eventTarget.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    /**
     * Cleanup delle risorse
     */
    destroy() {
        this.stopAutoCheck();
        this.eventTarget = null;
    }
}

// Esporta un'istanza singleton
export const updateManager = new UpdateManager();

// Per debug: aggiungi funzioni globali per testare gli aggiornamenti
if (typeof window !== 'undefined') {
    window.updateManagerDebug = {
        enableTestMode: () => {
            const result = updateManager.enableTestMode();
            console.log('🧪 Test mode result:', result);
            console.log('🔍 Current status:', updateManager.getStatus());
            return result;
        },
        disableTestMode: () => {
            const result = updateManager.disableTestMode();
            console.log('✅ Test mode disabled:', result);
            console.log('🔍 Current status:', updateManager.getStatus());
            return result;
        },
        checkForUpdates: () => {
            console.log('🔄 Avvio controllo aggiornamenti manuale...');
            console.log('🔍 Environment info:', {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                href: window.location.href,
                hasTauri: !!window.__TAURI__,
                testMode: localStorage.getItem('presto_force_update_test'),
                isDev: updateManager.isDevelopmentMode()
            });
            return updateManager.checkForUpdates(true);
        },
        getStatus: () => {
            const status = updateManager.getStatus();
            console.table(status);
            return status;
        },
        getCurrentVersion: () => updateManager.getCurrentVersion(),
        openReleasePage: () => updateManager.openReleasePage(),

        // Funzioni di debug aggiuntive
        checkEnvironment: () => {
            const env = {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                href: window.location.href,
                hasTauri: !!window.__TAURI__,
                hasUpdater: !!window.__TAURI__?.updater,
                hasCore: !!window.__TAURI__?.core,
                hasInvoke: !!window.__TAURI__?.core?.invoke,
                testMode: localStorage.getItem('presto_force_update_test'),
                isDevelopmentMode: updateManager.isDevelopmentMode()
            };
            console.table(env);
            return env;
        },

        forceTestMode: () => {
            localStorage.setItem('presto_force_update_test', 'true');
            console.warn('⚠️ FORZATA MODALITÀ TEST - Ricarica la pagina');
            return 'Test mode forzato nel localStorage. Ricarica la pagina.';
        },

        // Funzioni di test avanzate
        testSimulatedUpdate: async () => {
            console.log('🧪 Test simulazione aggiornamenti...');
            updateManager.enableTestMode();
            const result = await updateManager.checkForUpdates(true);
            console.log('🔍 Risultato test:', result);
            return result;
        },

        setTestVersion: (version) => {
            localStorage.setItem('presto_test_current_version', version);
            console.log(`🔢 Versione di test impostata a: ${version}`);
            return `Versione di test: ${version}. Ora checkForUpdates() userà questa versione.`;
        },

        clearTestData: () => {
            localStorage.removeItem('presto_force_update_test');
            localStorage.removeItem('presto_test_current_version');
            console.log('🧹 Dati di test cancellati');
            return 'Dati di test cancellati. Ricarica la pagina per tornare alla modalità normale.';
        },

        // Test diretto dell'API GitHub
        testGitHubAPI: async () => {
            console.log('🌐 Test diretto API GitHub...');

            // Test entrambi i possibili repository
            const repos = [
                { name: 'presto', url: 'https://api.github.com/repos/murdercode/presto/releases/latest' },
                { name: 'tempo', url: 'https://api.github.com/repos/murdercode/tempo/releases/latest' }
            ];

            for (const repo of repos) {
                console.log(`\n🔍 Testing repository: ${repo.name}`);
                try {
                    const response = await fetch(repo.url);
                    console.log(`📊 Response status for ${repo.name}:`, response.status);

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`✅ API GitHub funziona per ${repo.name}:`, data.tag_name);
                        console.log(`📦 Versione più recente:`, data.tag_name.replace(/^app-v/, ''));
                        console.log(`🔗 URL corretto trovato: ${repo.url}`);
                        return {
                            success: true,
                            repository: repo.name,
                            correctUrl: repo.url,
                            version: data.tag_name.replace(/^app-v/, ''),
                            data: data
                        };
                    } else {
                        console.log(`❌ Repository ${repo.name} non trovato (${response.status})`);
                    }
                } catch (error) {
                    console.error(`❌ Errore API GitHub per ${repo.name}:`, error);
                }
            }

            return {
                success: false,
                error: 'Nessun repository valido trovato'
            };
        },

        // Test delle capability di fetch del browser
        testFetchCapabilities: async () => {
            console.log('🔍 Test capacità fetch del browser...');
            const tests = {
                basic: false,
                cors: false,
                github: false
            };

            // Test fetch basic
            try {
                const response = await fetch('data:application/json,{"test":true}');
                tests.basic = response.ok;
                console.log('✅ Fetch basic:', tests.basic);
            } catch (error) {
                console.error('❌ Fetch basic fallito:', error);
            }

            // Test CORS con un endpoint pubblico
            try {
                const response = await fetch('https://httpbin.org/get');
                tests.cors = response.ok;
                console.log('✅ CORS test:', tests.cors);
            } catch (error) {
                console.error('❌ CORS test fallito:', error);
            }

            // Test GitHub API
            try {
                const response = await fetch('https://api.github.com/repos/murdercode/presto/releases/latest');
                tests.github = response.ok;
                console.log('✅ GitHub API test:', tests.github);
            } catch (error) {
                console.error('❌ GitHub API test fallito:', error);
            }

            console.table(tests);
            return tests;
        }
    };

    console.log('🔧 UpdateManager Debug disponibile: window.updateManagerDebug');
    console.log('📋 Comandi disponibili:');
    console.log('  - window.updateManagerDebug.enableTestMode()');
    console.log('  - window.updateManagerDebug.testSimulatedUpdate()');
    console.log('  - window.updateManagerDebug.testGitHubAPI()');
    console.log('  - window.updateManagerDebug.testFetchCapabilities()');
    console.log('  - window.updateManagerDebug.setTestVersion("0.1.0")');
    console.log('  - window.updateManagerDebug.checkForUpdates()');
    console.log('  - window.updateManagerDebug.getStatus()');
    console.log('  - window.updateManagerDebug.checkEnvironment()');
    console.log('  - window.updateManagerDebug.clearTestData()');
}
