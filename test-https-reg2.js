const https = require('https');

const postData = JSON.stringify({
  username: 'httpsuser',
  email: 'httpstest2026@test.com',
  password: 'test123456'
});

const req = https.request('https://119.29.195.64:443/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  rejectUnauthorized: false
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
req.write(postData);
req.end();
