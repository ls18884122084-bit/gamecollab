const https = require('https');

const req = https.request('https://ls18884122084-bit.github.io/gamecollab/', {
  rejectUnauthorized: false
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Extract JS and CSS file references
    const jsMatches = data.match(/src="[^"]*\.js[^"]*"/g) || [];
    const cssMatches = data.match(/href="[^"]*\.css[^"]*"/g) || [];
    console.log('=== JS files ===');
    jsMatches.forEach(m => console.log(m));
    console.log('\n=== CSS files ===');
    cssMatches.forEach(m => console.log(m));
  });
});
req.on('error', e => console.log('ERROR:', e.message));
req.end();
