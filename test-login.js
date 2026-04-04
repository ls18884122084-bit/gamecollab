const http = require('http');

const data = JSON.stringify({ email: 'test@test.com', password: '123456' });

const req = http.request({
  hostname: '119.29.195.64',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', body));
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(data);
req.end();
