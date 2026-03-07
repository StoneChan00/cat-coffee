@echo off
chcp 65001
echo Starting Cat Cafe MCP Callback System
echo.

echo [Step 1] Loading environment variables from .env file...
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        set "%%a=%%b"
    )
    echo Loaded from .env file
) else (
    echo Warning: .env file not found, using hardcoded values
    set "CAT_CAFE_API_URL=http://localhost:3200"
    set "CAT_CAFE_INVOCATION_ID=ca33edfc-de8b-458d-b5b4-74ffb88b20ae"
    set "CAT_CAFE_CALLBACK_TOKEN=b02d744f-2715-49f2-a99e-28a6f7fb23e5"
)

echo CAT_CAFE_API_URL=%CAT_CAFE_API_URL%
echo CAT_CAFE_INVOCATION_ID=%CAT_CAFE_INVOCATION_ID%
echo CAT_CAFE_CALLBACK_TOKEN=%CAT_CAFE_CALLBACK_TOKEN%
echo.

echo [Step 2] Starting callback server...
start cmd /k "set CAT_CAFE_API_URL=%CAT_CAFE_API_URL% && set CAT_CAFE_INVOCATION_ID=%CAT_CAFE_INVOCATION_ID% && set CAT_CAFE_CALLBACK_TOKEN=%CAT_CAFE_CALLBACK_TOKEN% && node src\callback-server.js"

echo Waiting for callback server to start...
ping -n 4 127.0.0.1 > nul

echo.
echo [Step 3] Starting opencode with MCP Server...
echo.

node src\run-cat.js

pause