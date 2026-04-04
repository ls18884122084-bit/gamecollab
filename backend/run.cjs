const { execSync } = require('child_process');
process.chdir('X:/gamecolla-handover/backend');
try {
  execSync('node src/app.js', { stdio: 'inherit', timeout: 15000 });
} catch (e) {
  if (e.stderr) process.stderr.write(e.stderr);
  if (e.stdout) process.stdout.write(e.stdout);
  process.stderr.write('Exit code: ' + e.status + '\n');
  if (e.message) process.stderr.write(e.message + '\n');
}
