import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    tax_id: '',
  });
  const [shipmentFilter, setShipmentFilter] = useState('all');
  
  useEffect(() => {
    fetchCustomerData();
  }, [user.id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/customer-dashboard/${user.id}`);
      setCustomerData(response.data);
      
      // Initialize edit form data
      if (response.data.customer_info) {
        setEditFormData({
          full_name: response.data.customer_info.full_name,
          email: response.data.customer_info.email,
          phone: response.data.customer_info.phone,
          company_name: response.data.customer_info.company_name || '',
          tax_id: response.data.customer_info.tax_id || '',
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError('Failed to load customer data. Please try again later.');
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/customers/${customerData.customer_info.customer_id}`, editFormData);
      // Update the local state
      setCustomerData({
        ...customerData,
        customer_info: {
          ...customerData.customer_info,
          ...editFormData
        }
      });
      setIsEditModalOpen(false);
      // Show success message
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating customer info:', err);
      alert('Failed to update profile. Please try again.');
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

  const filteredShipments = () => {
    if (!customerData || !customerData.shipments) return [];
    if (shipmentFilter === 'all') return customerData.shipments;
    return customerData.shipments.filter(shipment => shipment.status === shipmentFilter);
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-6" role="alert">
      <p className="font-bold">Error</p>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-800 mb-2">Customer Dashboard</h1>
          <p className="text-gray-600">Welcome back, {customerData.customer_info.full_name}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center"
                >
         
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Name:</span>
                  <span className="text-gray-800">{customerData.customer_info.full_name}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Email:</span>
                  <span className="text-gray-800">{customerData.customer_info.email}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Phone:</span>
                  <span className="text-gray-800">{customerData.customer_info.phone}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Company:</span>
                  <span className="text-gray-800">{customerData.customer_info.company_name || 'Not specified'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Tax ID:</span>
                  <span className="text-gray-800">{customerData.customer_info.tax_id || 'Not specified'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Credit Limit:</span>
                  <span className="text-gray-800">₹{customerData.customer_info.credit_limit.toLocaleString()}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-500 w-32">Payment Terms:</span>
                  <span className="text-gray-800">{customerData.customer_info.payment_terms || 'Standard'}</span>
                </div>
              </div>
            </div>
            
            {/* Shipment Summary Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Shipment Summary</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-purple-600">
                    {customerData.shipments.length}
                  </span>
                  <span className="text-sm text-gray-600">Total Shipments</span>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-green-600">
                    {customerData.shipments.filter(s => s.status === 'delivered').length}
                  </span>
                  <span className="text-sm text-gray-600">Delivered</span>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-yellow-600">
                    {customerData.shipments.filter(s => ['pending', 'picked_up', 'in_transit'].includes(s.status)).length}
                  </span>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <span className="block text-3xl font-bold text-red-600">
                    {customerData.shipments.filter(s => s.status === 'returned').length}
                  </span>
                  <span className="text-sm text-gray-600">Returned</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Shipments Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">My Shipments</h2>
                
                <div className="flex">
                  <select
                    value={shipmentFilter}
                    onChange={(e) => setShipmentFilter(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Shipments</option>
                    <option value="pending">Pending</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
              </div>
              
              {filteredShipments().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No shipments found matching your filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Delivery</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredShipments().map((shipment) => (
                        <tr key={shipment.shipment_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                            {shipment.tracking_number}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{shipment.origin}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{shipment.destination}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(shipment.created_at)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(shipment.estimated_delivery)}</td>
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
            
            {/* Shipment Items Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Shipment Items</h2>
              
              {!customerData.shipment_items || customerData.shipment_items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No shipment items found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerData.shipment_items.slice(0, 6).map((item) => (
                    <div key={item.item_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="font-medium text-purple-700 mb-2">{item.description}</div>
                      <div className="grid grid-cols-2 gap-x-4 text-sm">
                        <div className="text-gray-600">Quantity:</div>
                        <div className="text-gray-900">{item.quantity}</div>
                        
                        <div className="text-gray-600">Weight:</div>
                        <div className="text-gray-900">{item.weight} kg</div>
                        
                        <div className="text-gray-600">Volume:</div>
                        <div className="text-gray-900">{item.volume} m³</div>
                        
                        <div className="text-gray-600">Value:</div>
                        <div className="text-gray-900">₹{item.item_value.toLocaleString()}</div>
                        
                        {item.is_fragile && (
                          <div className="col-span-2 mt-2">
                            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded">Fragile</span>
                          </div>
                        )}
                        
                        {item.is_hazardous && (
                          <div className="col-span-2 mt-2">
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">Hazardous</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Profile</h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={editFormData.company_name}
                  onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                <input
                  type="text"
                  value={editFormData.tax_id}
                  onChange={(e) => setEditFormData({ ...editFormData, tax_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;