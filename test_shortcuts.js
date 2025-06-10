// Test shortcuts parsing
console.log('Testing shortcut parsing...');

// Simulate the parseShortcut method
function parseShortcut(shortcutString) {
    if (!shortcutString) return null;

    const parts = shortcutString.split('+');
    const result = {
        meta: false,
        ctrl: false,
        alt: false,
        shift: false,
        key: ''
    };

    parts.forEach(part => {
        const partLower = part.toLowerCase();
        switch (partLower) {
            case 'commandorcontrol':
            case 'cmd':
            case 'command':
                result.meta = true;
                result.ctrl = true;
                break;
            case 'alt':
                result.alt = true;
                break;
            case 'shift':
                result.shift = true;
                break;
            case 'space':
                result.key = ' ';
                break;
            default:
                result.key = partLower;
        }
    });

    return result;
}

// Test cases
const testCases = [
    'CommandOrControl+Alt+Space',
    'CommandOrControl+Alt+S',
    'CommandOrControl+Alt+R',
    'Cmd+S',
    'Alt+Space',
    'Shift+Space'
];

testCases.forEach(shortcut => {
    const parsed = parseShortcut(shortcut);
    console.log(`${shortcut} -> `, parsed);
});
