/* eslint-disable @typescript-eslint/no-require-imports */
// Simple script to create PWA icon SVGs
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" 
        font-family="Arial,sans-serif" font-weight="bold" font-size="${size * 0.45}" fill="white">T</text>
</svg>`;
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
});

console.log('✅ PWA SVG icons generated');
