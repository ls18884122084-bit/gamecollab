const https = require('https');

const urls = [
  'https://ls18884122084-bit.github.io/gamecollab/',
  'https://ls18884122084-bit.github.io/gamecollab/login',
  'https://ls18884122084-bit.github.io/gamecollab/register',
  'https://ls18884122084-bit.github.io/gamecollab/404.html',
];

urls.forEach(url => {
  const req = https.get(url, { rejectUnauthorized: false }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`[STATUS: ${res.statusCode}] ${url}`);
      if (res.statusCode === 200) {
        console.log(`  → Size: ${data.length} bytes, Preview: ${data.substring(0, 100)}...`);
      } else if (res.statusCode === 404) {
        console.log(`  → Body preview: ${data.substring(0, 150)}...`);
      }
    });
  });
  req.on('error', e => console.log(`[ERROR] ${url}: ${e.message}`));
  req.setTimeout(10000, () => { req.destroy(); console.log('[TIMEOUT] ' + url); });
});
