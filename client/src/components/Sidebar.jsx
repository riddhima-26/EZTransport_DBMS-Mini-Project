import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white p-4 flex flex-col h-screen">
      <div className="p-4 text-center border-b border-purple-700">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-yellow-200 bg-clip-text text-transparent">
          EZTransport
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100 hover:scrollbar-thumb-purple-400">
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            <Link 
              to="/" 
              className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}
            >
              <i className="fas fa-home mr-3 text-lg"></i> Dashboard
            </Link>

            <div className="pt-4">
              <div className="text-xs uppercase text-purple-300 font-semibold px-3 mb-2">Management</div>
              <Link to="/customers" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/customers') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-users mr-3 text-lg"></i> Customers
              </Link>
              <Link to="/shipments" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/shipments') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-truck mr-3 text-lg"></i> Shipments
              </Link>
              <Link to="/vehicles" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/vehicles') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-car mr-3 text-lg"></i> Vehicles
              </Link>
            </div>

            <div className="pt-4">
              <div className="text-xs uppercase text-purple-300 font-semibold px-3 mb-2">Resources</div>
              <Link to="/drivers" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/drivers') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-id-card mr-3 text-lg"></i> Drivers
              </Link>
              <Link to="/locations" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/locations') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-map-marker-alt mr-3 text-lg"></i> Locations
              </Link>
              <Link to="/warehouses" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/warehouses') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-warehouse mr-3 text-lg"></i> Warehouses
              </Link>
              <Link to="/routes" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/routes') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-route mr-3 text-lg"></i> Routes
              </Link>
            </div>

            <div className="pt-4">
              <div className="text-xs uppercase text-purple-300 font-semibold px-3 mb-2">Tracking</div>
              <Link to="/tracking" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/tracking') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-map mr-3 text-lg"></i> Tracking Events
              </Link>
              <Link to="/shipment-items" className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive('/shipment-items') 
                  ? 'bg-yellow-500/20 text-yellow-300 shadow-lg border border-yellow-500/30' 
                  : 'hover:bg-yellow-500/10 text-purple-100 hover:text-yellow-300'
              }`}>
                <i className="fas fa-box mr-3 text-lg"></i> Shipment Items
              </Link>
            </div>
          </div>
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-purple-700">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{user?.full_name}</span>
            <button 
              onClick={logout}
              className="p-2 rounded-full hover:bg-yellow-500/20 transition"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
          <span className="text-xs text-purple-300 capitalize">{user?.user_type}</span>
        </div>
      </div>
    </div>
  );
}