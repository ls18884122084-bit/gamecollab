@echo off
chcp 65001 >nul
cd /d X:\gamecolla-handover\frontend
npx gh-pages -d dist -b gh-pages -r https://github.com/ls18884122084-bit/gamecollab.git -u "victoliang <victoliang@tencent.com>" -m "Add 404.html SPA fallback"
echo DONE
