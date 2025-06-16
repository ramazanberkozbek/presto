# 🎨 Sistema Automatico di Gestione Temi

Questo sistema permette di aggiungere nuovi temi al timer Pomodoro **senza dover modificare manualmente il codice**. I temi vengono scoperti e caricati automaticamente.

## 🚀 Come Aggiungere un Nuovo Tema

### 1. Crea il File CSS del Tema

Crea un nuovo file CSS nella cartella `src/styles/themes/` con il seguente formato:

```css
/* Timer Theme: [Nome del Tema]
 * Author: [Tuo Nome]
 * Description: [Descrizione del tema]
 * Supports: [Light mode only / Dark mode only / Light + Dark mode]
 */

/* Import dei font se necessari */
@import url('https://fonts.googleapis.com/css2?family=...');

/* Definizione dei colori del tema */
:root[data-timer-theme="[tema-id]"] {
    /* Timer Colors */
    --focus-color: #colore-focus;
    --break-color: #colore-break;
    --long-break-color: #colore-long-break;

    /* Background Colors */
    --focus-bg: #sfondo-focus;
    --break-bg: #sfondo-break;
    --long-break-bg: #sfondo-long-break;

    /* Timer Text Colors */
    --focus-timer-color: #testo-focus;
    --break-timer-color: #testo-break;
    --long-break-timer-color: #testo-long-break;

    /* Button Colors */
    --focus-primary-btn: #bottone-focus;
    --break-primary-btn: #bottone-break;
    --long-break-primary-btn: #bottone-long-break;

    --focus-secondary-btn: #bottone-secondario-focus;
    --break-secondary-btn: #bottone-secondario-break;
    --long-break-secondary-btn: #bottone-secondario-long-break;
}

/* Stili personalizzati del tema */
:root[data-timer-theme="[tema-id]"] .timer-minutes,
:root[data-timer-theme="[tema-id]"] .timer-seconds {
    /* Personalizzazioni per i numeri del timer */
}

/* Altri stili personalizzati... */
```

### 2. Esempi di Temi Esistenti

- **`espresso.css`** - Tema di default con colori caldi
- **`pommodore64.css`** - Tema retrò ispirato al Commodore 64
- **`matrix.css`** - Tema Matrix con effetti digitali verdi

### 3. Il Sistema Fa il Resto!

Una volta creato il file CSS:

1. **Scoperta Automatica**: Il sistema scopre automaticamente il nuovo tema
2. **Caricamento Dinamico**: Il CSS viene caricato dinamicamente
3. **Registrazione**: Il tema viene registrato automaticamente
4. **Disponibilità**: Appare immediatamente nel selettore temi

## 🛠️ Sistema Tecnico

### Build Script Automatico

Il file `build-themes.js` scansiona automaticamente la cartella `src/styles/themes/` e aggiorna la lista dei temi disponibili.

**Esecuzione automatica:**
- Prima del `npm run dev`
- Prima del `npm run build`
- Manualmente con `npm run build-themes`

### Theme Loader

Il `src/utils/theme-loader.js` gestisce:
- Scoperta automatica dei file CSS
- Caricamento dinamico dei temi
- Estrazione automatica dei metadati
- Registrazione nel sistema

### Metadati Automatici

Il sistema estrae automaticamente:
- **Nome** dal commento "Timer Theme:"
- **Descrizione** dal commento "Description:"
- **Modalità supportate** dal commento "Supports:"
- **Colori di anteprima** dalle variabili CSS `--focus-color`, `--break-color`, `--long-break-color`

## 📝 Struttura Metadati

I metadati vengono estratti dai commenti CSS:

```css
/* Timer Theme: Nome Bellissimo
 * Author: Il Tuo Nome
 * Description: Una descrizione accattivante del tema
 * Supports: Light + Dark mode
 */
```

**Valori supportati per "Supports":**
- `Light mode only` - Solo modalità chiara
- `Dark mode only` - Solo modalità scura  
- `Light + Dark mode` - Entrambe le modalità

## 🎯 Vantaggi del Sistema

### ✅ Per gli Sviluppatori
- **Zero configurazione** - aggiungi un file CSS e funziona
- **No modifiche al codice** - nessun import manuale
- **Metadati automatici** - estratti dai commenti CSS
- **Hot reload** - funziona con il dev server

### ✅ Per i Designer
- **Focus sulla creatività** - concentrati sui colori e stili
- **Esempi chiari** - segui la struttura dei temi esistenti
- **Anteprima immediata** - vedi subito il risultato
- **Feedback visivo** - compatibilità mode mostrata automaticamente

### ✅ Per gli Utenti
- **Più scelta** - temi sempre aggiornati
- **Interfaccia pulita** - selezione automatica per compatibilità
- **Esperienza fluida** - cambio tema istantaneo

## 🔄 Workflow di Sviluppo

1. **Crea** `src/styles/themes/mio-tema.css`
2. **Sviluppa** usando gli esempi esistenti
3. **Testa** con `npm run dev` (auto-reload)
4. **Condividi** - il tema è pronto!

## 🎨 Template Tema Veloce

Copia e personalizza questo template:

```css
/* Timer Theme: Il Mio Tema
 * Author: Il Mio Nome  
 * Description: La mia descrizione
 * Supports: Light + Dark mode
 */

:root[data-timer-theme="mio-tema"] {
    --focus-color: #e74c3c;
    --break-color: #2ecc71;
    --long-break-color: #3498db;
    
    --focus-bg: #FFF2F2;
    --break-bg: #F0FAF0;
    --long-break-bg: #E8F4FF;
    
    --focus-timer-color: #471515;
    --break-timer-color: #14401D;
    --long-break-timer-color: #153047;
    
    --focus-primary-btn: #FF7c7c;
    --break-primary-btn: #8CE8A1;
    --long-break-primary-btn: #8BCAFF;
    
    --focus-secondary-btn: #FFD9D9;
    --break-secondary-btn: #DAFAE0;
    --long-break-secondary-btn: #D9EEFF;
}
```

---

**🎉 Divertiti a creare temi fantastici!**
