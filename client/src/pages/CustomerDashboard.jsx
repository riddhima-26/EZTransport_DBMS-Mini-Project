import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    basicStats: {
      total_shipments: 0,
      pending_shipments: 0,
      transit_shipments: 0,
      delivered_shipments: 0,
      returned_shipments: 0
    },
    monthlyData: [],
    topRoutes: [],
    recentShipments: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    const customerId = user?.customer_id;
    
    if (!customerId) {
      setError("Could not identify customer ID. Please log in again.");
      setLoading(false);
      return;
    }

    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        
        // Get customer stats using the new API endpoint
        const response = await api.get(`/customer/stats/${customerId}`);
        setStats(response.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching customer data:', err);
        setError('Could not load your dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [user]);

  const handleTrackingSearch = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/tracking?tracking=${trackingNumber.trim()}`);
    }
  };

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

  // Prepare chart data
  const chartData = {
    labels: stats.monthlyData.map(item => item.month),
    datasets: [
      {
        label: 'Shipment Value ($)',
        data: stats.monthlyData.map(item => item.total_value),
        backgroundColor: 'rgba(79, 70, 229, 0.6)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
      },
    ],
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
        <h3 className="text-xl font-bold mb-2">Error Loading Data</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-indigo-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-indigo-900">Customer Dashboard</h1>
        <p className="text-indigo-700">Welcome, <span className="font-medium">{user?.full_name}</span>. Track your shipments and manage your logistics.</p>
      </div>

      {/* Quick Tracking Search */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg shadow-md p-6 mb-6 text-white">
        <h2 className="text-lg font-semibold text-yellow-300 mb-3">Track Your Shipment</h2>
        <form onSubmit={handleTrackingSearch} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number" 
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
              <p className="text-3xl font-bold text-indigo-700">{stats.basicStats.total_shipments}</p>
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
              <p className="text-3xl font-bold text-yellow-600">{stats.basicStats.pending_shipments}</p>
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
              <p className="text-3xl font-bold text-blue-600">{stats.basicStats.transit_shipments}</p>
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
              <p className="text-3xl font-bold text-green-600">{stats.basicStats.delivered_shipments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Shipment Value History</h2>
          {stats.monthlyData.length > 0 ? (
            <Bar data={chartData} options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Value ($)'
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: false,
                },
              },
            }} />
          ) : (
            <div className="flex items-center justify-center h-64 text-indigo-400">
              <p>No shipment history available</p>
            </div>
          )}
        </div>

        {/* Top Routes */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Top Routes</h2>
          {stats.topRoutes.length > 0 ? (
            <div className="space-y-4">
              {stats.topRoutes.map((route, index) => (
                <div key={index} className="bg-indigo-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="text-indigo-800 font-medium">{route.route}</div>
                    <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                      {route.shipment_count} shipments
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-indigo-400">
              <p>No route data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">Recent Shipments</h2>
          <Link
            to="/customer/shipments"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            View All
          </Link>
        </div>
        
        {stats.recentShipments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-indigo-300 mb-3">
              <i className="fas fa-box-open text-5xl"></i>
            </div>
            <p className="text-indigo-500">You don't have any recent shipments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="min-w-full divide-y divide-indigo-200">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-indigo-100">
                {stats.recentShipments.map((shipment) => (
                  <tr key={shipment.shipment_id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-yellow-600">
                        {shipment.tracking_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-900">
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
                        <Link
                          to={`/tracking?id=${shipment.shipment_id}`}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1 rounded text-xs flex items-center"
                        >
                          <i className="fas fa-map-marker-alt mr-1"></i> Track
                        </Link>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Link to="/customer/new-shipment" className="bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 p-4 rounded-lg border border-indigo-200 transition-colors group">
          <div className="flex items-center">
            <div className="bg-indigo-200 group-hover:bg-indigo-300 p-3 rounded-full mr-3 transition-colors">
              <i className="fas fa-plus text-indigo-700"></i>
            </div>
            <span className="text-indigo-800 font-medium">Create New Shipment</span>
          </div>
        </Link>

        <Link to="/customer/profile" className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 p-4 rounded-lg border border-blue-200 transition-colors group">
          <div className="flex items-center">
            <div className="bg-blue-200 group-hover:bg-blue-300 p-3 rounded-full mr-3 transition-colors">
              <i className="fas fa-user text-blue-700"></i>
            </div>
            <span className="text-blue-800 font-medium">Your Profile</span>
          </div>
        </Link>

        <Link to="/customer/shipments" className="bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 p-4 rounded-lg border border-green-200 transition-colors group">
          <div className="flex items-center">
            <div className="bg-green-200 group-hover:bg-green-300 p-3 rounded-full mr-3 transition-colors">
              <i className="fas fa-boxes text-green-700"></i>
            </div>
            <span className="text-green-800 font-medium">All Shipments</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default CustomerDashboard;