// Quick launcher that prints immediately so the terminal doesn't time out
console.log('[launcher] Starting backend...');
import('file:///X:/gamecolla-handover/backend/src/app.js')
  .then(() => console.log('[launcher] Backend module loaded'))
  .catch(err => { console.error('[launcher] FATAL:', err); process.exit(1); });
