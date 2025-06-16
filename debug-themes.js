// Debug script per verificare l'applicazione dei temi
// Esegui questo nel console del browser per vedere lo stato attuale

console.log('=== TEMA DEBUG INFO ===');

// Verifica attributi DOM
const html = document.documentElement;
console.log('data-theme:', html.getAttribute('data-theme'));
console.log('data-timer-theme:', html.getAttribute('data-timer-theme'));

// Verifica CSS variables
const computedStyle = getComputedStyle(html);
console.log('CSS Variables:');
console.log('--focus-color:', computedStyle.getPropertyValue('--focus-color').trim());
console.log('--focus-bg:', computedStyle.getPropertyValue('--focus-bg').trim());
console.log('--focus-timer-color:', computedStyle.getPropertyValue('--focus-timer-color').trim());
console.log('--matrix-text:', computedStyle.getPropertyValue('--matrix-text').trim());

// Verifica localStorage
console.log('localStorage theme-preference:', localStorage.getItem('theme-preference'));
console.log('localStorage timer-theme-preference:', localStorage.getItem('timer-theme-preference'));

// Verifica sistema color scheme
console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);

// Verifica se gli stili Matrix sono applicati
const testElement = document.createElement('div');
testElement.style.cssText = 'color: var(--matrix-text, red);';
document.body.appendChild(testElement);
const matrixColor = getComputedStyle(testElement).color;
document.body.removeChild(testElement);
console.log('Matrix text color test:', matrixColor);

// Verifica regole CSS caricate
console.log('Stylesheets loaded:');
Array.from(document.styleSheets).forEach((sheet, i) => {
    try {
        console.log(`${i}: ${sheet.href || 'inline'}`);
    } catch (e) {
        console.log(`${i}: (CORS protected)`);
    }
});

console.log('=== END DEBUG ===');
