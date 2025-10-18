@echo off
echo [CLEANUP] Starting development process cleanup...

REM Kill RedModManager processes
taskkill /F /IM RedModManager.exe >nul 2>&1
if %errorlevel%==0 (
    echo [SUCCESS] RedModManager processes terminated
) else (
    echo [INFO] No RedModManager processes found
)

REM Kill Cargo processes
taskkill /F /IM cargo.exe >nul 2>&1
if %errorlevel%==0 (
    echo [SUCCESS] Cargo processes terminated
) else (
    echo [INFO] No Cargo processes found
)

REM Kill processes using port 1420
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1420') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [COMPLETE] Cleanup finished successfully!
echo.