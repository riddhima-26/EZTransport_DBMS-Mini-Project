import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DriverProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    email: ''
  });

  useEffect(() => {
    const driverId = user?.driver_id;
    if (!driverId) {
      setError("Could not identify driver ID. Please log in again.");
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/driver/${driverId}/profile`);
        
        setProfile(response.data.profile);
        setVehicle(response.data.currentVehicle);
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
      <h1 className="text-2xl font-bold mb-6 text-indigo-900">Driver Profile</h1>
      
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
                  <div className="text-lg font-medium text-indigo-900 capitalize">Driver</div>
                </div>
              </div>
            )}
          </div>
          
          {/* License Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mt-6">
            <h2 className="text-xl font-semibold text-indigo-900 mb-4">License Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">License Number</div>
                <div className="text-lg font-medium text-indigo-900">{profile.license_number}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Expiry Date</div>
                <div className={`text-lg font-medium ${new Date(profile.license_expiry) < new Date() ? 'text-red-600' : 'text-indigo-900'}`}>
                  {new Date(profile.license_expiry).toLocaleDateString()}
                  {new Date(profile.license_expiry) < new Date() && 
                    <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">Expired</span>
                  }
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Medical Check Date</div>
                <div className="text-lg font-medium text-indigo-900">
                  {profile.medical_check_date ? new Date(profile.medical_check_date).toLocaleDateString() : 'Not available'}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Training Certification</div>
                <div className="text-lg font-medium text-indigo-900">{profile.training_certification || 'Not available'}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-1">Current Status</div>
                <div className={`text-lg font-medium uppercase ${
                  profile.status === 'available' ? 'text-green-600' : 
                  profile.status === 'assigned' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {profile.status}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Vehicle & Performance Metrics */}
        <div className="space-y-6">
          {vehicle && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
              <h2 className="text-xl font-semibold text-indigo-900 mb-4">Current Vehicle</h2>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600 mb-1">License Plate</div>
                  <div className="text-lg font-medium text-indigo-900">{vehicle.license_plate}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Vehicle</div>
                  <div className="text-lg font-medium text-indigo-900">{vehicle.make} {vehicle.model} ({vehicle.year})</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Type</div>
                  <div className="text-lg font-medium text-indigo-900 capitalize">{vehicle.vehicle_type}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Capacity</div>
                  <div className="text-lg font-medium text-indigo-900">{vehicle.capacity_kg} kg</div>
                </div>
              </div>
            </div>
          )}
          
          {metrics && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
              <h2 className="text-xl font-semibold text-indigo-900 mb-4">Performance Overview</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Total Shipments</div>
                  <div className="text-xl font-bold text-indigo-900">{metrics.total_shipments}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Delivered Shipments</div>
                  <div className="text-xl font-bold text-green-600">{metrics.delivered_shipments}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Routes Traveled</div>
                  <div className="text-xl font-bold text-indigo-900">{metrics.routes_traveled}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Total Weight Delivered</div>
                  <div className="text-xl font-bold text-indigo-900">{Math.round(metrics.total_weight_delivered)} kg</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;