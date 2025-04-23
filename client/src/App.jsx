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
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/*" element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    
                    {/* Admin and Driver can access shipments */}
                    <Route path="/shipments" element={
                      <PrivateRoute allowedRoles={['admin', 'driver']}>
                        <Shipments />
                      </PrivateRoute>
                    } />
                    
                    {/* Admin only routes */}
                    <Route path="/vehicles" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Vehicles />
                      </PrivateRoute>
                    } />
                    <Route path="/customers" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Customers />
                      </PrivateRoute>
                    } />
                    <Route path="/drivers" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Drivers />
                      </PrivateRoute>
                    } />
                    <Route path="/locations" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Locations />
                      </PrivateRoute>
                    } />
                    <Route path="/warehouses" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <Warehouses />
                      </PrivateRoute>
                    } />
                    <Route path="/routes" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <RoutesManagement />
                      </PrivateRoute>
                    } />
                    
                    {/* Driver and Customer can access tracking */}
                    <Route path="/tracking" element={
                      <PrivateRoute allowedRoles={['admin', 'driver', 'customer']}>
                        <Tracking />
                      </PrivateRoute>
                    } />
                    
                    {/* Admin and Driver can access shipment items */}
                    <Route path="/shipment-items" element={
                      <PrivateRoute allowedRoles={['admin', 'driver']}>
                        <ShipmentItems />
                      </PrivateRoute>
                    } />
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