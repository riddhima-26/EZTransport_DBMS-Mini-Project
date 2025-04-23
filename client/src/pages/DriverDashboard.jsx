import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedShipments, setAssignedShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    const fetchDriverShipments = async () => {
      try {
        setLoading(true);
        // Get shipments assigned to the current driver
        const response = await api.get(`/driver/${user.id}/shipments`);
        setAssignedShipments(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching driver shipments:', err);
        setError('Could not load your assigned shipments. Please try again later.');
        setLoading(false);
      }
    };

    fetchDriverShipments();
  }, [user.id]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'returned':
        return 'bg-red-100 text-red-800';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to update shipment status
  const updateStatus = async (shipmentId, newStatus) => {
    try {
      setUpdateLoading(true);
      await api.post('/tracking-events', {
        shipment_id: shipmentId,
        event_type: newStatus,
        recorded_by: user.id,
        // We need to add location_id but as a simplification for now we'll just use the user's current assigned location
        // In a real-world application, you would use geolocation or let the driver select from nearby locations
        location_id: 1, // This is a placeholder - in a real app this would be dynamically determined
        notes: `Status updated to ${newStatus} by driver ${user.full_name}`
      });
      
      // Refresh the shipments list
      const response = await api.get(`/driver/${user.id}/shipments`);
      setAssignedShipments(response.data);
      setUpdateLoading(false);
    } catch (err) {
      console.error('Error updating shipment status:', err);
      setError('Failed to update shipment status. Please try again.');
      setUpdateLoading(false);
    }
  };

  const handleTrackingSearch = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/tracking?tracking=${trackingNumber.trim()}`);
    }
  };

  const handleTrackShipment = (shipmentId) => {
    navigate(`/tracking?id=${shipmentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">
          <i className="fas fa-exclamation-circle text-5xl"></i>
        </div>
        <h3 className="text-xl font-bold mb-2">Error Loading Data</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user.full_name}</h1>
        <p className="text-gray-600">Manage your assigned shipments and update their status</p>
      </div>

      {/* Quick Tracking Search */}
      <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6 border border-blue-100">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">Quick Track</h2>
        <form onSubmit={handleTrackingSearch} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number" 
            className="flex-1 px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <i className="fas fa-search mr-2"></i>
            Track
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 rounded-lg shadow p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <i className="fas fa-truck text-blue-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Assigned Shipments</h3>
              <p className="text-3xl font-bold text-blue-600">{assignedShipments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-6 border border-yellow-100">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <i className="fas fa-clock text-yellow-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Pending Pickups</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {assignedShipments.filter(s => s.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6 border border-green-100">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <i className="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Delivered</h3>
              <p className="text-3xl font-bold text-green-600">
                {assignedShipments.filter(s => s.status === 'delivered').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Assigned Shipments</h2>
        
        {assignedShipments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <i className="fas fa-box-open text-5xl"></i>
            </div>
            <p className="text-gray-500">You don't have any assigned shipments right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedShipments.map((shipment) => (
                  <tr key={shipment.shipment_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.tracking_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{shipment.origin}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{shipment.destination}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(shipment.status)}`}>
                        {shipment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {updateLoading ? (
                          <span className="text-gray-500">
                            <i className="fas fa-spinner fa-spin mr-1"></i> Updating...
                          </span>
                        ) : (
                          <>
                            {shipment.status === 'pending' && (
                              <button
                                onClick={() => updateStatus(shipment.shipment_id, 'pickup')}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Mark as Picked Up
                              </button>
                            )}
                            {shipment.status === 'picked_up' && (
                              <button
                                onClick={() => updateStatus(shipment.shipment_id, 'departure')}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Departed
                              </button>
                            )}
                            {shipment.status === 'in_transit' && (
                              <>
                                <button
                                  onClick={() => updateStatus(shipment.shipment_id, 'arrival')}
                                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded text-xs"
                                >
                                  Arrived
                                </button>
                                <button
                                  onClick={() => updateStatus(shipment.shipment_id, 'delivery')}
                                  className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                                >
                                  Delivered
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleTrackShipment(shipment.shipment_id)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs"
                            >
                              <i className="fas fa-map-marker-alt mr-1"></i> Track
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard; 