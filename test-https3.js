const https = require('https');

const req = https.request('https://119.29.195.64:443/api/health', {
  rejectUnauthorized: false,
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data);
  });
});

req.on('error', (e) => console.log('ERROR:', e.message));
req.setTimeout(10000, () => { console.log('TIMEOUT'); req.destroy(); });
req.end();
