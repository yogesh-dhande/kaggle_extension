import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure dist directory exists
const distDir = join(__dirname, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
copyFileSync(
  join(__dirname, 'manifest.json'),
  join(distDir, 'manifest.json')
);

// Copy icons directory
const iconsDir = join(__dirname, 'icons');
const distIconsDir = join(distDir, 'icons');

if (existsSync(iconsDir)) {
  if (!existsSync(distIconsDir)) {
    mkdirSync(distIconsDir, { recursive: true });
  }
  
  // Copy icon files if they exist
  ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
    const iconPath = join(iconsDir, icon);
    if (existsSync(iconPath)) {
      copyFileSync(iconPath, join(distIconsDir, icon));
    }
  });
}
