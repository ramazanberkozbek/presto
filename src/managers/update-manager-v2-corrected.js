/**
 * Update Manager per Tauri v2 - Versione Corretta Browser
 * 
 * Usa le API Tauri esposte tramite window.__TAURI__ invece degli import ES6
 * per compatibilità con l'ambiente browser.
 */

export class UpdateManagerV2 {
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

        console.log('✅ UpdateManager v2 inizializzato (browser compatible)');
    }

    /**
     * Verifica se siamo in modalità sviluppo
     */
    isDevelopmentMode() {
        // Permetti override per test degli aggiornamenti
        if (localStorage.getItem('presto_force_update_test') === 'true') {
            console.log('🧪 Modalità test aggiornamenti attiva');
            return false;
        }

        // Verifica se siamo in un ambiente Tauri
        if (!window.__TAURI__) {
            console.log('🔍 Non è un ambiente Tauri - modalità sviluppo');
            return true;
        }

        // Verifica se stiamo running da tauri dev
        if (window.location.protocol === 'tauri:') {
            console.log('🔍 Protocollo tauri: - app compilata');
            return false;
        }

        // Se stiamo usando localhost, siamo in modalità dev
        if (window.location.hostname === 'localhost' ||
            window.location.href.includes('localhost') ||
            window.location.href.includes('127.0.0.1')) {
            console.log('🔍 Localhost rilevato - modalità sviluppo');
            return true;
        }

        console.log('🔍 Ambiente produzione rilevato');
        return false;
    }

    /**
     * Ottiene l'API updater di Tauri in modo sicuro
     */
    async getTauriUpdaterAPI() {
        if (!window.__TAURI__) {
            throw new Error('Ambiente Tauri non disponibile');
        }

        // Prova diverse modalità di accesso all'API updater
        if (window.__TAURI__.updater) {
            console.log('✅ Usando API updater globale');
            return window.__TAURI__.updater;
        }

        if (window.__TAURI__.core && window.__TAURI__.core.invoke) {
            console.log('✅ Usando API updater via invoke');
            return {
                check: () => window.__TAURI__.core.invoke('plugin:updater|check'),
                downloadAndInstall: (onProgress) => {
                    console.warn('⚠️ downloadAndInstall non supportato via invoke');
                    throw new Error('Download automatico non disponibile');
                }
            };
        }

        // Se non disponibile, usiamo fetch diretto
        console.log('ℹ️ API updater non disponibile, usando approccio manuale');
        return null;
    }

    /**
     * Ottiene l'API app per la versione
     */
    async getAppVersion() {
        try {
            if (window.__TAURI__?.app?.getVersion) {
                return await window.__TAURI__.app.getVersion();
            }
            
            if (window.__TAURI__?.core?.invoke) {
                return await window.__TAURI__.core.invoke('plugin:app|version');
            }

            throw new Error('API versione non disponibile');
        } catch (error) {
            console.warn('❌ Errore recupero versione:', error);
            return '0.2.2'; // fallback
        }
    }

    /**
     * Riavvia l'applicazione
     */
    async restartApp() {
        try {
            if (window.__TAURI__?.process?.relaunch) {
                await window.__TAURI__.process.relaunch();
                return;
            }

            if (window.__TAURI__?.core?.invoke) {
                await window.__TAURI__.core.invoke('plugin:process|restart');
                return;
            }

            throw new Error('API riavvio non disponibile');
        } catch (error) {
            console.error('❌ Errore riavvio:', error);
            await this.showMessage(
                'L\'aggiornamento è stato installato ma il riavvio automatico non è disponibile.\n\nRiavvia manualmente l\'applicazione.',
                { title: 'Riavvio Manuale', kind: 'warning' }
            );
        }
    }

    /**
     * Attiva la modalità test per gli aggiornamenti
     */
    enableTestMode() {
        localStorage.setItem('presto_force_update_test', 'true');
        console.warn('⚠️ MODALITÀ TEST AGGIORNAMENTI ATTIVATA');
        
        if (!this.isDevelopmentMode() && this.autoCheck && !this.checkInterval) {
            this.startAutoCheck();
        }

        return 'Modalità test attivata! Usa checkForUpdates() per testare.';
    }

    /**
     * Disattiva la modalità test
     */
    disableTestMode() {
        localStorage.removeItem('presto_force_update_test');
        console.log('✅ Modalità test disattivata');

        if (this.isDevelopmentMode()) {
            this.stopAutoCheck();
        }

        return 'Modalità test disattivata';
    }

    /**
     * Mostra un messaggio all'utente
     */
    async showMessage(content, options = {}) {
        try {
            if (window.__TAURI__?.dialog?.message) {
                return await window.__TAURI__.dialog.message(content, options);
            }
            
            if (window.__TAURI__?.core?.invoke) {
                return await window.__TAURI__.core.invoke('plugin:dialog|message', {
                    message: content,
                    ...options
                });
            }

            // Fallback al browser alert
            alert(content);
        } catch (error) {
            console.error('Errore mostrando messaggio:', error);
            alert(content);
        }
    }

    /**
     * Chiede conferma all'utente
     */
    async askUser(content, options = {}) {
        try {
            if (window.__TAURI__?.dialog?.ask) {
                return await window.__TAURI__.dialog.ask(content, options);
            }
            
            if (window.__TAURI__?.core?.invoke) {
                return await window.__TAURI__.core.invoke('plugin:dialog|ask', {
                    message: content,
                    ...options
                });
            }

            // Fallback al browser confirm
            return confirm(content);
        } catch (error) {
            console.error('Errore chiedendo conferma:', error);
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

            console.log('🔄 Controllo automatico aggiornamenti avviato');
        }
    }

    /**
     * Ferma il controllo automatico degli aggiornamenti
     */
    stopAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏹️ Controllo automatico fermato');
        }
    }

    /**
     * Confronta due versioni
     */
    compareVersions(a, b) {
        const cleanA = a.replace(/^v/, '');
        const cleanB = b.replace(/^v/, '');
        
        const aParts = cleanA.split('.').map(n => parseInt(n) || 0);
        const bParts = cleanB.split('.').map(n => parseInt(n) || 0);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;

            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        }

        return 0;
    }

    /**
     * Controlla se sono disponibili aggiornamenti usando approccio ibrido sicuro
     */
    async checkForUpdates(showDialog = true) {
        if (this.isChecking) {
            console.log('⏳ Controllo già in corso');
            return false;
        }

        this.isChecking = true;
        this.emit('checkStarted');

        try {
            console.log('🔄 Controllo aggiornamenti...');

            // Verifica ambiente
            const isDevMode = this.isDevelopmentMode();
            const hasTestMode = localStorage.getItem('presto_force_update_test') === 'true';

            if (isDevMode && !hasTestMode) {
                console.warn('⚠️ Modalità sviluppo - controllo disabilitato');
                this.emit('updateNotAvailable');
                if (showDialog) {
                    await this.showDevelopmentMessage();
                }
                return false;
            }

            // Se in test mode, simula aggiornamento
            if (hasTestMode) {
                return await this.checkForUpdatesSimulated(showDialog);
            }

            // APPROCCIO IBRIDO SICURO:
            // 1. Controlla GitHub API per vedere se c'è una nuova versione
            // 2. Se c'è, prova l'API Tauri per download automatico
            // 3. Se fallisce, offre download manuale
            
            const currentVersion = await this.getAppVersion();
            console.log('📋 Versione corrente:', currentVersion);

            // Controlla GitHub API
            console.log('🌐 Contatto GitHub API...');
            const response = await fetch('https://api.github.com/repos/murdercode/presto/releases/latest');
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const githubRelease = await response.json();
            const latestVersion = githubRelease.tag_name.replace(/^v/, '');
            
            console.log('📦 Ultima versione su GitHub:', latestVersion);

            // Confronta versioni
            if (this.compareVersions(latestVersion, currentVersion) <= 0) {
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

            // C'è un aggiornamento disponibile!
            console.log('🎉 Aggiornamento disponibile!');

            // Prova l'API Tauri prima
            let tauriUpdate = null;
            try {
                const updaterAPI = await this.getTauriUpdaterAPI();
                if (updaterAPI) {
                    console.log('🔍 Provo API Tauri...');
                    tauriUpdate = await updaterAPI.check();
                    
                    if (tauriUpdate?.available) {
                        console.log('✅ Confermato con API Tauri:', tauriUpdate.version);
                        this.updateAvailable = true;
                        this.currentUpdate = tauriUpdate;
                        this.emit('updateAvailable', tauriUpdate);

                        if (showDialog) {
                            await this.showUpdateDialog(tauriUpdate);
                        }
                        return true;
                    }
                }
            } catch (tauriError) {
                console.warn('⚠️ API Tauri non disponibile:', tauriError.message);
            }

            // Se l'API Tauri non funziona, crea update manuale
            console.log('📋 Creo aggiornamento manuale...');
            const manualUpdate = this.createManualUpdateFromGitHub(githubRelease);
            
            this.updateAvailable = true;
            this.currentUpdate = manualUpdate;
            this.emit('updateAvailable', manualUpdate);

            if (showDialog) {
                await this.showUpdateDialog(manualUpdate);
            }
            return true;

        } catch (error) {
            console.error('❌ Errore controllo aggiornamenti:', error);
            this.emit('checkError', error);

            if (showDialog) {
                await this.showMessage(`Errore durante il controllo degli aggiornamenti:\n\n${error.message}`, {
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
     * Crea un oggetto update manuale da una risposta GitHub
     */
    createManualUpdateFromGitHub(githubRelease) {
        const macosAsset = githubRelease.assets?.find(asset => 
            asset.name.includes('.app.tar.gz') && 
            !asset.name.includes('.sig')
        );

        const dmgAsset = githubRelease.assets?.find(asset => 
            asset.name.includes('.dmg')
        );

        const downloadUrl = macosAsset?.browser_download_url || dmgAsset?.browser_download_url;

        return {
            available: true,
            version: githubRelease.tag_name.replace(/^v/, ''),
            date: githubRelease.published_at,
            body: githubRelease.body || 'Nessuna nota di rilascio disponibile',
            downloadAndInstall: async (progressCallback) => {
                console.log('📥 Avvio download manuale...');
                
                if (progressCallback) {
                    progressCallback({ event: 'Started', data: { contentLength: 0 } });
                }
                
                await this.showMessage(
                    'Download manuale richiesto.\n\nL\'aggiornamento automatico non è disponibile. Verrà aperta la pagina di download.',
                    { title: 'Download Manuale', kind: 'info' }
                );
                
                // Apri la pagina di download
                if (downloadUrl) {
                    await this.openURL(downloadUrl);
                } else {
                    await this.openReleasePage();
                }
                
                if (progressCallback) {
                    progressCallback({ event: 'Finished', data: {} });
                }
            }
        };
    }

    /**
     * Controlla aggiornamenti in modalità simulata
     */
    async checkForUpdatesSimulated(showDialog = true) {
        console.log('🧪 Simulazione controllo aggiornamenti...');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const currentVersion = await this.getAppVersion();
        const simulatedNewVersion = this.incrementVersion(currentVersion);
        
        const update = {
            available: true,
            version: simulatedNewVersion,
            date: new Date().toISOString(),
            body: `🧪 AGGIORNAMENTO SIMULATO\n\nTest da ${currentVersion} a ${simulatedNewVersion}`,
            downloadAndInstall: this.simulateDownloadAndInstall.bind(this)
        };

        this.updateAvailable = true;
        this.currentUpdate = update;
        this.emit('updateAvailable', update);

        if (showDialog) {
            await this.showUpdateDialog(update);
        }

        return true;
    }

    /**
     * Incrementa versione per simulazione
     */
    incrementVersion(version) {
        const parts = version.split('.').map(n => parseInt(n) || 0);
        parts[2]++; // Incrementa patch
        return parts.join('.');
    }

    /**
     * Simula download per test
     */
    async simulateDownloadAndInstall(progressCallback) {
        console.log('🧪 Simulazione download...');

        const totalSize = 5 * 1024 * 1024;
        let downloaded = 0;

        if (progressCallback) {
            progressCallback({ event: 'Started', data: { contentLength: totalSize } });
        }

        const chunks = 20;
        const chunkSize = totalSize / chunks;

        for (let i = 0; i < chunks; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            downloaded += chunkSize;

            if (progressCallback) {
                progressCallback({
                    event: 'Progress',
                    data: { chunkLength: downloaded, contentLength: totalSize }
                });
            }
        }

        if (progressCallback) {
            progressCallback({ event: 'Finished', data: {} });
        }

        await this.showMessage('🧪 SIMULAZIONE: Download completato!', {
            title: 'Test Completato',
            kind: 'info'
        });
    }

    /**
     * Mostra dialogo di conferma aggiornamento
     */
    async showUpdateDialog(update) {
        const shouldUpdate = await this.askUser(
            `È disponibile una nuova versione (${update.version}).\n\n${update.body ? update.body.substring(0, 200) + '...' : ''}\n\nVuoi scaricare e installare l'aggiornamento ora?`,
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
     * Scarica e installa aggiornamento
     */
    async downloadAndInstall() {
        if (!this.currentUpdate || this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.downloadProgress = 0;
        this.emit('downloadStarted');

        try {
            console.log('📥 Inizio download...');

            await this.currentUpdate.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        console.log('📥 Download iniziato');
                        this.emit('downloadProgress', { 
                            progress: 0, 
                            contentLength: event.data.contentLength 
                        });
                        break;
                    case 'Progress':
                        this.downloadProgress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
                        console.log(`📊 Progresso: ${this.downloadProgress}%`);
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

            console.log('🔄 Installazione completata, riavvio...');
            this.emit('installFinished');

            await this.showMessage('Aggiornamento installato!\n\nL\'applicazione verrà riavviata.', {
                title: 'Aggiornamento completato',
                kind: 'info'
            });

            await this.restartApp();

        } catch (error) {
            console.error('❌ Errore installazione:', error);
            this.emit('downloadError', error);

            await this.showMessage(`Errore durante l'installazione: ${error.message}`, {
                title: 'Errore',
                kind: 'error'
            });
        } finally {
            this.isDownloading = false;
        }
    }

    /**
     * Ottiene versione corrente (alias per getAppVersion)
     */
    async getCurrentVersion() {
        return await this.getAppVersion();
    }

    /**
     * Apre URL
     */
    async openURL(url) {
        try {
            if (window.__TAURI__?.shell?.open) {
                await window.__TAURI__.shell.open(url);
                return;
            }

            if (window.__TAURI__?.core?.invoke) {
                await window.__TAURI__.core.invoke('plugin:shell|open', { url });
                return;
            }

            // Fallback browser
            window.open(url, '_blank');
        } catch (error) {
            console.error('Errore aprendo URL:', error);
            window.open(url, '_blank');
        }
    }

    /**
     * Apre pagina release
     */
    async openReleasePage() {
        await this.openURL('https://github.com/murdercode/presto/releases');
    }

    /**
     * Ottiene stato
     */
    getStatus() {
        return {
            updateAvailable: this.updateAvailable,
            currentUpdate: this.currentUpdate,
            isChecking: this.isChecking,
            isDownloading: this.isDownloading,
            downloadProgress: this.downloadProgress,
            autoCheck: this.autoCheck,
            developmentMode: this.isDevelopmentMode(),
            version: 'v2-browser-compatible'
        };
    }

    /**
     * Imposta controllo automatico
     */
    setAutoCheck(enabled) {
        this.autoCheck = enabled;
        if (enabled) {
            this.startAutoCheck();
        } else {
            this.stopAutoCheck();
        }

        try {
            localStorage.setItem('presto_auto_check_updates', enabled.toString());
        } catch (error) {
            console.warn('Errore salvataggio preferenze:', error);
        }
    }

    /**
     * Carica preferenze
     */
    loadPreferences() {
        try {
            const autoCheck = localStorage.getItem('presto_auto_check_updates');
            if (autoCheck !== null) {
                this.setAutoCheck(autoCheck === 'true');
            }
        } catch (error) {
            console.warn('Errore caricamento preferenze:', error);
        }
    }

    // Event management
    on(event, callback) {
        this.eventTarget.addEventListener(event, callback);
    }

    off(event, callback) {
        this.eventTarget.removeEventListener(event, callback);
    }

    emit(event, data = null) {
        this.eventTarget.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    destroy() {
        this.stopAutoCheck();
        this.eventTarget = null;
    }
}

// Esporta istanza singleton
export const updateManager = new UpdateManagerV2();

// Debug utilities
if (typeof window !== 'undefined') {
    window.updateManagerV2Debug = {
        enableTestMode: () => updateManager.enableTestMode(),
        disableTestMode: () => updateManager.disableTestMode(),
        checkForUpdates: () => updateManager.checkForUpdates(true),
        getStatus: () => {
            const status = updateManager.getStatus();
            console.table(status);
            return status;
        },
        getCurrentVersion: () => updateManager.getCurrentVersion(),
        openReleasePage: () => updateManager.openReleasePage(),
        testUpdate: async () => {
            console.log('🧪 Test completo...');
            updateManager.enableTestMode();
            return await updateManager.checkForUpdates(true);
        },
        checkRealUpdate: async () => {
            console.log('🔍 Controllo aggiornamento reale...');
            const oldTestMode = localStorage.getItem('presto_force_update_test');
            localStorage.removeItem('presto_force_update_test');
            try {
                return await updateManager.checkForUpdates(true);
            } finally {
                if (oldTestMode) {
                    localStorage.setItem('presto_force_update_test', oldTestMode);
                }
            }
        },
        checkEnvironment: () => {
            const env = {
                hasTauri: !!window.__TAURI__,
                hasUpdater: !!window.__TAURI__?.updater,
                hasCore: !!window.__TAURI__?.core,
                hasApp: !!window.__TAURI__?.app,
                hasDialog: !!window.__TAURI__?.dialog,
                hasShell: !!window.__TAURI__?.shell,
                protocol: window.location.protocol,
                hostname: window.location.hostname
            };
            console.table(env);
            return env;
        }
    };

    console.log('🔧 UpdateManager V2 BROWSER COMPATIBLE Debug disponibile: window.updateManagerV2Debug');
    console.log('📋 Comandi disponibili:');
    console.log('  - window.updateManagerV2Debug.testUpdate() // test simulato');
    console.log('  - window.updateManagerV2Debug.checkRealUpdate() // test reale');
    console.log('  - window.updateManagerV2Debug.getStatus()');
    console.log('  - window.updateManagerV2Debug.checkEnvironment() // verifica API Tauri');
}

export class UpdateManagerV2 {
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

        console.log('✅ UpdateManager v2 inizializzato (versione corretta)');
    }

    /**
     * Verifica se siamo in modalità sviluppo
     */
    isDevelopmentMode() {
        // Permetti override per test degli aggiornamenti
        if (localStorage.getItem('presto_force_update_test') === 'true') {
            console.log('🧪 Modalità test aggiornamenti attiva');
            return false;
        }

        // Verifica se siamo in un ambiente Tauri
        if (!window.__TAURI__) {
            console.log('🔍 Non è un ambiente Tauri - modalità sviluppo');
            return true;
        }

        // Verifica se stiamo running da tauri dev
        if (window.location.protocol === 'tauri:') {
            console.log('🔍 Protocollo tauri: - app compilata');
            return false;
        }

        // Se stiamo usando localhost, siamo in modalità dev
        if (window.location.hostname === 'localhost' ||
            window.location.href.includes('localhost') ||
            window.location.href.includes('127.0.0.1')) {
            console.log('🔍 Localhost rilevato - modalità sviluppo');
            return true;
        }

        console.log('🔍 Ambiente produzione rilevato');
        return false;
    }

    /**
     * Attiva la modalità test per gli aggiornamenti
     */
    enableTestMode() {
        localStorage.setItem('presto_force_update_test', 'true');
        console.warn('⚠️ MODALITÀ TEST AGGIORNAMENTI ATTIVATA');
        
        if (!this.isDevelopmentMode() && this.autoCheck && !this.checkInterval) {
            this.startAutoCheck();
        }

        return 'Modalità test attivata! Usa checkForUpdates() per testare.';
    }

    /**
     * Disattiva la modalità test
     */
    disableTestMode() {
        localStorage.removeItem('presto_force_update_test');
        console.log('✅ Modalità test disattivata');

        if (this.isDevelopmentMode()) {
            this.stopAutoCheck();
        }

        return 'Modalità test disattivata';
    }

    /**
     * Mostra un messaggio all'utente
     */
    async showMessage(content, options = {}) {
        try {
            const { message } = await import('@tauri-apps/plugin-dialog');
            return await message(content, options);
        } catch (error) {
            console.error('Errore mostrando messaggio:', error);
            alert(content);
        }
    }

    /**
     * Chiede conferma all'utente
     */
    async askUser(content, options = {}) {
        try {
            const { ask } = await import('@tauri-apps/plugin-dialog');
            return await ask(content, options);
        } catch (error) {
            console.error('Errore chiedendo conferma:', error);
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

            console.log('🔄 Controllo automatico aggiornamenti avviato');
        }
    }

    /**
     * Ferma il controllo automatico degli aggiornamenti
     */
    stopAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏹️ Controllo automatico fermato');
        }
    }

    /**
     * Converte una risposta GitHub API nel formato richiesto da Tauri v2
     */
    convertGitHubResponseToTauriFormat(githubResponse) {
        console.log('🔄 Conversione formato GitHub → Tauri');
        
        // Trova l'asset per macOS
        const macosAsset = githubResponse.assets?.find(asset => 
            asset.name.includes('.app.tar.gz') && 
            !asset.name.includes('.sig')
        );

        const macosSignature = githubResponse.assets?.find(asset => 
            asset.name.includes('.app.tar.gz.sig')
        );

        if (!macosAsset) {
            throw new Error('Asset macOS non trovato nella release');
        }

        if (!macosSignature) {
            console.warn('⚠️ Firma non trovata - aggiornamenti non sicuri');
        }

        // Formato richiesto da Tauri v2
        const tauriFormat = {
            version: githubResponse.tag_name.replace(/^v/, ''), // Rimuovi 'v' dal tag
            notes: githubResponse.body || 'Nessuna nota di rilascio disponibile',
            pub_date: githubResponse.published_at,
            platforms: {
                'darwin-x86_64': {
                    signature: '', // Sarà popolata quando avremo il contenuto del file .sig
                    url: macosAsset.browser_download_url
                },
                'darwin-aarch64': {
                    signature: '', // Stesso per Apple Silicon
                    url: macosAsset.browser_download_url
                }
            }
        };

        console.log('✅ Conversione completata:', tauriFormat);
        return tauriFormat;
    }

    /**
     * Controlla se sono disponibili aggiornamenti usando un approccio ibrido
     */
    async checkForUpdates(showDialog = true) {
        if (this.isChecking) {
            console.log('⏳ Controllo già in corso');
            return false;
        }

        this.isChecking = true;
        this.emit('checkStarted');

        try {
            console.log('🔄 Controllo aggiornamenti...');

            // Verifica ambiente
            const isDevMode = this.isDevelopmentMode();
            const hasTestMode = localStorage.getItem('presto_force_update_test') === 'true';

            if (isDevMode && !hasTestMode) {
                console.warn('⚠️ Modalità sviluppo - controllo disabilitato');
                this.emit('updateNotAvailable');
                if (showDialog) {
                    await this.showDevelopmentMessage();
                }
                return false;
            }

            // Se in test mode, simula aggiornamento
            if (hasTestMode) {
                return await this.checkForUpdatesSimulated(showDialog);
            }

            // APPROCCIO IBRIDO: 
            // 1. Prima controlla GitHub API per vedere se c'è una nuova versione
            // 2. Se c'è, usa l'API Tauri solo per il download/install
            
            const currentVersion = await this.getCurrentVersion();
            console.log('📋 Versione corrente:', currentVersion);

            // Controlla GitHub API
            const response = await fetch('https://api.github.com/repos/murdercode/presto/releases/latest');
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const githubRelease = await response.json();
            const latestVersion = githubRelease.tag_name.replace(/^v/, '');
            
            console.log('📦 Ultima versione su GitHub:', latestVersion);

            // Confronta versioni
            if (this.compareVersions(latestVersion, currentVersion) <= 0) {
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

            // C'è un aggiornamento! Ora provo l'API ufficiale Tauri
            console.log('🎉 Aggiornamento disponibile! Provo API Tauri...');

            try {
                // Prova prima con l'API ufficiale Tauri
                const update = await check();
                
                if (update?.available) {
                    console.log('✅ Confermato con API Tauri:', update.version);
                    this.updateAvailable = true;
                    this.currentUpdate = update;
                    this.emit('updateAvailable', update);

                    if (showDialog) {
                        await this.showUpdateDialog(update);
                    }
                    return true;
                }
            } catch (tauriError) {
                console.warn('⚠️ API Tauri fallita, creo update manuale:', tauriError);
                
                // Se l'API Tauri fallisce, crea un oggetto update manuale
                const manualUpdate = this.createManualUpdateFromGitHub(githubRelease);
                
                this.updateAvailable = true;
                this.currentUpdate = manualUpdate;
                this.emit('updateAvailable', manualUpdate);

                if (showDialog) {
                    await this.showUpdateDialog(manualUpdate);
                }
                return true;
            }

            // Questo non dovrebbe mai succedere
            console.warn('⚠️ Situazione inaspettata - GitHub dice aggiornamento disponibile ma Tauri no');
            return false;

        } catch (error) {
            console.error('❌ Errore controllo aggiornamenti:', error);
            this.emit('checkError', error);

            if (showDialog) {
                await this.showMessage(`Errore durante il controllo degli aggiornamenti:\n\n${error.message}`, {
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
     * Crea un oggetto update manuale da una risposta GitHub
     */
    createManualUpdateFromGitHub(githubRelease) {
        const macosAsset = githubRelease.assets?.find(asset => 
            asset.name.includes('.app.tar.gz') && 
            !asset.name.includes('.sig')
        );

        return {
            available: true,
            version: githubRelease.tag_name.replace(/^v/, ''),
            date: githubRelease.published_at,
            body: githubRelease.body || 'Nessuna nota di rilascio disponibile',
            downloadAndInstall: async (progressCallback) => {
                if (progressCallback) {
                    progressCallback({ event: 'Started', data: { contentLength: 0 } });
                }
                
                await this.showMessage(
                    'Download manuale richiesto.\n\nL\'aggiornamento automatico non è disponibile. Verrà aperta la pagina di download.',
                    { title: 'Download Manuale', kind: 'info' }
                );
                
                // Apri la pagina di download
                if (macosAsset) {
                    await this.openURL(macosAsset.browser_download_url);
                } else {
                    await this.openReleasePage();
                }
                
                if (progressCallback) {
                    progressCallback({ event: 'Finished', data: {} });
                }
            }
        };
    }

    /**
     * Confronta due versioni
     */
    compareVersions(a, b) {
        const cleanA = a.replace(/^v/, '');
        const cleanB = b.replace(/^v/, '');
        
        const aParts = cleanA.split('.').map(n => parseInt(n) || 0);
        const bParts = cleanB.split('.').map(n => parseInt(n) || 0);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;

            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        }

        return 0;
    }

    /**
     * Controlla aggiornamenti in modalità simulata
     */
    async checkForUpdatesSimulated(showDialog = true) {
        console.log('🧪 Simulazione controllo aggiornamenti...');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const currentVersion = await this.getCurrentVersion();
        const simulatedNewVersion = this.incrementVersion(currentVersion);
        
        const update = {
            available: true,
            version: simulatedNewVersion,
            date: new Date().toISOString(),
            body: `🧪 AGGIORNAMENTO SIMULATO\n\nTest da ${currentVersion} a ${simulatedNewVersion}`,
            downloadAndInstall: this.simulateDownloadAndInstall.bind(this)
        };

        this.updateAvailable = true;
        this.currentUpdate = update;
        this.emit('updateAvailable', update);

        if (showDialog) {
            await this.showUpdateDialog(update);
        }

        return true;
    }

    /**
     * Incrementa versione per simulazione
     */
    incrementVersion(version) {
        const parts = version.split('.').map(n => parseInt(n) || 0);
        parts[2]++; // Incrementa patch
        return parts.join('.');
    }

    /**
     * Simula download per test
     */
    async simulateDownloadAndInstall(progressCallback) {
        console.log('🧪 Simulazione download...');

        const totalSize = 5 * 1024 * 1024;
        let downloaded = 0;

        if (progressCallback) {
            progressCallback({ event: 'Started', data: { contentLength: totalSize } });
        }

        const chunks = 20;
        const chunkSize = totalSize / chunks;

        for (let i = 0; i < chunks; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            downloaded += chunkSize;

            if (progressCallback) {
                progressCallback({
                    event: 'Progress',
                    data: { chunkLength: downloaded, contentLength: totalSize }
                });
            }
        }

        if (progressCallback) {
            progressCallback({ event: 'Finished', data: {} });
        }

        await this.showMessage('🧪 SIMULAZIONE: Download completato!', {
            title: 'Test Completato',
            kind: 'info'
        });
    }

    /**
     * Mostra dialogo di conferma aggiornamento
     */
    async showUpdateDialog(update) {
        const shouldUpdate = await this.askUser(
            `È disponibile una nuova versione (${update.version}).\n\n${update.body ? update.body.substring(0, 200) + '...' : ''}\n\nVuoi scaricare e installare l'aggiornamento ora?`,
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
     * Scarica e installa aggiornamento
     */
    async downloadAndInstall() {
        if (!this.currentUpdate || this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.downloadProgress = 0;
        this.emit('downloadStarted');

        try {
            console.log('📥 Inizio download...');

            await this.currentUpdate.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        console.log('📥 Download iniziato');
                        this.emit('downloadProgress', { 
                            progress: 0, 
                            contentLength: event.data.contentLength 
                        });
                        break;
                    case 'Progress':
                        this.downloadProgress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
                        console.log(`📊 Progresso: ${this.downloadProgress}%`);
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

            console.log('🔄 Installazione completata, riavvio...');
            this.emit('installFinished');

            await this.showMessage('Aggiornamento installato!\n\nL\'applicazione verrà riavviata.', {
                title: 'Aggiornamento completato',
                kind: 'info'
            });

            await relaunch();

        } catch (error) {
            console.error('❌ Errore installazione:', error);
            this.emit('downloadError', error);

            await this.showMessage(`Errore durante l'installazione: ${error.message}`, {
                title: 'Errore',
                kind: 'error'
            });
        } finally {
            this.isDownloading = false;
        }
    }

    /**
     * Ottiene versione corrente
     */
    async getCurrentVersion() {
        try {
            const version = await getVersion();
            console.log('📋 Versione da API Tauri:', version);
            return version;
        } catch (error) {
            console.warn('❌ Errore recupero versione:', error);
            return '0.2.2'; // fallback
        }
    }

    /**
     * Apre URL
     */
    async openURL(url) {
        try {
            const { open } = await import('@tauri-apps/plugin-opener');
            await open(url);
        } catch (error) {
            console.error('Errore aprendo URL:', error);
            window.open(url, '_blank');
        }
    }

    /**
     * Apre pagina release
     */
    async openReleasePage() {
        await this.openURL('https://github.com/murdercode/presto/releases');
    }

    /**
     * Ottiene stato
     */
    getStatus() {
        return {
            updateAvailable: this.updateAvailable,
            currentUpdate: this.currentUpdate,
            isChecking: this.isChecking,
            isDownloading: this.isDownloading,
            downloadProgress: this.downloadProgress,
            autoCheck: this.autoCheck,
            developmentMode: this.isDevelopmentMode(),
            version: 'v2-corrected'
        };
    }

    /**
     * Imposta controllo automatico
     */
    setAutoCheck(enabled) {
        this.autoCheck = enabled;
        if (enabled) {
            this.startAutoCheck();
        } else {
            this.stopAutoCheck();
        }

        try {
            localStorage.setItem('presto_auto_check_updates', enabled.toString());
        } catch (error) {
            console.warn('Errore salvataggio preferenze:', error);
        }
    }

    /**
     * Carica preferenze
     */
    loadPreferences() {
        try {
            const autoCheck = localStorage.getItem('presto_auto_check_updates');
            if (autoCheck !== null) {
                this.setAutoCheck(autoCheck === 'true');
            }
        } catch (error) {
            console.warn('Errore caricamento preferenze:', error);
        }
    }

    // Event management
    on(event, callback) {
        this.eventTarget.addEventListener(event, callback);
    }

    off(event, callback) {
        this.eventTarget.removeEventListener(event, callback);
    }

    emit(event, data = null) {
        this.eventTarget.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    destroy() {
        this.stopAutoCheck();
        this.eventTarget = null;
    }
}

// Esporta istanza singleton
export const updateManager = new UpdateManagerV2();

// Debug utilities
if (typeof window !== 'undefined') {
    window.updateManagerV2Debug = {
        enableTestMode: () => updateManager.enableTestMode(),
        disableTestMode: () => updateManager.disableTestMode(),
        checkForUpdates: () => updateManager.checkForUpdates(true),
        getStatus: () => {
            const status = updateManager.getStatus();
            console.table(status);
            return status;
        },
        getCurrentVersion: () => updateManager.getCurrentVersion(),
        openReleasePage: () => updateManager.openReleasePage(),
        testUpdate: async () => {
            console.log('🧪 Test completo...');
            updateManager.enableTestMode();
            return await updateManager.checkForUpdates(true);
        },
        checkRealUpdate: async () => {
            console.log('🔍 Controllo aggiornamento reale (bypass test mode)...');
            const oldTestMode = localStorage.getItem('presto_force_update_test');
            localStorage.removeItem('presto_force_update_test');
            try {
                return await updateManager.checkForUpdates(true);
            } finally {
                if (oldTestMode) {
                    localStorage.setItem('presto_force_update_test', oldTestMode);
                }
            }
        }
    };

    console.log('🔧 UpdateManager V2 CORRECTED Debug disponibile: window.updateManagerV2Debug');
    console.log('📋 Comandi disponibili:');
    console.log('  - window.updateManagerV2Debug.testUpdate() // test simulato');
    console.log('  - window.updateManagerV2Debug.checkRealUpdate() // test reale');
    console.log('  - window.updateManagerV2Debug.getStatus()');
}
