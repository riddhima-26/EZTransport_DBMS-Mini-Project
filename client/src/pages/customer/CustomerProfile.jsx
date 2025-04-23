import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CustomerProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    email: ''
  });

  useEffect(() => {
    const customerId = user?.customer_id;
    if (!customerId) {
      setError("Could not identify customer ID. Please log in again.");
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/customer/${customerId}/profile`);
        
        setProfile(response.data.profile);
        setMetrics(response.data.metrics);
        
        // Initialize form data
        setFormData({
          phone: response.data.profile.phone || '',
          email: response.data.profile.email || ''
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again later.');
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${profile.user_id}`, formData);
      
      // Update local state with new data
      setProfile({
        ...profile,
        phone: formData.phone,
        email: formData.email
      });
      
      setIsEditMode(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">
          <i className="fas fa-exclamation-circle text-5xl"></i>
        </div>
        <h3 className="text-xl font-bold mb-2">Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-indigo-50">
      <h1 className="text-2xl font-bold mb-6 text-indigo-900">Customer Profile</h1>
      
      {/* Profile Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold text-indigo-900">Personal Information</h2>
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {isEditMode ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            
            {isEditMode ? (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={profile.full_name}
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact admin to change name</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Full Name</div>
                  <div className="text-lg font-medium text-indigo-900">{profile.full_name}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Email</div>
                  <div className="text-lg font-medium text-indigo-900">{profile.email}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Phone</div>
                  <div className="text-lg font-medium text-indigo-900">{profile.phone || 'Not provided'}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Account Type</div>
                  <div className="text-lg font-medium text-indigo-900 capitalize">Customer</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Company Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mt-6">
            <h2 className="text-xl font-semibold text-indigo-900 mb-4">Company Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Company Name</div>
                <div className="text-lg font-medium text-indigo-900">{profile.company_name || 'Personal Account'}</div>
              </div>
              
              {profile.tax_id && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Tax ID</div>
                  <div className="text-lg font-medium text-indigo-900">{profile.tax_id}</div>
                </div>
              )}
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Credit Limit</div>
                <div className="text-lg font-medium text-indigo-900">
                  ${profile.credit_limit ? profile.credit_limit.toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Payment Terms</div>
                <div className="text-lg font-medium text-indigo-900">{profile.payment_terms || 'Standard'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Shipment Metrics */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
            <h2 className="text-xl font-semibold text-indigo-900 mb-4">Shipment Analytics</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Total Shipments</div>
                <div className="text-xl font-bold text-indigo-900">{metrics?.total_shipments || 0}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Total Value</div>
                <div className="text-xl font-bold text-green-600">
                  ${metrics?.total_value ? metrics.total_value.toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Drivers Used</div>
                <div className="text-xl font-bold text-indigo-900">{metrics?.drivers_used || 0}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Last Shipment</div>
                <div className="text-xl font-bold text-indigo-900">
                  {metrics?.last_shipment_date 
                    ? new Date(metrics.last_shipment_date).toLocaleDateString() 
                    : 'No shipments yet'}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-indigo-100 text-center">
              <p className="text-sm text-gray-600">
                Account created on <span className="font-medium text-indigo-900">
                  {new Date(profile.created_at || Date.now()).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
            <h2 className="text-xl font-semibold text-indigo-900 mb-4">Quick Links</h2>
            
            <div className="space-y-3">
              <a 
                href="/customer/new-shipment" 
                className="block px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-900 font-medium transition-colors"
              >
                <i className="fas fa-plus mr-2 text-indigo-600"></i>
                Create New Shipment
              </a>
              
              <a 
                href="/customer/shipments" 
                className="block px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-900 font-medium transition-colors"
              >
                <i className="fas fa-boxes mr-2 text-indigo-600"></i>
                View All Shipments
              </a>
              
              <a 
                href="/tracking" 
                className="block px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-900 font-medium transition-colors"
              >
                <i className="fas fa-search mr-2 text-indigo-600"></i>
                Track a Shipment
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;