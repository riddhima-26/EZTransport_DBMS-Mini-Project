import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
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
  const { user } = useAuth();
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications] = useState([
    { id: 1, type: 'shipment', message: 'New shipment #1234 created', details: 'Mumbai → Delhi', time: '2m ago', read: false },
    { id: 2, type: 'delivery', message: 'Shipment #1233 delivered', details: 'Bangalore → Chennai', time: '15m ago', read: true },
    { id: 3, type: 'customer', message: 'New customer registered', details: 'Tech Solutions Pvt Ltd', time: '1h ago', read: true }
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);

  // Get time of day greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-hide welcome message after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcomeMessage(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Sample data for charts
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Revenue',
      data: [65000, 89000, 81000, 96000, 125000, 110000, 132000, 145000, 120000, 155000, 178000, 195000],
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
      ],
      borderWidth: 0
    }]
  };

  const topRoutesData = {
    labels: ['Mumbai → Delhi', 'Bangalore → Chennai', 'Kolkata → Hyderabad', 'Pune → Ahmedabad', 'Jaipur → Lucknow'],
    datasets: [{
      label: 'Shipments',
      data: [25, 20, 15, 12, 8],
      backgroundColor: [
        'rgba(147, 51, 234, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ]
    }]
  };

  const vehicleUtilizationData = {
    labels: ['Trucks', 'Vans', 'Bikes', 'Trailers'],
    datasets: [{
      data: [75, 60, 85, 40],
      backgroundColor: [
        'rgba(147, 51, 234, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(234, 179, 8, 0.7)'
      ],
      borderWidth: 0
    }]
  };

  const performanceMetrics = {
    labels: ['On-Time Delivery', 'Customer Satisfaction', 'Vehicle Utilization', 'Route Efficiency'],
    datasets: [{
      label: 'Performance',
      data: [92, 88, 78, 85],
      backgroundColor: 'rgba(147, 51, 234, 0.2)',
      borderColor: 'rgba(147, 51, 234, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(147, 51, 234, 1)',
      pointRadius: 4
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
      {showWelcomeMessage && (
        <div className="fixed top-4 right-4 bg-purple-600 text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in z-50 flex items-center">
          <i className="fas fa-hand-wave mr-2 text-yellow-300"></i>
          <div>
            <p className="font-medium">{getGreeting()}, {user?.full_name || 'Admin'}!</p>
            <p className="text-xs text-purple-200">Welcome to your dashboard</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">Dashboard</h1>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-gray-600 font-medium">
                Welcome back, <span className="text-purple-700 font-bold">{user?.full_name || 'Admin'}</span>
              </p>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-purple-200 px-4 py-2 rounded-full shadow-sm">
                <i className="fas fa-clock text-purple-600 animate-pulse"></i>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-purple-800">
                    {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                  </span>
                  <span className="text-xs text-purple-600 font-medium">
                    {currentTime.toLocaleDateString([], {weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'})}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                className="p-2 text-gray-500 hover:text-purple-600 relative"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <i className="fas fa-bell text-xl"></i>
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-10 border border-purple-100">
                  <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">Notifications</h3>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`p-3 border-b border-gray-100 hover:bg-purple-50 transition-colors flex items-start ${!notification.read ? 'bg-purple-50' : ''}`}
                      >
                        <div className={`p-2 rounded-full mr-3 ${
                          notification.type === 'shipment' ? 'bg-green-100 text-green-600' :
                          notification.type === 'delivery' ? 'bg-blue-100 text-blue-600' : 
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          <i className={`fas fa-${
                            notification.type === 'shipment' ? 'box' :
                            notification.type === 'delivery' ? 'truck' : 
                            'user'
                          }`}></i>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{notification.message}</p>
                          <p className="text-xs text-gray-500">{notification.details}</p>
                          <p className="text-xs text-purple-600 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 text-center">
                    <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg flex items-center">
              <i className="fas fa-download mr-2"></i> Export Report
            </button>
            <button className="px-4 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-sm hover:shadow flex items-center">
              <i className="fas fa-filter mr-2"></i> Filter
            </button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-3 font-medium flex items-center ${activeTab === 'overview' ? 'text-purple-600 border-b-2 border-purple-600 -mb-px' : 'text-gray-500 hover:text-purple-500'}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-chart-pie mr-2"></i> Overview
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center ${activeTab === 'analytics' ? 'text-purple-600 border-b-2 border-purple-600 -mb-px' : 'text-gray-500 hover:text-purple-500'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <i className="fas fa-chart-line mr-2"></i> Analytics
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center ${activeTab === 'operations' ? 'text-purple-600 border-b-2 border-purple-600 -mb-px' : 'text-gray-500 hover:text-purple-500'}`}
            onClick={() => setActiveTab('operations')}
          >
            <i className="fas fa-truck mr-2"></i> Operations
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-purple-100 hover:shadow-md transition-all transform hover:scale-105 hover:border-purple-300 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-800 mt-1">₹{stats.revenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <i className="fas fa-arrow-up mr-1"></i> 
                  <span className="font-medium">12.5%</span>
                  <span className="text-xs text-gray-600 ml-1">from last month</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 shadow-inner">
                <i className="fas fa-rupee-sign text-purple-600 text-2xl"></i>
              </div>
            </div>
          </div>

          {/* Active Shipments Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-green-100 hover:shadow-md transition-all transform hover:scale-105 hover:border-green-300 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Shipments</p>
                <p className="text-2xl font-bold text-green-800 mt-1">{stats.activeShipments}</p>
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <i className="fas fa-truck animate-bounce mr-1"></i>
                  <span className="font-medium">{Math.round(stats.activeShipments / stats.totalShipments * 100)}%</span>
                  <span className="text-xs text-gray-600 ml-1">currently on the move</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 shadow-inner">
                <i className="fas fa-shipping-fast text-green-600 text-2xl"></i>
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

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-purple-800">Revenue Overview</h2>
                  <div className="flex items-center space-x-2">
                    <select className="text-sm text-gray-600 bg-gray-100 rounded px-2 py-1">
                      <option>Last 12 months</option>
                      <option>Last 6 months</option>
                      <option>Last 30 days</option>
                    </select>
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
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: false
                          },
                          ticks: {
                            callback: function(value) {
                              return '₹' + value.toLocaleString();
                            }
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
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">This Month</span>
                    <button className="text-purple-600 hover:text-purple-800">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>
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
                      },
                      cutout: '70%'
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
                  {notifications.map(notification => (
                    <div key={notification.id} className={`flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors ${!notification.read ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      <div className={`p-2 rounded-full ${notification.type === 'shipment' ? 'bg-purple-100' : notification.type === 'delivery' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <i className={`fas ${notification.type === 'shipment' ? 'fa-box text-purple-600' : notification.type === 'delivery' ? 'fa-check text-green-600' : 'fa-user text-blue-600'}`}></i>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500">{notification.details}</p>
                      </div>
                      <span className="text-xs text-gray-500">{notification.time}</span>
                    </div>
                  ))}
                  <button className="w-full py-2 text-purple-600 hover:text-purple-800 text-sm font-medium">
                    View All Activity <i className="fas fa-arrow-right ml-1"></i>
                  </button>
                </div>
              </div>

              {/* Top Routes Section */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-purple-800">Top Routes</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">By Volume</span>
                    <button className="text-purple-600 hover:text-purple-800">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>
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
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicle Utilization */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-purple-800">Vehicle Utilization</h2>
                <button className="text-purple-600 hover:text-purple-800">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
              <div className="h-80">
                <Pie 
                  data={vehicleUtilizationData}
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

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-purple-800">Performance Metrics</h2>
                <button className="text-purple-600 hover:text-purple-800">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
              <div className="h-80">
                <Line 
                  data={performanceMetrics}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      r: {
                        angleLines: {
                          display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 gap-6">
            {/* Operations Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-purple-800 mb-6">Operations Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">Total Vehicles</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalVehicles}</p>
                    </div>
                    <i className="fas fa-truck text-purple-600 text-2xl"></i>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-purple-800 mb-1">
                      <span>Available</span>
                      <span>24</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total Drivers</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalDrivers}</p>
                    </div>
                    <i className="fas fa-user text-blue-600 text-2xl"></i>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-blue-800 mb-1">
                      <span>On Duty</span>
                      <span>18</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '64%'}}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Warehouses</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">{stats.totalWarehouses}</p>
                    </div>
                    <i className="fas fa-warehouse text-green-600 text-2xl"></i>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-green-800 mb-1">
                      <span>Capacity Used</span>
                      <span>72%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '72%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Shipment Map (Placeholder) */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-purple-800">Live Shipment Tracking</h2>
                <button className="text-purple-600 hover:text-purple-800">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-map-marked-alt text-4xl text-purple-600 mb-3"></i>
                  <p className="text-lg font-medium text-gray-700">Interactive Map View</p>
                  <p className="text-sm text-gray-500 mt-1">8 shipments in transit</p>
                  <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    View Full Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;