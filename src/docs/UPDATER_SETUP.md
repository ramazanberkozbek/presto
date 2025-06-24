# Setup Aggiornamenti Sicuri per macOS - VERSIONE CORRETTA

## ⚠️ IMPORTANTE: Sistema Ibrido Implementato

Questo progetto usa un **approccio ibrido** per gestire gli aggiornamenti:

1. **Controllo Versione**: Usa GitHub API per controllare se c'è una nuova versione
2. **Download/Install**: Usa l'API ufficiale Tauri quando possibile
3. **Fallback**: Se l'API Tauri fallisce, guida l'utente al download manuale

### Perché questo approccio?

L'API GitHub restituisce un formato JSON diverso da quello richiesto da Tauri v2:

**GitHub API** → `{"tag_name": "v0.2.2", "assets": [...], ...}`  
**Tauri richiede** → `{"version": "0.2.2", "platforms": {"darwin-x86_64": {...}}, ...}`

Il nostro UpdateManager gestisce questa conversione automaticamente.

## 🔧 Configurazione Attuale

Il sistema è già configurato e funzionante:

✅ **tauri.conf.json**: Configurato per usare GitHub API  
✅ **UpdateManager**: Gestisce conversione formato + fallback  
✅ **UI**: Integrata con progress bar e notifiche  
✅ **Test Mode**: Disponibile per sviluppo  

## 🧪 Test Immediato

Puoi testare subito il sistema:

```javascript
// Apri console browser e prova:

// Test simulato (sempre disponibile)
window.updateManagerV2Debug.testUpdate()

// Test reale (controlla GitHub per aggiornamenti veri)
window.updateManagerV2Debug.checkRealUpdate()

// Verifica stato
window.updateManagerV2Debug.getStatus()
```

## � Cosa Succede Durante un Aggiornamento

### 1. **Controllo Automatico**
- ✅ Ogni ora (se abilitato)
- ✅ All'avvio dell'app (dopo 30 secondi)
- ✅ Manuale con pulsante "Check for Updates"

### 2. **Processo di Verifica**
1. Controlla GitHub API per l'ultima release
2. Confronta con versione locale
3. Se disponibile, prova API Tauri per download automatico
4. Se API Tauri fallisce, offre download manuale

### 3. **Download e Installazione**
- **Automatico**: Se l'API Tauri funziona
- **Manuale**: Se necessario, apre pagina download
- **Progress**: Barra di progresso in tempo reale
- **Riavvio**: Automatico dopo installazione

## 🔐 Setup Chiavi di Firma (Opzionale)

Per aggiornamenti completamente automatici, genera le chiavi:

```bash
npm run tauri signer generate -- -w ~/.tauri/presto.key
```

Poi aggiorna la `pubkey` in `tauri.conf.json` con il contenuto di `~/.tauri/presto.key.pub`.

**NOTA**: Anche senza chiavi, il sistema funziona con download manuale.

## 🔍 Verifica Sistema

```bash
# Verifica configurazione
npm run dev

# In console browser:
window.updateManagerV2Debug.getStatus()
```

**Output atteso**:
```
{
  updateAvailable: false,
  isChecking: false,
  developmentMode: true,    // true in dev, false in prod
  version: "v2-corrected"   // conferma versione corretta
}
```

## 🚀 Deploy

1. **Build**: `npm run build`
2. **Test**: Installa l'app e prova il controllo aggiornamenti
3. **Release**: Pubblica su GitHub Releases (con file .app.tar.gz)

## 📁 File Necessari per Release

Quando crei una release su GitHub, assicurati di includere:

- `presto.app.tar.gz` (generato da `npm run build`)
- `presto.app.tar.gz.sig` (se hai le chiavi di firma)

Il sistema li troverà automaticamente.

## 🔧 Risoluzione Problemi

### "Aggiornamento non disponibile"
- ✅ Normale se sei all'ultima versione
- ✅ Usa `testUpdate()` per simulare aggiornamento

### "Download manuale richiesto"
- ✅ Normale se non hai configurato le chiavi di firma
- ✅ Il sistema aprirà automaticamente la pagina di download

### "Errore di rete"
- ✅ Verifica connessione Internet
- ✅ Controlla se GitHub è accessibile

## 🎯 Stato Attuale: PRONTO

Il sistema è **completamente funzionante** e pronto per l'uso:

- ✅ Controllo automatico abilitato
- ✅ UI integrata e funzionante  
- ✅ Fallback per download manuale
- ✅ Modalità test per sviluppo
- ✅ Compatibile con macOS

**Non serve configurare nulla di più** - funziona subito!
