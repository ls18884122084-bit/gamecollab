@echo off
cd /d X:\gamecolla-handover
echo === Restoring all files from HEAD ===
git checkout -- . 2>&1
echo checkout exit: %ERRORLEVEL%
echo.
echo === Git status (brief) ===
git status --short 2>&1
echo.
echo === DONE ===
