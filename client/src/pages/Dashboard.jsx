import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import DriverDashboard from './DriverDashboard';
import CustomerDashboard from './CustomerDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  useEffect(() => {
    console.log('User in Dashboard:', user);
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Determine which dashboard to display based on user type
  switch (user.user_type) {
    case 'admin':
      return <AdminDashboard />;
    case 'driver':
      return <DriverDashboard />;
    case 'customer':
      return <CustomerDashboard />;
    default:
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Welcome to EZ Transport</h1>
          <p>Your user type is not recognized. Please contact an administrator.</p>
        </div>
      );
  }
}