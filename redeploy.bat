@echo off
cd /d X:\gamecolla-handover\frontend
echo === Redeploying GitHub Pages (404.html fix) ===
cmd /c "npx gh-pages -d dist -b gh-pages -r https://github.com/ls18884122084-bit/gamecollab.git"
echo === DONE! ===
