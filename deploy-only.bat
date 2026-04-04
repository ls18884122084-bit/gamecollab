@echo off
cd /d X:\gamecolla-handover\frontend
npx gh-pages -d dist -b gh-pages -r https://github.com/ls18884122084-bit/gamecollab.git -u "victoliang <victoliang@tencent.com>" -m "Deploy: API address fix for CVM backend"
echo DONE: %errorlevel%
