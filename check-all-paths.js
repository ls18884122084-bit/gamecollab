const https = require('https');

// 检查所有可能的路径
const urls = [
  // 带 /gamecollab/ 前缀的
  { url: 'https://ls18884122084-bit.github.io/gamecollab/', label: 'root with prefix' },
  { url: 'https://ls18884122084-bit.github.io/gamecollab/login', label: 'login with prefix' },
  { url: 'https://ls18884122084-bit.github.io/gamecollab/404.html', label: '404.html with prefix' },
  { url: 'https://ls18884122084-bit.github.io/gamecollab/assets/index-CH2j005f.js', label: 'JS file' },
  // 不带前缀（根仓库级别）
  { url: 'https://ls18884122084-bit.github.io/', label: 'repo root (no prefix)' },
  { url: 'https://ls18884122084-bit.github.io/login', label: 'login (no prefix)' },
];

let completed = 0;
urls.forEach(({url, label}) => {
  const req = https.get(url, { rejectUnauthorized: false }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const isOurPage = data.includes('GameColla') || data.includes('index-CH2j005f');
      console.log(`[${res.statusCode}] ${label}`);
      console.log(`  URL: ${url}`);
      console.log(`  Size: ${data.length} bytes`);
      console.log(`  Our page: ${isOurPage ? 'YES ✓' : 'NO (default GH page?)'}`);
      if (!isOurPage && res.statusCode === 404) {
        console.log(`  Preview: ${data.substring(0, 120).replace(/\n/g, ' ')}`);
      }
      console.log('');
      completed++;
      if (completed === urls.length) {
        console.log('=== ALL CHECKS DONE ===');
      }
    });
  });
  req.on('error', e => {
    console.log(`[ERROR] ${label}: ${e.message}`);
    completed++;
  });
});
