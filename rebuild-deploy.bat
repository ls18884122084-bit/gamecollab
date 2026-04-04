@echo off
echo ============================================
echo  GameColla Frontend - Rebuild + Deploy
echo ============================================

cd /d X:\gamecolla-handover\frontend

echo.
echo [1/4] Installing dependencies...
call cmd /c "npm install --prefer-offline"
if errorlevel 1 (
    echo ERROR: npm install failed!
    exit /b 1
)
echo OK

echo.
echo [2/4] Building frontend...
call cmd /c "npm run build"
if errorlevel 1 (
    echo ERROR: build failed!
    exit /b 1
)
echo OK

echo.
echo [3/4] Generating 404.html...
node -e "require('fs').writeFileSync('dist/404.html', require('fs').readFileSync('dist/index.html','utf8'))"
echo OK

echo.
echo [4/4] Deploying to GitHub Pages (gh-pages)...
call cmd /c "npx gh-pages -d dist -b gh-pages -r https://github.com/ls18884122084-bit/gamecollab.git -u "victoliang <victoliang@tencent.com>" -m "Deploy: API address fix for CVM backend""
if errorlevel 1 (
    echo ERROR: deploy failed!
    exit /b 1
)

echo.
echo ============================================
echo  ALL DONE! Deployed to GitHub Pages
echo  https://ls18884122084-bit.github.io/gamecollab/
echo ============================================
