@echo off
echo Starting Event Management App...
echo.

echo Starting backend server...
start "Backend" cmd /k "cd /d %~dp0server && node app.js"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0client && npm start"

echo.
echo Both servers are starting!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause