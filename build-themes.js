#!/usr/bin/env node
// Build script to auto-discover themes and update theme-loader.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const themesDir = path.join(__dirname, 'src/styles/themes');
const themeLoaderPath = path.join(__dirname, 'src/utils/theme-loader.js');

function discoverThemeFiles() {
    try {
        if (!fs.existsSync(themesDir)) {
            console.log('❌ Themes directory not found:', themesDir);
            return [];
        }

        const files = fs.readdirSync(themesDir);
        const themeFiles = files
            .filter(file => file.endsWith('.css'))
            .filter(file => !file.startsWith('.')) // Ignore hidden files
            .sort();

        console.log(`🎨 Discovered ${themeFiles.length} theme files:`, themeFiles);
        return themeFiles;
    } catch (error) {
        console.error('❌ Error discovering theme files:', error);
        return [];
    }
}

function updateThemeLoader(themeFiles) {
    try {
        let content = fs.readFileSync(themeLoaderPath, 'utf-8');
        
        // Create the new themes array
        const themesArray = themeFiles.map(file => `'${file}'`).join(',\n            ');
        
        // Replace the knownThemes array in the file
        const newKnownThemes = `        const knownThemes = [
            ${themesArray}
        ];`;
        
        // Find and replace the knownThemes array
        const knownThemesRegex = /const knownThemes = \[[\s\S]*?\];/;
        
        if (knownThemesRegex.test(content)) {
            content = content.replace(knownThemesRegex, newKnownThemes);
            
            fs.writeFileSync(themeLoaderPath, content, 'utf-8');
            console.log('✅ Updated theme-loader.js with discovered themes');
            return true;
        } else {
            console.log('⚠️ Could not find knownThemes array in theme-loader.js');
            return false;
        }
    } catch (error) {
        console.error('❌ Error updating theme-loader.js:', error);
        return false;
    }
}

function main() {
    console.log('🔧 Starting theme discovery build script...');
    
    const themeFiles = discoverThemeFiles();
    
    if (themeFiles.length === 0) {
        console.log('⚠️ No theme files discovered');
        return;
    }
    
    const success = updateThemeLoader(themeFiles);
    
    if (success) {
        console.log('🎉 Theme discovery build completed successfully!');
        console.log(`📊 Total themes: ${themeFiles.length}`);
        themeFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });
    } else {
        console.log('❌ Theme discovery build failed');
        process.exit(1);
    }
}

// Run the script
main();
