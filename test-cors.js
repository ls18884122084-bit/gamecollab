// Simulate a browser-like CORS preflight + actual request
const http = require('http');

// Test 1: Simple GET to health endpoint
const req1 = http.request({
  hostname: '119.29.195.64',
  port: 3000,
  path: '/health',
  method: 'GET',
  headers: { 'Origin': 'https://ls18884122084-bit.github.io' }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('=== Health Check ===');
    console.log('Status:', res.statusCode);
    console.log('CORS headers:');
    console.log('  Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Credentials:', res.headers['access-control-allow-credentials']);
    console.log('Body:', body);
    
    // Test 2: OPTIONS preflight for register
    const req2 = http.request({
      hostname: '119.29.195.64',
      port: 3000,
      path: '/api/auth/register',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://ls18884122084-bit.github.io',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log('\n=== CORS Preflight (OPTIONS) ===');
        console.log('Status:', res2.statusCode);
        console.log('CORS headers:');
        console.log('  Access-Control-Allow-Origin:', res2.headers['access-control-allow-origin']);
        console.log('  Access-Control-Allow-Methods:', res2.headers['access-control-allow-methods']);
        console.log('  Access-Control-Allow-Headers:', res2.headers['access-control-allow-headers']);
        
        // Test 3: Actual POST with Origin header
        const data = JSON.stringify({ username: 'cortest', email: 'cortest@test.com', password: '123456' });
        const req3 = http.request({
          hostname: '119.29.195.64',
          port: 3000,
          path: '/api/auth/register',
          method: 'POST',
          headers: {
            'Origin': 'https://ls18884122084-bit.github.io',
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        }, (res3) => {
          let body3 = '';
          res3.on('data', chunk => body3 += chunk);
          res3.on('end', () => {
            console.log('\n=== Register POST (with Origin) ===');
            console.log('Status:', res3.statusCode);
            console.log('CORS headers:');
            console.log('  Access-Control-Allow-Origin:', res3.headers['access-control-allow-origin']);
            console.log('Body:', body3);
          });
        });
        req3.on('error', e => console.log('POST Error:', e.message));
        req3.write(data);
        req3.end();
      });
    });
    req2.on('error', e => console.log('OPTIONS Error:', e.message));
    req2.end();
  });
});
req1.on('error', e => console.log('Health Error:', e.message));
req1.end();
