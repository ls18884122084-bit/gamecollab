@echo off
cd /d X:\gamecolla-handover\frontend
echo === Step 1: Clean build ===
rmdir /s /q dist 2>nul
echo === Step 2: Build with HTTPS API URL ===
cmd /c "npm run build"
if errorlevel 1 (
    echo BUILD FAILED
    exit /b 1
)
echo === Step 3: Copy 404.html for SPA fallback (from BUILD output!) ===
copy /y dist\index.html dist\404.html >nul
echo === Step 4: Deploy to GitHub Pages (gh-pages branch) ===
cmd /c "npx gh-pages -d dist -b gh-pages -r https://github.com/ls18884122084-bit/gamecollab.git"
if errorlevel 1 (
    echo DEPLOY FAILED
    exit /b 1
)
echo.
echo === ALL DONE! HTTPS fix deployed! ===
