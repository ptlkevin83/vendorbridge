@echo off
echo.
echo ========================================
echo   VendorBridge ERP - Starting Up
echo ========================================
echo.

echo [1/2] Starting Backend API Server (port 5000)...
start "VendorBridge Backend" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Dev Server...
start "VendorBridge Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo ========================================
echo   VendorBridge is starting up!
echo ========================================
echo.
echo   Backend API:  http://localhost:5000
echo   Frontend:     http://localhost:5173 (or next available port)
echo.
echo   Demo Accounts:
echo   Admin:    admin@vendorbridge.com    / admin123
echo   Officer:  officer@vendorbridge.com  / officer123
echo   Manager:  manager@vendorbridge.com  / manager123
echo   Vendor:   vendor1@vendorbridge.com  / vendor123
echo.
echo   AI Chatbot: Add OPENAI_API_KEY to backend/.env
echo ========================================
echo.
start http://localhost:5173
pause
