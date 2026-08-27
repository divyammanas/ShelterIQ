@echo off
echo =====================================================================
echo                 ShelterIQ Web App Launcher
echo =====================================================================
echo.

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Ensure Python is installed.
        pause
        exit /b 1
    )
)

echo Installing dependencies...
.venv\Scripts\pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo Starting ShelterIQ local-host server...
echo Point your browser to http://127.0.0.1:8000
echo Press Ctrl+C in this console to stop the server.
echo.
.venv\Scripts\python main.py
pause
