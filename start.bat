@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting School IT Tickets on http://localhost:3004
echo Set BASE_URL before running for correct QR links on your network.
node src/server.js
pause
