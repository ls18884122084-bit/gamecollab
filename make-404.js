const fs = require('fs');
const src = 'X:/gamecolla-handover/frontend/dist/index.html';
const dst = 'X:/gamecolla-handover/frontend/dist/404.html';
const html = fs.readFileSync(src, 'utf8');
// Inject SPA redirect
const spafallback = '<script>if(!location.pathname.endsWith(".html")){var p=location.pathname+location.search+location.hash;history.replaceState(null,"","/gamecollab"+p)}</script>';
const fallbackHtml = html.replace('<div id="root"></div>', spafallback + '\n<div id="root"></div>');
fs.writeFileSync(dst, fallbackHtml, 'utf8');
console.log('404.html created OK');
console.log('Size:', fallbackHtml.length, 'bytes');
