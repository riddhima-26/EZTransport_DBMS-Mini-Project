import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white p-4 flex flex-col h-screen">
      <div className="p-4 text-center border-b border-blue-700">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          T&L System
        </h2>
      </div>
      
      <nav className="mt-6 flex-1">
        <div className="space-y-2">
          <a href="/" className="flex items-center p-3 rounded-lg hover:bg-blue-700 transition">
            <i className="fas fa-home mr-3"></i> Dashboard
          </a>
          <a href="/shipments" className="flex items-center p-3 rounded-lg hover:bg-blue-700 transition">
            <i className="fas fa-truck mr-3"></i> Shipments
          </a>
          <a href="/vehicles" className="flex items-center p-3 rounded-lg hover:bg-blue-700 transition">
            <i className="fas fa-car mr-3"></i> Vehicles
          </a>
          <a href="/customers" className="flex items-center p-3 rounded-lg hover:bg-blue-700 transition">
            <i className="fas fa-users mr-3"></i> Customers
          </a>
        </div>
      </nav>
      
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center justify-between">
          <span className="font-medium">{user?.full_name}</span>
          <button 
            onClick={logout}
            className="p-2 rounded-full hover:bg-blue-700 transition"
            title="Logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}