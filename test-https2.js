const https = require('https');

const req = https.request({
  hostname: '119.29.195.64',
  port: 443,
  path: '/health',
  method: 'GET',
  rejectUnauthorized: false
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.setTimeout(10000, () => { console.log('Timeout'); req.destroy(); });
req.end();
