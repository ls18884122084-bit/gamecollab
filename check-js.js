const https = require('https');

const req = https.request('https://ls18884122084-bit.github.io/gamecollab/assets/index-CH2j005f.js', {
  rejectUnauthorized: false
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('Content-Type:', res.headers['content-type']);
  let size = 0;
  res.on('data', chunk => { size += chunk.length; });
  res.on('end', () => {
    console.log('Actual bytes received:', size);
    // Check if it contains the HTTPS API URL
    // We can only check status and size here
  });
});
req.on('error', e => console.log('ERROR:', e.message));
req.setTimeout(15000, () => { console.log('TIMEOUT'); req.destroy(); });
req.end();
