import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // If no specific roles are required, or if the array is empty, allow access
  if (allowedRoles.length === 0) {
    return children;
  }
  
  // Check if user has the required role
  if (allowedRoles.includes(user.user_type)) {
    return children;
  }
  
  // If user doesn't have the required role, redirect to unauthorized page or dashboard
  return <Navigate to="/unauthorized" />;
}

export default PrivateRoute;