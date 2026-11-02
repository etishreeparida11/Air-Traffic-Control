@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    where py >nul 2>nul
    if errorlevel 1 (
        python -m venv .venv
    ) else (
        py -m venv .venv
    )
    if errorlevel 1 (
        echo Could not create the virtual environment. Install Python 3.9 or newer and try again.
        pause
        exit /b 1
    )
)

".venv\Scripts\python.exe" -c "import flask" >nul 2>nul
if errorlevel 1 (
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo Could not install dependencies. Check your internet connection and try again.
        pause
        exit /b 1
    )
)

".venv\Scripts\python.exe" app.py
