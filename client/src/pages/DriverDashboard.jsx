import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for dashboard data
  const [driverStats, setDriverStats] = useState({
    total_shipments: 0,
    delivered_shipments: 0,
    active_shipments: 0, 
    pending_shipments: 0,
    driver_status: 'available'
  });
  const [currentShipment, setCurrentShipment] = useState(null);
  const [upcomingShipments, setUpcomingShipments] = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [driverPerformance, setDriverPerformance] = useState(null);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        
        // Get driver's dashboard data from stored procedure
        try {
          // Using the new endpoint that calls the get_driver_dashboard stored procedure
          const dashboardResponse = await api.get(`/api/driver/${user.id}/dashboard`);
          
          if (dashboardResponse?.data?.length > 0) {
            // Get basic stats from first result set
            setDriverStats(dashboardResponse.data[0][0] || {
              total_shipments: 0,
              delivered_shipments: 0,
              active_shipments: 0, 
              pending_shipments: 0,
              driver_status: 'available'
            });
            
            // Get current shipment from second result set
            if (dashboardResponse.data[1] && dashboardResponse.data[1].length > 0) {
              setCurrentShipment(dashboardResponse.data[1][0]);
            }
            
            // Get upcoming shipments from third result set
            if (dashboardResponse.data[2] && dashboardResponse.data[2].length > 0) {
              setUpcomingShipments(dashboardResponse.data[2]);
            }
            
            // Get recent deliveries from fourth result set
            if (dashboardResponse.data[3] && dashboardResponse.data[3].length > 0) {
              setRecentDeliveries(dashboardResponse.data[3]);
            }
          }
        } catch (dashboardError) {
          console.error('Error fetching driver dashboard:', dashboardError);
          setError('Could not load your dashboard. Please try again later.');
          
          // Fallback to basic shipment data if dashboard procedure fails
          try {
            const shipmentsResponse = await api.get(`/api/driver/${user.id}/shipments`);
            const assignedShipments = shipmentsResponse.data || [];
            
            setDriverStats({
              total_shipments: assignedShipments.length,
              delivered_shipments: assignedShipments.filter(s => s.status === 'delivered').length,
              active_shipments: assignedShipments.filter(s => s.status === 'in_transit').length,
              pending_shipments: assignedShipments.filter(s => s.status === 'pending').length,
              driver_status: 'unknown'
            });
            
            const current = assignedShipments.find(s => s.status === 'in_transit');
            if (current) setCurrentShipment(current);
            
            setUpcomingShipments(
              assignedShipments
                .filter(s => s.status === 'pending')
                .sort((a, b) => new Date(a.pickup_date) - new Date(b.pickup_date))
                .slice(0, 3)
            );
            
            setRecentDeliveries(
              assignedShipments
                .filter(s => s.status === 'delivered')
                .sort((a, b) => new Date(b.actual_delivery || b.estimated_delivery) - new Date(a.actual_delivery || a.estimated_delivery))
                .slice(0, 5)
            );
          } catch (shipmentError) {
            console.error('Error fetching driver shipments:', shipmentError);
          }
        }
        
        // Get driver performance data
        try {
          const performanceResponse = await api.get(`/api/driver/${user.id}/performance`);
          if (performanceResponse?.data) {
            setDriverPerformance(performanceResponse.data);
          }
        } catch (perfError) {
          console.error('Error fetching driver performance:', perfError);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching driver data:', err);
        setError('Failed to load your dashboard. Please try again later.');
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchDriverData();
    }
  }, [user?.id]);

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

  const getDriverStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'on_leave':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to update shipment status
  const updateStatus = async (shipmentId, newStatus, locationId = 1) => {
    try {
      setUpdateLoading(true);
      await api.post('/api/tracking-events', {
        shipment_id: shipmentId,
        event_type: newStatus,
        location_id: locationId,
        recorded_by: user.id,
        notes: `Status updated to ${newStatus} by driver ${user.full_name}`
      });
      
      // Refresh the dashboard data
      const dashboardResponse = await api.get(`/api/driver/${user.id}/dashboard`);
      
      if (dashboardResponse?.data?.length > 0) {
        // Update all state with new data
        setDriverStats(dashboardResponse.data[0][0] || driverStats);
        
        if (dashboardResponse.data[1] && dashboardResponse.data[1].length > 0) {
          setCurrentShipment(dashboardResponse.data[1][0]);
        } else {
          setCurrentShipment(null);
        }
        
        if (dashboardResponse.data[2] && dashboardResponse.data[2].length > 0) {
          setUpcomingShipments(dashboardResponse.data[2]);
        } else {
          setUpcomingShipments([]);
        }
        
        if (dashboardResponse.data[3] && dashboardResponse.data[3].length > 0) {
          setRecentDeliveries(dashboardResponse.data[3]);
        } else {
          setRecentDeliveries([]);
        }
      }
      
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

  const viewShipmentDetails = (shipmentId) => {
    navigate(`/driver/shipments/${shipmentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error && !currentShipment && upcomingShipments.length === 0 && recentDeliveries.length === 0) {
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
        <h1 className="text-2xl font-bold mb-2 text-indigo-900">Driver Dashboard</h1>
        <p className="text-indigo-700">Welcome, <span className="font-medium">{user?.full_name}</span>. Here's your current assignments and deliveries.</p>
        {error && (
          <div className="mt-2 p-2 bg-orange-100 border border-orange-300 text-orange-800 rounded">
            <p className="text-sm font-medium flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i> {error}
            </p>
          </div>
        )}
        
        {/* Driver Status Badge */}
        <div className="mt-3">
          <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${getDriverStatusClass(driverStats.driver_status)}`}>
            Status: {driverStats.driver_status?.replace('_', ' ') || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Quick Tracking Search */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg shadow-md p-6 mb-6 text-white">
        <h2 className="text-lg font-semibold text-yellow-300 mb-3">Quick Shipment Track</h2>
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
              <p className="text-3xl font-bold text-indigo-700">{driverStats.total_shipments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-md p-6 border border-yellow-100">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <i className="fas fa-clock text-yellow-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Pending Pickups</h3>
              <p className="text-3xl font-bold text-yellow-600">{driverStats.pending_shipments || 0}</p>
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
              <p className="text-3xl font-bold text-blue-600">{driverStats.active_shipments || 0}</p>
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
              <p className="text-3xl font-bold text-green-600">{driverStats.delivered_shipments || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Active Shipment */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mb-6">
        <h2 className="text-xl font-semibold text-indigo-900 mb-4">Current Active Delivery</h2>
        {!currentShipment ? (
          <div className="text-center py-6">
            <div className="text-indigo-300 mb-3">
              <i className="fas fa-truck text-5xl"></i>
            </div>
            <p className="text-indigo-500">No active shipment at the moment.</p>
          </div>
        ) : (
          <div className="bg-indigo-50/70 rounded-lg p-4 border border-indigo-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-indigo-900">{currentShipment.tracking_number}</h3>
                <p className="text-indigo-700 mt-1">
                  <span className="font-medium">Route:</span> {currentShipment.origin} → {currentShipment.destination}
                </p>
                {currentShipment.customer && (
                  <p className="text-indigo-700">
                    <span className="font-medium">Customer:</span> {currentShipment.customer}
                  </p>
                )}
              </div>
              <div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => updateStatus(currentShipment.shipment_id, 'delivery', currentShipment.destination_id)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center disabled:opacity-50"
                    disabled={updateLoading}
                  >
                    {updateLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> 
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle mr-2"></i>
                        Mark as Delivered
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => viewShipmentDetails(currentShipment.shipment_id)}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center"
                  >
                    <i className="fas fa-info-circle mr-2"></i>
                    View Details
                  </button>
                </div>
                
                {currentShipment.special_instructions && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                    <p className="font-medium text-yellow-700">Special Instructions:</p>
                    <p className="text-yellow-600">{currentShipment.special_instructions}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Delivery Progress */}
            <div className="mt-4">
              <div className="flex items-center">
                <div className="w-full bg-indigo-100 rounded-full h-2.5">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-indigo-500">
                <span>Pick up: {new Date(currentShipment.pickup_date).toLocaleDateString()}</span>
                <span>Est. delivery: {new Date(currentShipment.estimated_delivery).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Shipments */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mb-6">
        <h2 className="text-xl font-semibold text-indigo-900 mb-4">Upcoming Pickups</h2>
        {upcomingShipments.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-indigo-300 mb-3">
              <i className="fas fa-calendar-alt text-5xl"></i>
            </div>
            <p className="text-indigo-500">No upcoming shipments scheduled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    Pickup Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-indigo-100">
                {upcomingShipments.map((shipment) => (
                  <tr key={shipment.shipment_id} className="hover:bg-indigo-50 transition-colors">
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
                      <div className="text-sm text-indigo-600">
                        {new Date(shipment.pickup_date).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateStatus(shipment.shipment_id, 'pickup', shipment.origin_id)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1 rounded text-xs flex items-center"
                          disabled={updateLoading}
                        >
                          {updateLoading ? (
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                          ) : (
                            <i className="fas fa-truck-loading mr-1"></i>
                          )}
                          Pickup
                        </button>
                        <button
                          onClick={() => viewShipmentDetails(shipment.shipment_id)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs flex items-center"
                        >
                          <i className="fas fa-info-circle mr-1"></i>
                          Details
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

      {/* Recent Deliveries */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100">
        <h2 className="text-xl font-semibold text-indigo-900 mb-4">Recent Deliveries</h2>
        {recentDeliveries.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-indigo-300 mb-3">
              <i className="fas fa-history text-5xl"></i>
            </div>
            <p className="text-indigo-500">No delivery history yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    Delivery Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">
                    Delivery Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-indigo-100">
                {recentDeliveries.map((shipment) => (
                  <tr key={shipment.shipment_id} className="hover:bg-indigo-50 transition-colors">
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
                      <div className="text-sm text-indigo-600">
                        {shipment.actual_delivery ? new Date(shipment.actual_delivery).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shipment.delivery_time_minutes ? (
                        <div className="text-sm text-indigo-600">
                          {Math.floor(shipment.delivery_time_minutes / 60)}h {shipment.delivery_time_minutes % 60}m
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Metrics - Only show if we have performance data */}
      {driverPerformance && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-indigo-100 mt-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Your Performance</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <h3 className="text-lg font-medium text-indigo-800 mb-2">Delivery Rate</h3>
              <div className="text-3xl font-bold text-indigo-700">
                {driverPerformance.completion_rate ? Math.round(driverPerformance.completion_rate) : 0}%
              </div>
              <div className="text-sm text-indigo-500 mt-1">
                {driverPerformance.completed_deliveries || 0} of {driverPerformance.total_deliveries || 0} completed
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <h3 className="text-lg font-medium text-indigo-800 mb-2">Time Efficiency</h3>
              <div className="text-3xl font-bold text-indigo-700">
                {driverPerformance.time_efficiency ? Math.round(driverPerformance.time_efficiency) : 0}/100
              </div>
              <div className="text-sm text-indigo-500 mt-1">
                Based on timely deliveries
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <h3 className="text-lg font-medium text-indigo-800 mb-2">Overall Score</h3>
              <div className="text-3xl font-bold text-indigo-700">
                {driverPerformance.overall_performance ? Math.round(driverPerformance.overall_performance) : 0}/100
              </div>
              <div className="text-sm text-indigo-500 mt-1">
                Your overall performance rating
              </div>
            </div>
          </div>
          
          {/* Performance Issues */}
          {(driverPerformance.issue_count > 0 || driverPerformance.delay_count > 0) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Areas for Improvement</h4>
              <ul className="text-sm text-yellow-700">
                {driverPerformance.delay_count > 0 && (
                  <li className="flex items-center">
                    <i className="fas fa-clock text-yellow-500 mr-2"></i>
                    {driverPerformance.delay_count} delivery {driverPerformance.delay_count === 1 ? 'delay' : 'delays'} reported
                  </li>
                )}
                {driverPerformance.issue_count > 0 && (
                  <li className="flex items-center mt-1">
                    <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                    {driverPerformance.issue_count} {driverPerformance.issue_count === 1 ? 'issue' : 'issues'} reported during deliveries
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;