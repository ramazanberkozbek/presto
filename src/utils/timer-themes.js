// Timer Themes Configuration
// This file defines all available timer themes and their properties

export const TIMER_THEMES = {
    espresso: {
        name: 'Espresso',
        description: 'Warm, coffee-inspired colors with rich earth tones',
        supports: ['light', 'dark'],
        isDefault: true,
        preview: {
            focus: '#e74c3c',
            break: '#2ecc71',
            longBreak: '#3498db'
        }
    },
    pommodore64: {
        name: 'Pommodore64',
        description: 'Un tema retrò ispirato al Commodore 64 con colori nostalgici e font pixelato',
        supports: ['light'],
        isDefault: false,
        preview: {
            focus: '#6c5ce7',
            break: '#0984e3',
            longBreak: '#00b894'
        }
    }
};

// Get theme by ID
export function getThemeById(themeId) {
    return TIMER_THEMES[themeId] || TIMER_THEMES.espresso;
}

// Get all available themes
export function getAllThemes() {
    return Object.entries(TIMER_THEMES).map(([id, theme]) => ({
        id,
        ...theme
    }));
}

// Get compatible themes for current color mode
export function getCompatibleThemes(colorMode = 'light') {
    return getAllThemes().filter(theme =>
        theme.supports.includes(colorMode)
    );
}

// Check if theme is compatible with color mode
export function isThemeCompatible(themeId, colorMode = 'light') {
    const theme = getThemeById(themeId);
    return theme.supports.includes(colorMode);
}

// Get default theme
export function getDefaultTheme() {
    const defaultTheme = getAllThemes().find(theme => theme.isDefault);
    return defaultTheme || getAllThemes()[0];
}
