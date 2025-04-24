@echo off
echo Setting up the Transport Logistics System...

echo Installing client dependencies...
cd client
call npm install
cd ..

echo Setting up server virtual environment...
cd server

:: Check if Python is installed
python --version 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH. Please install Python 3.7+ and try again.
    exit /b 1
)

:: Check if virtualenv is installed
python -m virtualenv --version >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing virtualenv...
    pip install virtualenv
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m virtualenv venv
)

:: Activate virtual environment and install dependencies
echo Installing server dependencies...
call venv\Scripts\activate

:: Install compatible versions of Werkzeug and Flask
echo Installing compatible package versions...
pip uninstall -y flask werkzeug
pip install werkzeug==2.0.3
pip install flask==2.0.1
pip install flask-cors==3.0.10
pip install flask-mysqldb==1.0.1
pip install graphene==2.1.9
pip install python-dotenv==0.19.0

:: Verify Flask installation
echo Verifying Flask installation...
python -m flask --version

cd ..
echo Setup completed successfully!
echo.
echo To run the application, use run.bat 