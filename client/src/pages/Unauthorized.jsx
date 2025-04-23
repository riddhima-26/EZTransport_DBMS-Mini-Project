import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine where to redirect based on user type
  const handleRedirectToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="text-red-500 text-6xl mb-4">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          Sorry, you don't have permission to access this page. Your account type 
          <span className="font-semibold"> ({user?.user_type || 'unknown'})</span> does not have 
          the necessary privileges.
        </p>
        <button
          onClick={handleRedirectToDashboard}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-300"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default Unauthorized; 