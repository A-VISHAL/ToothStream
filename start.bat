@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "BACKEND_PYTHON=%BACKEND%\venv\Scripts\python.exe"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=3002"

if not exist "%BACKEND_PYTHON%" (
	ECHO Creating backend virtual environment...
	python -m venv "%BACKEND%\venv"
	if errorlevel 1 (
		ECHO Failed to create backend virtual environment.
		exit /b 1
	)

	ECHO Installing backend dependencies...
	"%BACKEND_PYTHON%" -m pip install --upgrade pip
	if errorlevel 1 (
		ECHO Failed to upgrade pip.
		exit /b 1
	)

	"%BACKEND_PYTHON%" -m pip install -r "%BACKEND%\requirements.txt"
	if errorlevel 1 (
		ECHO Failed to install backend dependencies.
		exit /b 1
	)
)

ECHO Starting Backend Server...
start "Backend" /d "%BACKEND%" "%BACKEND_PYTHON%" -m uvicorn main:app --host 127.0.0.1 --port %BACKEND_PORT% --reload

ECHO Starting Frontend Server...
start "Frontend" /d "%FRONTEND%" cmd /k "set BROWSER=none&& set PORT=%FRONTEND_PORT%&& npm start"

ECHO Both servers are starting in separate windows.
ECHO You can now manually open your browser to http://localhost:%FRONTEND_PORT%
