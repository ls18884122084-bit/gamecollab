// Test if the issue is HTTP vs HTTPS (mixed content)
const https = require('https');

// Check if CVM has any HTTPS/SSL configured
const req = https.request({
  hostname: '119.29.195.64',
  port: 443,
  path: '/health',
  method: 'GET',
  rejectUnauthorized: false
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('HTTPS Status:', res.statusCode, '\nBody:', body));
});

req.on('error', (e) => console.log('HTTPS not available on port 443:', e.message));
req.setTimeout(5000, () => { console.log('Timeout - no HTTPS on 443'); req.destroy(); });
req.end();
