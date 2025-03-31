@echo off
echo Starting Transport Logistics System...

cd client
start cmd /k "npm run dev"

timeout /t 2

cd ../server
start cmd /k "flask run"

start http://localhost:5173

echo Servers started successfully!
echo Frontend running on http://localhost:5173
echo Backend running on http://localhost:5000 