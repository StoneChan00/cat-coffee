@echo off
echo ============================================================
echo 猫咖啡 MCP 回传系统
echo ============================================================
echo.

echo [1/3] 启动回调服务器...
start "Callback Server" node callback-server.js
timeout /t 2 /nobreak > nul

echo.
echo [2/3] 设置环境变量...
for /f "tokens=*" %%i in ('node -e "console.log(require('crypto').randomUUID())"') do set INVOCATION_ID=%%i
for /f "tokens=*" %%i in ('node -e "console.log(require('crypto').randomUUID())"') do set CALLBACK_TOKEN=%%i

set CAT_CAFE_API_URL=http://localhost:3200
set CAT_CAFE_INVOCATION_ID=%INVOCATION_ID%
set CAT_CAFE_CALLBACK_TOKEN=%CALLBACK_TOKEN%

echo CAT_CCAFE_API_URL=%CAT_CAFE_API_URL%
echo CAT_CAFE_INVOCATION_ID=%CAT_CAFE_INVOCATION_ID%
echo CAT_CAFE_CALLBACK_TOKEN=%CAT_CAFE_CALLBACK_TOKEN%
echo.

echo [3/3] 启动 opencode with MCP Server...
echo ============================================================
echo.

node run-cat.js

pause
