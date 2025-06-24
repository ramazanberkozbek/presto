# 🎨 Automatic Theme Management System

This system allows you to add new themes to the Pomodoro timer **without manually modifying the code**. Themes are automatically discovered and loaded.

## 🚀 How to Add a New Theme

### 1. Create the Theme CSS File

Create a new CSS file in the `src/styles/themes/` folder with the following format:

```css
/* Timer Theme: [Theme Name]
 * Author: [Your Name]
 * Description: [Theme description]
 * Supports: [Light mode only / Dark mode only / Light + Dark mode]
 */

/* Font imports if needed */
@import url('https://fonts.googleapis.com/css2?family=...');

/* Theme color definitions */
:root[data-timer-theme="[theme-id]"] {
    /* Timer Colors */
    --focus-color: #focus-color;
    --break-color: #break-color;
    --long-break-color: #long-break-color;

    /* Background Colors */
    --focus-bg: #focus-background;
    --break-bg: #break-background;
    --long-break-bg: #long-break-background;

    /* Timer Text Colors */
    --focus-timer-color: #focus-text;
    --break-timer-color: #break-text;
    --long-break-timer-color: #long-break-text;

    /* Button Colors */
    --focus-primary-btn: #focus-button;
    --break-primary-btn: #break-button;
    --long-break-primary-btn: #long-break-button;

    --focus-secondary-btn: #focus-secondary-button;
    --break-secondary-btn: #break-secondary-button;
    --long-break-secondary-btn: #long-break-secondary-button;
}

/* Custom theme styles */
:root[data-timer-theme="[theme-id]"] .timer-minutes,
:root[data-timer-theme="[theme-id]"] .timer-seconds {
    /* Timer number customizations */
}

/* Other custom styles... */
```

### 2. Examples of Existing Themes

- **`espresso.css`** - Default theme with warm colors
- **`pommodore64.css`** - Retro theme inspired by Commodore 64
- **`pipboy.css`** - Theme inspired by Fallout (PipBoy)

### 3. The System Does the Rest!

Once you create the CSS file:

1. **Automatic Discovery**: The system automatically discovers the new theme
2. **Dynamic Loading**: CSS is loaded dynamically
3. **Registration**: The theme is automatically registered
4. **Availability**: Appears immediately in the theme selector

## 🛠️ Technical System

### Automatic Build Script

The `build-themes.js` file automatically scans the `src/styles/themes/` folder and updates the list of available themes.

**Automatic execution:**
- Before `npm run dev`
- Before `npm run build`
- Manually with `npm run build-themes`

### Theme Loader

The `src/utils/theme-loader.js` handles:
- Automatic discovery of CSS files
- Dynamic theme loading
- Automatic metadata extraction
- System registration

### Automatic Metadata

The system automatically extracts:
- **Name** from "Timer Theme:" comment
- **Description** from "Description:" comment
- **Supported modes** from "Supports:" comment
- **Preview colors** from CSS variables `--focus-color`, `--break-color`, `--long-break-color`

## 📝 Metadata Structure

Metadata is extracted from CSS comments:

```css
/* Timer Theme: Beautiful Name
 * Author: Your Name
 * Description: An engaging theme description
 * Supports: Light + Dark mode
 */
```

**Supported values for "Supports":**
- `Light mode only` - Light mode only
- `Dark mode only` - Dark mode only
- `Light + Dark mode` - Both modes

## 🎯 System Benefits

### ✅ For Developers
- **Zero configuration** - add a CSS file and it works
- **No code changes** - no manual imports
- **Automatic metadata** - extracted from CSS comments
- **Hot reload** - works with dev server

### ✅ For Designers
- **Focus on creativity** - concentrate on colors and styles
- **Clear examples** - follow existing theme structure
- **Immediate preview** - see results instantly
- **Visual feedback** - mode compatibility shown automatically

### ✅ For Users
- **More choice** - always updated themes
- **Clean interface** - automatic selection for compatibility
- **Smooth experience** - instant theme switching

## 🔄 Development Workflow

1. **Create** `src/styles/themes/my-theme.css`
2. **Develop** using existing examples
3. **Test** with `npm run dev` (auto-reload)
4. **Share** - the theme is ready!

## 🎨 Quick Theme Template

Copy and customize this template:

```css
/* Timer Theme: My Theme
 * Author: My Name
 * Description: My description
 * Supports: Light + Dark mode
 */

:root[data-timer-theme="my-theme"] {
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

**🎉 Have fun creating fantastic themes!**
