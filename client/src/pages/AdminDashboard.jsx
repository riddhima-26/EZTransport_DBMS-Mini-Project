import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalShipments: 0,
    inTransit: 0,
    delivered: 0,
    pending: 0,
    customers: 0,
    drivers: 0,
    vehicles: 0
  });
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get dashboard statistics
        const statsResponse = await api.get('/admin/stats');
        setStats(statsResponse.data);
        
        // Get recent shipments
        const shipmentsResponse = await api.get('/admin/recent-shipments');
        setRecentShipments(shipmentsResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
      default:
        return 'bg-gray-100 text-gray-800';
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
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome, {user.full_name}. Here's an overview of your logistics system.</p>
      </div>

      {/* Quick Tracking Search */}
      <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6 border border-blue-100">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">Quick Shipment Track</h2>
        <form onSubmit={handleTrackingSearch} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number or shipment ID" 
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <i className="fas fa-box-open text-blue-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Total Shipments</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalShipments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <i className="fas fa-clock text-yellow-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <i className="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Delivered</h3>
              <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <i className="fas fa-truck text-blue-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">In Transit</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.inTransit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-full">
              <i className="fas fa-users text-purple-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Customers</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.customers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-3 rounded-full">
              <i className="fas fa-user-hard-hat text-indigo-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Drivers</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.drivers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-full">
              <i className="fas fa-truck-container text-red-500 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Vehicles</h3>
              <p className="text-3xl font-bold text-red-600">{stats.vehicles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Shipments</h2>
          <button
            onClick={() => navigate('/shipments')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            View All
          </button>
        </div>
        
        {recentShipments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <i className="fas fa-box-open text-5xl"></i>
            </div>
            <p className="text-gray-500">No shipments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
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
                {recentShipments.map((shipment) => (
                  <tr key={shipment.shipment_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {shipment.shipment_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.tracking_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{shipment.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {shipment.origin} → {shipment.destination}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(shipment.status)}`}>
                        {shipment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleTrackShipment(shipment.shipment_id)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs flex items-center"
                        >
                          <i className="fas fa-map-marker-alt mr-1"></i> Track
                        </button>
                        <button
                          onClick={() => navigate(`/shipments/${shipment.shipment_id}`)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs flex items-center"
                        >
                          <i className="fas fa-edit mr-1"></i> Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/shipments?action=create" className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-100 transition-colors">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <i className="fas fa-plus text-blue-500"></i>
              </div>
              <span className="text-blue-700 font-medium">Create Shipment</span>
            </div>
          </Link>

          <Link to="/drivers?action=create" className="bg-green-50 hover:bg-green-100 p-4 rounded-lg border border-green-100 transition-colors">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <i className="fas fa-user-plus text-green-500"></i>
              </div>
              <span className="text-green-700 font-medium">Add Driver</span>
            </div>
          </Link>

          <Link to="/vehicles?action=create" className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg border border-purple-100 transition-colors">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <i className="fas fa-truck-loading text-purple-500"></i>
              </div>
              <span className="text-purple-700 font-medium">Register Vehicle</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 