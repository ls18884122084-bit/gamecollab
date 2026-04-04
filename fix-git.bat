@echo off
cd /d X:\gamecolla-handover
echo === Current HEAD ===
type .git\HEAD
echo.
echo === Deleting broken index ===
if exist .git\index (
    del /f .git\index
    echo Index deleted
) else (
    echo No index file found
)
echo.
echo === Rebuilding index from master ===
git read-tree HEAD 2>&1
echo read-tree exit: %ERRORLEVEL%
echo.
echo === Git status ===
git status 2>&1
echo status exit: %ERRORLEVEL%
echo.
echo === DONE ===
