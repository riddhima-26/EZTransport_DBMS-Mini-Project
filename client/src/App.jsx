import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Drivers from './pages/Drivers';
import Locations from './pages/Locations';
import Warehouses from './pages/Warehouses';
import RoutesManagement from './pages/RoutesManagement';
import Tracking from './pages/Tracking';
import ShipmentItems from './pages/ShipmentItems';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/shipments" element={<Shipments />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/drivers" element={<Drivers />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/warehouses" element={<Warehouses />} />
                    <Route path="/routes" element={<RoutesManagement />} />
                    <Route path="/tracking" element={<Tracking />} />
                    <Route path="/shipment-items" element={<ShipmentItems />} />
                  </Routes>
                </div>
              </div>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;