@echo off
setlocal enabledelayedexpansion

echo.
echo Checking port 3000 and 3001...
echo.

:: Define ports to check
set "PORTS=3000 3001"
set "KILLED_ANY=0"

:: Loop through each port
for %%p in (%PORTS%) do (
    set "PID="
    :: Find PID listening on the port
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
        set "PID=%%a"
    )
    
    :: Check if PID was found
    if defined PID (
        echo Found process PID: !PID! listening on port %%p
        echo Killing process !PID!...
        :: Kill the process forcefully
        taskkill /PID !PID! /F >nul 2>&1
        
        :: Check if kill was successful
        if !errorlevel! equ 0 (
            echo Successfully killed process !PID! (port %%p)
            set "KILLED_ANY=1"
        ) else (
            echo Failed to kill process !PID! (port %%p)
        )
    ) else (
        echo No process is listening on port %%p
    )
    echo.
)

:: Final message
if !KILLED_ANY! equ 0 (
    echo No processes were killed (no active listeners on 3000/3001)
) else (
    echo Operation completed: relevant processes have been terminated
)

echo.
pause