@echo off
chcp 65001 >nul
echo ========================================
echo  Checking gh-pages branch status
echo ========================================
echo.
echo [1] Local gh-pages branch:
git branch -a | findstr gh-pages
echo.
echo [2] Remote gh-pages branch:
git ls-remote --heads origin gh-pages
echo.
echo [3] Try to checkout gh-pages branch (read-only):
git show-ref verify refs/heads/gh-pages 2>nul || echo "Local gh-pages branch does not exist"
echo.
echo [4] Check if gh-pages was pushed:
git log --oneline -1 origin/gh-pages 2>nul || echo "Cannot read origin/gh-pages"
echo.
echo ========================================
echo  DONE
echo ========================================
pause
