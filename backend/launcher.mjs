process.stdout.write('[launcher] starting at ' + new Date().toISOString() + '\n');
process.chdir('X:/gamecolla-handover/backend');
process.stdout.write('[launcher] cwd = ' + process.cwd() + '\n');

import('dotenv').then(d => {
  d.default.config();
  process.stdout.write('[launcher] .env loaded, DB_HOST=' + process.env.DB_HOST + ' DB_NAME=' + process.env.DB_NAME + '\n');
  return import('./src/app.js');
}).then(() => {
  process.stdout.write('[launcher] app module loaded OK\n');
}).catch(err => {
  process.stderr.write('[launcher] FATAL: ' + err.stack + '\n');
  process.exit(1);
});
