@echo off
cd /d X:\gamecolla-handover\frontend
echo === Deploying to GitHub Pages (gh-pages branch) ===
npx gh-pages -d dist -b gh-pages -r https://github.com/ls18884122084-bit/gamecollab.git -u "victoliang <victoliang@tencent.com>" -m "Deploy frontend to GitHub Pages"
echo.
echo EXIT_CODE=%ERRORLEVEL%
if %ERRORLEVEL%==0 (
    echo === DEPLOY SUCCESS! ===
) else (
    echo === DEPLOY FAILED! ===
)
