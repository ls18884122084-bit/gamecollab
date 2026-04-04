@echo off
REM ============================================================
REM GameColla CVM Nginx 前端构建脚本
REM 用途: 构建前端产物，部署到 CVM nginx（根路径）
REM ============================================================

cd /d X:\gamecolla-handover\frontend

echo === Step 1: Backup original config ===
copy /y vite.config.js vite.config.js.bak >nul
copy /y .env.production .env.production.bak >nul

echo === Step 2: Set base to / for nginx root deployment ===
REM Create temp vite config with base=/
(
echo import { defineConfig } from 'vite';
echo import react from '@vitejs/plugin-react';
echo export default defineConfig ^{
echo   plugins: [react(^)],
echo   base: '/',
echo   server: {
echo     port: 5173,
echo     proxy: {
echo       '/api': { target: 'http://localhost:3000', changeOrigin: true },
echo       '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true }
echo     }
echo   }
echo ^};
) > vite.config.js

REM Ensure production env has correct API URL
echo VITE_API_BASE_URL=https://119.29.195.64:443/api > .env.production

echo === Step 3: Clean and build ===
rmdir /s /q dist 2>nul
cmd /c "npm run build"
if errorlevel 1 (
    echo BUILD FAILED! Restoring backup...
    copy /y vite.config.js.bak vite.config.js
    copy /y .env.production.bak .env.production
    exit /b 1
)

echo === Step 4: Copy index.html as 404.html for SPA fallback ===
copy /y dist\index.html dist\404.html >nul

echo === Step 5: Restore original config ===
copy /y vite.config.js.bak vite.config.js
copy /y .env.production.bak .env.production
del vite.config.js.bak
del .env.production.bak

echo.
echo ============================================
echo  BUILD COMPLETE for CVM nginx!
echo  Output: X:\gamecolla-handover\frontend\dist\
echo  
echo  Contents:
dir /b dist\
echo.
dir /b dist\assets\
echo.
echo  Next: Upload dist/* to CVM /var/www/gamecolla/
echo ============================================
