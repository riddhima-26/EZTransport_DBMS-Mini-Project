import { useState, useEffect } from 'react';
import api from '../services/api';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeShipments: 0,
    totalCustomers: 0,
    totalVehicles: 0,
    revenue: 0,
    onTimeDeliveries: 0,
    totalDrivers: 0,
    totalWarehouses: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sample data for charts
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Revenue',
      data: [65000, 89000, 81000, 96000, 125000, 110000],
      borderColor: 'rgb(147, 51, 234)',
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const shipmentStatusData = {
    labels: ['In Transit', 'Delivered', 'Pending', 'Cancelled'],
    datasets: [{
      data: [8, 45, 12, 3],
      backgroundColor: [
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(234, 179, 8)',
        'rgb(239, 68, 68)'
      ]
    }]
  };

  const topRoutesData = {
    labels: ['Mumbai → Delhi', 'Bangalore → Chennai', 'Kolkata → Hyderabad', 'Pune → Ahmedabad'],
    datasets: [{
      label: 'Shipments',
      data: [25, 20, 15, 12],
      backgroundColor: 'rgba(147, 51, 234, 0.8)'
    }]
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [shipmentsRes, customersRes, vehiclesRes] = await Promise.all([
        api.get('/shipments'),
        api.get('/customers'),
        api.get('/vehicles')
      ]);

      const shipments = shipmentsRes.data;
      const activeShipments = shipments.filter(s => s.status === 'in_transit').length;

      setStats({
        totalShipments: shipments.length,
        activeShipments,
        totalCustomers: customersRes.data.length,
        totalVehicles: vehiclesRes.data.length,
        revenue: 125000,
        onTimeDeliveries: 45,
        totalDrivers: 28,
        totalWarehouses: 5
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-purple-800">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, Admin</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <i className="fas fa-download mr-2"></i> Export Report
            </button>
            <button className="px-4 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
              <i className="fas fa-filter mr-2"></i> Filter
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-purple-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-purple-800 mt-1">₹{stats.revenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-2">
                  <i className="fas fa-arrow-up mr-1"></i> 12.5% from last month
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <i className="fas fa-rupee-sign text-purple-600 text-2xl"></i>
              </div>
            </div>
          </div>

          {/* Active Shipments Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-green-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Shipments</p>
                <p className="text-2xl font-semibold text-green-800 mt-1">{stats.activeShipments}</p>
                <p className="text-sm text-green-600 mt-2">
                  <i className="fas fa-truck mr-1"></i> 8 in transit
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <i className="fas fa-truck text-green-600 text-2xl"></i>
              </div>
            </div>
          </div>

          {/* On-Time Deliveries Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On-Time Deliveries</p>
                <p className="text-2xl font-semibold text-blue-800 mt-1">{stats.onTimeDeliveries}</p>
                <p className="text-sm text-blue-600 mt-2">
                  <i className="fas fa-check-circle mr-1"></i> 92% success rate
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <i className="fas fa-clock text-blue-600 text-2xl"></i>
              </div>
            </div>
          </div>

          {/* Total Customers Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-yellow-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-semibold text-yellow-800 mt-1">{stats.totalCustomers}</p>
                <p className="text-sm text-yellow-600 mt-2">
                  <i className="fas fa-user-plus mr-1"></i> 5 new this month
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <i className="fas fa-users text-yellow-600 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-purple-800">Revenue Overview</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Last 6 months</span>
                <button className="text-purple-600 hover:text-purple-800">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
            </div>
            <div className="h-80">
              <Line 
                data={revenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        display: false
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Shipment Status Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-purple-800">Shipment Status</h2>
              <button className="text-purple-600 hover:text-purple-800">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
            <div className="h-80">
              <Doughnut 
                data={shipmentStatusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
        </div>
      </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-purple-800">Recent Activity</h2>
              <button className="text-purple-600 hover:text-purple-800">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="p-2 rounded-full bg-purple-100">
                  <i className="fas fa-box text-purple-600"></i>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">New shipment #1234 created</p>
                  <p className="text-xs text-gray-500">Mumbai → Delhi</p>
                </div>
                <span className="text-xs text-gray-500">2m ago</span>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="p-2 rounded-full bg-green-100">
                  <i className="fas fa-check text-green-600"></i>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">Shipment #1233 delivered</p>
                  <p className="text-xs text-gray-500">Bangalore → Chennai</p>
                </div>
                <span className="text-xs text-gray-500">15m ago</span>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="p-2 rounded-full bg-blue-100">
                  <i className="fas fa-user text-blue-600"></i>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">New customer registered</p>
                  <p className="text-xs text-gray-500">Tech Solutions Pvt Ltd</p>
                </div>
                <span className="text-xs text-gray-500">1h ago</span>
              </div>
            </div>
          </div>

          {/* Top Routes Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-purple-800">Top Routes</h2>
              <button className="text-purple-600 hover:text-purple-800">
                <i className="fas fa-ellipsis-v"></i>
              </button>
    </div>
            <div className="h-80">
              <Bar 
                data={topRoutesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        display: false
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard; 