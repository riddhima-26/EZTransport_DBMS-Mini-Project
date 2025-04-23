@echo off
echo Setting up the client...
cd client

:: Clean node_modules if it exists
if exist node_modules (
    echo Removing existing node_modules...
    rmdir /s /q node_modules
)

:: Remove package-lock.json if it exists
if exist package-lock.json (
    echo Removing package-lock.json...
    del /f package-lock.json
)

:: Install dependencies
echo Installing client dependencies...
call npm install

echo Client setup completed!
echo To start the client, use "npm run dev" in the client directory 