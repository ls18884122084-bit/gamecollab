const https = require('https');

// 检查 /login 返回的完整内容
const url = 'https://ls18884122084-bit.github.io/gamecollab/login';
const req = https.get(url, { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Length: ${data.length}`);
    console.log('--- FULL BODY ---');
    console.log(data);
    
    // 同时检查根路径
    const req2 = https.get('https://ls18884122084-bit.github.io/gamecollab/', { rejectUnauthorized: false }, (res2) => {
      let data2 = '';
      res2.on('data', c => data2 += c);
      res2.on('end', () => {
        console.log('\n=== ROOT / ===');
        console.log(data2);
      });
    });
  });
});
req.on('error', e => console.log('Error:', e.message));
