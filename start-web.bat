@echo off
setlocal EnableDelayedExpansion

REM Constants
set "CONFIG_FILE=config\config.yaml"
set "WEB_DIR=web"
set "SCRIPT_NAME=%~nx0"
set "REQUIRED_NODE_VERSION=16"

REM Initialize error handling
set "EXIT_SUCCESS=0"
set "EXIT_CONFIG_ERROR=1"
set "EXIT_PNPM_ERROR=2"
set "EXIT_NODE_ERROR=3"
set "EXIT_PORT_ERROR=4"

REM Prevent OpenSSL from looking for config
set "OPENSSL_CONF="
set "NODE_OPTIONS=--no-node-snapshot"

REM Parse parameters
set "USE_LOG_FILE="
if "%~1"=="-log" set "USE_LOG_FILE=1"

:main
    call :init
    if errorlevel 1 exit /b %errorlevel%
    
    call :check_prerequisites
    if errorlevel 1 exit /b %errorlevel%
    
    call :setup_dependencies
    if errorlevel 1 exit /b %errorlevel%
    
    call :start_web
    exit /b %errorlevel%

:init
    echo [%date% %time%] Starting %SCRIPT_NAME%...
    
    REM Check config file
    if not exist "%CONFIG_FILE%" (
        echo ERROR: %CONFIG_FILE% file not found
        exit /b %EXIT_CONFIG_ERROR%
    )
    
    REM Extract port from config.yaml
    for /f "tokens=2 delims=:" %%a in ('findstr /C:"port: " "%CONFIG_FILE%"') do (
        set "SERVER_PORT=%%a"
        set "SERVER_PORT=!SERVER_PORT: =!"
    )
    
    if not defined SERVER_PORT (
        echo ERROR: Unable to find port in %CONFIG_FILE%
        exit /b %EXIT_CONFIG_ERROR%
    )
    exit /b %EXIT_SUCCESS%

:check_prerequisites
    REM Check Node.js installation
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Node.js is not installed
        exit /b %EXIT_NODE_ERROR%
    )

    REM Check Node.js version
    for /f "tokens=1 delims=." %%a in ('node -v') do (
        set "NODE_VERSION=%%a"
        set "NODE_VERSION=!NODE_VERSION:v=!"
        if !NODE_VERSION! lss %REQUIRED_NODE_VERSION% (
            echo ERROR: Node.js version %REQUIRED_NODE_VERSION% or higher required
            exit /b %EXIT_NODE_ERROR%
        )
    )

    REM Check pnpm installation
    where pnpm >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: pnpm is not installed
        echo Install it with: npm install -g pnpm
        exit /b %EXIT_PNPM_ERROR%
    )
    exit /b %EXIT_SUCCESS%

:setup_dependencies
    REM Check and install dependencies using pnpm
    if not exist "node_modules" (
        echo Installing dependencies...
        call pnpm install
        if !errorlevel! neq 0 (
            echo ERROR: Failed to install dependencies
            exit /b %EXIT_PNPM_ERROR%
        )
    )
    exit /b %EXIT_SUCCESS%

:check_port
    set "port_in_use="
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R ":%SERVER_PORT%\>"') do (
        if not defined port_in_use (
            set "port_in_use=%%a"
        )
    )
    
    if defined port_in_use (
        echo Port %SERVER_PORT% is being used by process ID !port_in_use!
        choice /C YN /M "Do you want to terminate this process?"
        if !errorlevel!==1 (
            REM Check administrative privileges only when needed
            net session >nul 2>&1
            if %errorlevel% neq 0 (
                echo ERROR: Administrative privileges required to terminate process
                echo Please run 'taskkill /PID !port_in_use! /F' in an elevated command prompt
                exit /b %EXIT_PORT_ERROR%
            )
            
            taskkill /PID !port_in_use! /F
            if !errorlevel! neq 0 (
                echo ERROR: Failed to terminate process !port_in_use!
                echo Please manually terminate the process using: taskkill /PID !port_in_use! /F
                exit /b %EXIT_PORT_ERROR%
            )
            echo Process !port_in_use! terminated
            timeout /t 2 /nobreak >nul
        ) else (
            echo Please free up port %SERVER_PORT% and try again
            exit /b %EXIT_PORT_ERROR%
        )
    )
    exit /b %EXIT_SUCCESS%

:start_web
    call :check_port
    if errorlevel 1 exit /b %errorlevel%

    echo Starting development server on port %SERVER_PORT%...
    
    REM Start development server with appropriate logging
    cd %WEB_DIR%
    if defined USE_LOG_FILE (
        pnpm run dev > "..\logs\web.log" 2>&1
    ) else (
        pnpm run dev
    )
    cd ..
    
    if errorlevel 1 (
        if defined USE_LOG_FILE (
            echo ERROR: Failed to start web server. Check logs\web.log for details
        ) else (
            echo ERROR: Failed to start web server
        )
        exit /b %errorlevel%
    )
    exit /b %EXIT_SUCCESS%

:end
endlocal
