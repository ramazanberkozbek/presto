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
  ocean: {
    name: 'Ocean',
    description: 'Calming blues and teals inspired by ocean depths',
    supports: ['light', 'dark'],
    isDefault: false,
    preview: {
      focus: '#2980b9',
      break: '#1abc9c',
      longBreak: '#3498db'
    }
  },
  forest: {
    name: 'Forest',
    description: 'Earthy greens and browns inspired by deep forests',
    supports: ['light', 'dark'],
    isDefault: false,
    preview: {
      focus: '#27ae60',
      break: '#f39c12',
      longBreak: '#8e44ad'
    }
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm oranges and pinks inspired by sunset skies',
    supports: ['light'],
    isDefault: false,
    preview: {
      focus: '#e67e22',
      break: '#e91e63',
      longBreak: '#9c27b0'
    }
  },
  midnight: {
    name: 'Midnight',
    description: 'Deep purples and blues for night owls',
    supports: ['dark'],
    isDefault: false,
    preview: {
      focus: '#7c3aed',
      break: '#06b6d4',
      longBreak: '#f59e0b'
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
