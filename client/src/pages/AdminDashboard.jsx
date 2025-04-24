import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard data state
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
  const [monthlyData, setMonthlyData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get dashboard statistics from the complex stored procedure
        try {
          const statsResponse = await api.get('/api/admin/stats');
          
          if (statsResponse.data) {
            setStats({
              totalShipments: statsResponse.data.totalShipments || 0,
              inTransit: statsResponse.data.inTransit || 0,
              delivered: statsResponse.data.delivered || 0,
              pending: statsResponse.data.pending || 0,
              customers: statsResponse.data.customers || 0,
              drivers: statsResponse.data.drivers || 0,
              vehicles: statsResponse.data.vehicles || 0
            });
            
            if (statsResponse.data.monthlyData) {
              setMonthlyData(statsResponse.data.monthlyData);
            }
            
            if (statsResponse.data.statusDistribution) {
              setStatusDistribution(statsResponse.data.statusDistribution);
            }
          }
        } catch (statsError) {
          console.error('Error fetching stats:', statsError);
          setError('Failed to load statistics. Please try again later.');
        }
        
        // Get recent shipments
        try {
          const shipmentsResponse = await api.get('/api/shipments');
          setRecentShipments(Array.isArray(shipmentsResponse.data) 
            ? shipmentsResponse.data.slice(0, 10) // Only take the 10 most recent
            : []);
        } catch (shipmentsError) {
          console.error('Error fetching shipments:', shipmentsError);
          setError(prev => prev || 'Failed to load recent shipments. Please try again later.');
        }
        
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-indigo-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-indigo-900">Admin Dashboard</h1>
        <p className="text-indigo-700">Welcome, <span className="font-medium">{user?.full_name || 'Admin'}</span>. Here's an overview of your logistics system.</p>
        {error && (
          <div className="mt-2 p-2 bg-orange-100 border border-orange-300 text-orange-800 rounded">
            <p className="text-sm font-medium flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i> {error}
            </p>
          </div>
        )}
      </div>

      {/* Quick Tracking Search */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg shadow-md p-6 mb-6 text-white">
        <h2 className="text-lg font-semibold text-yellow-300 mb-3">Quick Shipment Track</h2>
        <form onSubmit={handleTrackingSearch} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number or shipment ID" 
            className="flex-1 px-4 py-2 bg-white/10 border border-indigo-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white placeholder:text-indigo-200"
          />
          <button 
            type="submit" 
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-indigo-950 font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <i className="fas fa-search mr-2"></i>
            Track
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-3 rounded-full">
              <i className="fas fa-box-open text-indigo-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Total Shipments</h3>
              <p className="text-3xl font-bold text-indigo-700">{stats.totalShipments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-yellow-100">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <i className="fas fa-clock text-yellow-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-green-100">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <i className="fas fa-check-circle text-green-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Delivered</h3>
              <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <i className="fas fa-truck text-blue-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">In Transit</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.inTransit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-purple-100">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-full">
              <i className="fas fa-users text-purple-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Customers</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.customers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-3 rounded-full">
              <i className="fas fa-id-card text-indigo-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Drivers</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.drivers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-3 rounded-full">
              <i className="fas fa-truck text-indigo-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Vehicles</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.vehicles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Data Chart */}
      {monthlyData && monthlyData.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mb-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Monthly Shipment Trends</h2>
          <div className="h-64">
            <div className="flex h-full items-end">
              {monthlyData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center mx-1">
                  <div 
                    style={{ height: `${Math.max((item.shipment_count / Math.max(...monthlyData.map(d => d.shipment_count))) * 100, 5)}%` }}
                    className="bg-gradient-to-t from-indigo-600 to-indigo-400 w-full rounded-t-md"
                  ></div>
                  <div className="text-xs text-indigo-600 mt-1 font-medium">{item.month}</div>
                  <div className="text-xs text-indigo-500">{item.shipment_count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Distribution */}
      {statusDistribution && statusDistribution.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mb-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Shipment Status Distribution</h2>
          <div className="flex gap-4 flex-wrap">
            {statusDistribution.map((item, index) => (
              <div key={index} className="flex-1 min-w-[120px] bg-white rounded-lg p-4 shadow-sm border border-indigo-50">
                <div className={`rounded-md p-2 mb-2 ${getStatusClass(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </div>
                <div className="text-3xl font-bold text-indigo-800">{item.count}</div>
                <div className="text-sm text-indigo-500">shipments</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Shipments */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">Recent Shipments</h2>
          <button
            onClick={() => navigate('/shipments')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            View All
          </button>
        </div>
        
        {recentShipments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-indigo-300 mb-3">
              <i className="fas fa-box-open text-5xl"></i>
            </div>
            <p className="text-indigo-500">No shipments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="min-w-full divide-y divide-indigo-200">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Origin → Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-indigo-100">
                {recentShipments.map((shipment) => (
                  <tr key={shipment.shipment_id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-900">
                        {shipment.shipment_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-yellow-600">
                        {shipment.tracking_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-600">
                        {shipment.origin} → {shipment.destination}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(shipment.status)}`}>
                        {shipment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(shipment.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleTrackShipment(shipment.shipment_id)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1 rounded text-xs flex items-center"
                        >
                          <i className="fas fa-map-marker-alt mr-1"></i> Track
                        </button>
                        <button
                          onClick={() => navigate(`/shipments/${shipment.shipment_id}`)}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-xs flex items-center"
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
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mt-6 border border-indigo-100">
        <h2 className="text-xl font-semibold mb-4 text-indigo-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/shipments?action=create" className="bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 p-4 rounded-lg border border-indigo-200 transition-colors group">
            <div className="flex items-center">
              <div className="bg-indigo-200 group-hover:bg-indigo-300 p-3 rounded-full mr-3 transition-colors">
                <i className="fas fa-plus text-indigo-700"></i>
              </div>
              <span className="text-indigo-800 font-medium">Create Shipment</span>
            </div>
          </Link>

          <Link to="/drivers?action=create" className="bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 p-4 rounded-lg border border-yellow-200 transition-colors group">
            <div className="flex items-center">
              <div className="bg-yellow-200 group-hover:bg-yellow-300 p-3 rounded-full mr-3 transition-colors">
                <i className="fas fa-user-plus text-yellow-700"></i>
              </div>
              <span className="text-yellow-800 font-medium">Add Driver</span>
            </div>
          </Link>

          <Link to="/vehicles?action=create" className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 p-4 rounded-lg border border-purple-200 transition-colors group">
            <div className="flex items-center">
              <div className="bg-purple-200 group-hover:bg-purple-300 p-3 rounded-full mr-3 transition-colors">
                <i className="fas fa-truck text-purple-700"></i>
              </div>
              <span className="text-purple-800 font-medium">Register Vehicle</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;