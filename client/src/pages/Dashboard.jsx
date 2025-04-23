import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import DriverDashboard from './DriverDashboard';
import CustomerDashboard from './CustomerDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  
  // Handle case where user might be null or undefined during initial load
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }
  
  // Render the appropriate dashboard based on user type
  switch (user.user_type) {
    case 'admin':
      return <AdminDashboard />;
    case 'driver':
      return <DriverDashboard />;
    case 'customer':
      return <CustomerDashboard />;
    default:
      // Fallback dashboard if user type is unknown
      return (
        <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md border border-indigo-100">
            <div className="text-yellow-500 text-6xl mb-4 flex justify-center">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-indigo-900 text-center">Unknown User Type</h1>
            <p className="text-indigo-700 mb-4 text-center">
              Your account type (<span className="font-medium">{user.user_type || 'unknown'}</span>) is not recognized.
              Please contact an administrator for assistance.
            </p>
          </div>
        </div>
      );
  }
};

export default Dashboard;