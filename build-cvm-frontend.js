const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = 'X:\\gamecolla-handover\\frontend';
const distDir = path.join(frontendDir, 'dist');
process.chdir(frontendDir);

console.log('=== Step 1: Backup original config ===');
const viteConfigPath = path.join(frontendDir, 'vite.config.js');
const envProdPath = path.join(frontendDir, '.env.production');

fs.copyFileSync(viteConfigPath, viteConfigPath + '.bak');
fs.copyFileSync(envProdPath, envProdPath + '.bak');

console.log('=== Step 2: Write CVM nginx config (base=/) ===');
fs.writeFileSync(viteConfigPath, `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true }
    }
  }
});
`);

fs.writeFileSync(envProdPath, 'VITE_API_BASE_URL=https://119.29.195.64:443/api\n');

console.log('=== Step 3: Clean and build ===');
try {
  // Clean dist
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  
  execSync('npm run build', { stdio: 'inherit', shell: true });
} catch (e) {
  console.error('BUILD FAILED! Restoring backup...');
  fs.copyFileSync(viteConfigPath + '.bak', viteConfigPath);
  fs.copyFileSync(envProdPath + '.bak', envProdPath);
  process.exit(1);
}

console.log('=== Step 4: Copy index.html as 404.html (SPA fallback) ===');
const distIndex = path.join(distDir, 'index.html');
const dist404 = path.join(distDir, '404.html');
fs.copyFileSync(distIndex, dist404);

console.log('=== Step 5: Restore original config ===');
fs.copyFileSync(viteConfigPath + '.bak', viteConfigPath);
fs.copyFileSync(envProdPath + '.bak', envProdPath);
fs.unlinkSync(viteConfigPath + '.bak');
fs.unlinkSync(envProdPath + '.bak');

// Show output
console.log('\n=== BUILD COMPLETE for CVM nginx! ===');
console.log('Output:', distDir);
console.log('\nFiles:');
const files = fs.readdirSync(distDir);
files.forEach(f => console.log(' ', f));
const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  console.log('\nAssets:');
  fs.readdirSync(assetsDir).forEach(f => console.log(' ', f));
}
