import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import DriverDashboard from './DriverDashboard';
import CustomerDashboard from './CustomerDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  
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
        <div className="p-6 text-center">
          <div className="text-yellow-500 text-6xl mb-4">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h1 className="text-2xl font-bold mb-2">Unknown User Type</h1>
          <p className="text-gray-600 mb-4">
            Your account type ({user.user_type || 'unknown'}) is not recognized.
            Please contact an administrator for assistance.
          </p>
        </div>
      );
  }
};

export default Dashboard;