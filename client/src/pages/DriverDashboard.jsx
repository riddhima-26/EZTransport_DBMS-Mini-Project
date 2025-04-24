import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DriverDashboard = () => {
  const { user } = useAuth();
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  
  useEffect(() => {
    fetchDriverData();
  }, [user.id]);
  
  const fetchDriverData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/driver-dashboard/${user.id}`);
      setDriverData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching driver data:', err);
      setError('Failed to load driver data. Please try again later.');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'picked_up':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in_maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'in_use':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredShipments = () => {
    if (!driverData || !driverData.shipments) return [];
    
    if (activeTab === 'current') {
      return driverData.shipments.filter(shipment => 
        ['pending', 'picked_up', 'in_transit'].includes(shipment.status));
    } else if (activeTab === 'completed') {
      return driverData.shipments.filter(shipment => 
        ['delivered', 'returned'].includes(shipment.status));
    }
    
    return driverData.shipments;
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-6" role="alert">
      <p className="font-bold">Error</p>
      <p>{error}</p>
    </div>
  );

  const driverStatus = driverData.driver_info.status;
  const isLicenseExpiringSoon = () => {
    if (!driverData.driver_info.license_expiry) return false;
    const expiryDate = new Date(driverData.driver_info.license_expiry);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">Driver Dashboard</h1>
            <p className="text-gray-600">Welcome back, {driverData.driver_info.full_name}</p>
          </div>
          
          <div className="flex items-center">
            <span className={`px-3 py-1 rounded-full font-medium text-sm ${
              driverStatus === 'available' ? 'bg-green-100 text-green-800' :
              driverStatus === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              Status: {driverStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
              
              {isLicenseExpiringSoon() && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-sm text-yellow-700">
                  <p className="font-bold">License Expiring Soon</p>
                  <p>Your license will expire on {formatDate(driverData.driver_info.license_expiry)}. Please renew it soon.</p>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Name:</span>
                  <span className="text-gray-800">{driverData.driver_info.full_name}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Email:</span>
                  <span className="text-gray-800">{driverData.driver_info.email}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Phone:</span>
                  <span className="text-gray-800">{driverData.driver_info.phone}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">License Number:</span>
                  <span className="text-gray-800">{driverData.driver_info.license_number}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">License Expiry:</span>
                  <span className={`text-gray-800 ${isLicenseExpiringSoon() ? 'text-yellow-600 font-medium' : ''}`}>
                    {formatDate(driverData.driver_info.license_expiry)}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Medical Check:</span>
                  <span className="text-gray-800">
                    {driverData.driver_info.medical_check_date ? formatDate(driverData.driver_info.medical_check_date) : 'Not available'}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Certification:</span>
                  <span className="text-gray-800">{driverData.driver_info.training_certification || 'None'}</span>
                </div>
              </div>
            </div>
            
            {/* Vehicles Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">My Vehicles</h2>
              
              {!driverData.vehicles || driverData.vehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No vehicles currently assigned to you.
                </div>
              ) : (
                <div className="space-y-4">
                  {driverData.vehicles.map((vehicle) => (
                    <div key={vehicle.vehicle_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-blue-700">
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getVehicleStatusClass(vehicle.status)}`}>
                          {vehicle.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-600">License Plate:</div>
                        <div className="text-gray-900">{vehicle.license_plate}</div>
                        
                        <div className="text-gray-600">Type:</div>
                        <div className="text-gray-900">{vehicle.vehicle_type}</div>
                        
                        <div className="text-gray-600">Capacity:</div>
                        <div className="text-gray-900">{vehicle.capacity_kg} kg</div>
                        
                        <div className="text-gray-600">Last Inspection:</div>
                        <div className="text-gray-900">{formatDate(vehicle.last_inspection_date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Shipments Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Shipments</h2>
              
              <div className="mb-6 border-b border-gray-200">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                  <li className="mr-2">
                    <button
                      className={`inline-block p-4 rounded-t-lg ${
                        activeTab === 'current' 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-500 border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('current')}
                    >
                      Current Shipments
                    </button>
                  </li>
                  <li className="mr-2">
                    <button
                      className={`inline-block p-4 rounded-t-lg ${
                        activeTab === 'completed' 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-500 border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('completed')}
                    >
                      Completed Shipments
                    </button>
                  </li>
                  <li>
                    <button
                      className={`inline-block p-4 rounded-t-lg ${
                        activeTab === 'all' 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-500 border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('all')}
                    >
                      All Shipments
                    </button>
                  </li>
                </ul>
              </div>
              
              {filteredShipments().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No shipments found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredShipments().map((shipment) => (
                        <tr key={shipment.shipment_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {shipment.tracking_number}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">
                            {shipment.company_name || 'Individual'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{shipment.origin}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{shipment.destination}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(shipment.pickup_date)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(shipment.status)}`}>
                              {shipment.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Shipment Summary */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-blue-600">
                    {driverData.shipments.length}
                  </span>
                  <span className="text-sm text-gray-600">Total Shipments</span>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-yellow-600">
                    {driverData.shipments.filter(s => s.status === 'pending').length}
                  </span>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-purple-600">
                    {driverData.shipments.filter(s => s.status === 'in_transit').length}
                  </span>
                  <span className="text-sm text-gray-600">In Transit</span>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-green-600">
                    {driverData.shipments.filter(s => s.status === 'delivered').length}
                  </span>
                  <span className="text-sm text-gray-600">Delivered</span>
                </div>
              </div>
              
              {driverData.recent_tracking_events && driverData.recent_tracking_events.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Recent Activity</h3>
                  <div className="space-y-3">
                    {driverData.recent_tracking_events.slice(0, 5).map((event) => (
                      <div key={event.event_id} className="flex items-start">
                        <div className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-500 mt-1"></div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {event.event_type.replace('_', ' ')} - {event.tracking_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.event_timestamp).toLocaleString()}
                          </p>
                          {event.notes && <p className="text-sm text-gray-600 mt-1">{event.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;