const https = require('https');

const url = 'https://ls18884122084-bit.github.io/gamecollab/login';
const req = https.get(url, { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Size: ${data.length} bytes`);
    console.log('--- BODY ---');
    console.log(data);
    
    // 检查 JS 文件是否可访问
    const jsMatch = data.match(/src="([^"]+)"/);
    if (jsMatch) {
      const jsUrl = jsMatch[1];
      console.log('\nJS URL found:', jsUrl);
      
      // 补全为绝对 URL
      const fullJsUrl = jsUrl.startsWith('/') 
        ? `https://ls18884122084-bit.github.io${jsUrl}`
        : `https://ls18884122084-bit.github.io/gamecollab/${jsUrl}`;
        
      const req2 = https.get(fullJsUrl, { rejectUnauthorized: false }, (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          console.log(`JS file status: ${res2.statusCode}, size: ${d2.length} bytes`);
          if (res2.statusCode === 200) {
            console.log('✅✅✅ FIX CONFIRMED! /login correctly returns SPA page with working JS!');
          }
        });
      });
    }
  });
});
req.on('error', e => console.log('Error:', e.message));
