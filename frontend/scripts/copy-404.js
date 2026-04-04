import { readFileSync, writeFileSync } from 'fs';

const distHtml = readFileSync('dist/index.html', 'utf8');
writeFileSync('dist/404.html', distHtml);
console.log('✓ 404.html created (SPA fallback)');
