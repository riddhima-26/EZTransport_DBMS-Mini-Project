# Transport Logistics System - DBMS Mini Project

A comprehensive transport logistics management system built for the DBMS Lab Mini Project Component. This system helps businesses manage their transportation operations, track shipments, and maintain customer relationships efficiently.

## Features

- **Dashboard**: Real-time overview of key metrics and statistics
- **Shipment Management**: Track and manage shipments with detailed information
- **Customer Management**: Maintain customer records and information
- **Vehicle Management**: Track and manage transportation vehicles
- **Location Tracking**: Monitor shipment locations and routes
- **Warehouse Management**: Manage storage facilities and inventory
- **Driver Management**: Track driver assignments and performance
- **Route Planning**: Optimize delivery routes and schedules

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Python Flask
- **Database**: MySQL
- **Charts**: Chart.js
- **Authentication**: JWT

## Prerequisites

- Python 3.8 or higher
- Node.js 14.x or higher
- MySQL Server
- Git

## Installation

### Method 1: Using run.bat (Recommended for Windows)

1. Clone the repository:
```bash
git clone https://github.com/Addy-Da-Baddy/EZTransport---DBMS-Mini-Project-Project.git
cd EZTransport---DBMS-Mini-Project-Project
```

2. Double-click `run.bat` to start both frontend and backend servers
   - This will automatically install dependencies and start the application
   - Frontend will be available at http://localhost:5173
   - Backend will be available at http://localhost:5000

### Method 2: Manual Setup

1. Clone the repository:
```bash
git clone https://github.com/Addy-Da-Baddy/EZTransport---DBMS-Mini-Project-Project.git
cd EZTransport---DBMS-Mini-Project-Project
```

2. Set up the backend:
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd ../client
npm install
```

4. Start the servers:
```bash
# Terminal 1 - Backend
cd server
python app.py

# Terminal 2 - Frontend
cd client
npm run dev
```

## Database Setup

1. Create a MySQL database named `transport_logistics`
2. Import the schema from `server/schema.py`
3. Update the database credentials in `server/app.py` if needed

## Project Structure

```
transport-logistics-system/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   └── services/     # API services
│   └── public/           # Static assets
├── server/               # Backend Flask application
│   ├── app.py           # Main application file
│   ├── schema.py        # Database schema
│   └── requirements.txt  # Python dependencies
└── run.bat              # Windows startup script
```

## API Endpoints

- `/api/shipments` - Shipment management
- `/api/customers` - Customer management
- `/api/vehicles` - Vehicle management
- `/api/drivers` - Driver management
- `/api/warehouses` - Warehouse management
- `/api/locations` - Location tracking
- `/api/routes` - Route management





Project Link: [https://github.com/Addy-Da-Baddy/EZTransport---DBMS-Mini-Project-Project](https://github.com/Addy-Da-Baddy/EZTransport---DBMS-Mini-Project-Project) 