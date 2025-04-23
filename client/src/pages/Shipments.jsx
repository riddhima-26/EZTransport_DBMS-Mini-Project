import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [formData, setFormData] = useState({
    tracking_number: '',
    customer_id: '',
    origin_id: '',
    destination_id: '',
    route_id: '',
    vehicle_id: '',
    driver_id: '',
    status: 'pending',
    total_weight: '',
    total_volume: '',
    shipment_value: '',
    insurance_required: false,
    special_instructions: '',
    pickup_date: '',
    estimated_delivery: ''
  });

  useEffect(() => {
    fetchShipments();
    fetchCustomers();
    fetchLocations();
    fetchVehicles();
    fetchDrivers();
    fetchRoutes();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shipments');
      
      if (response.data) {
        setShipments(response.data);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
        setError('');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to load shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      if (response.data) {
        setLocations(response.data);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      if (response.data) {
        setVehicles(response.data);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      if (response.data && response.data.drivers) {
        setDrivers(response.data.drivers);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      if (response.data) {
        setRoutes(response.data);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
    }
  };

  const generateTrackingNumber = () => {
    const prefix = 'TL';
    const timestamp = new Date().getTime().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const handleCreate = () => {
    setEditingShipment(null);
    setFormData({
      tracking_number: generateTrackingNumber(),
      customer_id: '',
      origin_id: '',
      destination_id: '',
      route_id: '',
      vehicle_id: '',
      driver_id: '',
      status: 'pending',
      total_weight: '',
      total_volume: '',
      shipment_value: '',
      insurance_required: false,
      special_instructions: '',
      pickup_date: '',
      estimated_delivery: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (shipment) => {
    setEditingShipment(shipment);
    setFormData({
      tracking_number: shipment.tracking_number,
      customer_id: shipment.customer_id,
      origin_id: shipment.origin_id,
      destination_id: shipment.destination_id,
      route_id: shipment.route_id || '',
      vehicle_id: shipment.vehicle_id || '',
      driver_id: shipment.driver_id || '',
      status: shipment.status,
      total_weight: shipment.total_weight,
      total_volume: shipment.total_volume,
      shipment_value: shipment.shipment_value,
      insurance_required: shipment.insurance_required ? true : false,
      special_instructions: shipment.special_instructions || '',
      pickup_date: shipment.pickup_date ? shipment.pickup_date.split('T')[0] : '',
      estimated_delivery: shipment.estimated_delivery ? shipment.estimated_delivery.split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (shipmentId) => {
    if (window.confirm('Are you sure you want to delete this shipment? This will also delete all related shipment items and tracking events.')) {
      try {
        await api.delete(`/shipments/${shipmentId}`);
        setShipments(shipments.filter(shipment => shipment.shipment_id !== shipmentId));
      } catch (err) {
        console.error('Error deleting shipment:', err);
        setError(err.response?.data?.error || 'Failed to delete shipment');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert string values to appropriate types
      const shipmentData = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        origin_id: parseInt(formData.origin_id),
        destination_id: parseInt(formData.destination_id),
        route_id: formData.route_id ? parseInt(formData.route_id) : null,
        vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null,
        driver_id: formData.driver_id ? parseInt(formData.driver_id) : null,
        total_weight: parseFloat(formData.total_weight),
        total_volume: parseFloat(formData.total_volume),
        shipment_value: parseFloat(formData.shipment_value),
        insurance_required: formData.insurance_required ? 1 : 0
      };

      if (editingShipment) {
        await api.put(`/shipments/${editingShipment.shipment_id}`, shipmentData);
        setShipments(shipments.map(shipment => 
          shipment.shipment_id === editingShipment.shipment_id ? { ...shipment, ...shipmentData } : shipment
        ));
      } else {
        const response = await api.post('/shipments', shipmentData);
        setShipments([...shipments, { ...shipmentData, shipment_id: response.data.shipment_id }]);
      }
      setIsModalOpen(false);
      setError('');
      fetchShipments(); // Refresh the list to get the complete data
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || (editingShipment ? 'Failed to update shipment' : 'Failed to create shipment'));
    }
  };

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.location_id === locationId);
    return location ? `${location.city}, ${location.state}` : 'Unknown';
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(cust => cust.customer_id === customerId);
    return customer ? customer.company_name || customer.full_name : 'Unknown';
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

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  // Calculate current page items
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentShipments = shipments.slice(startIndex, endIndex);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-800">Shipments</h1>
        <button 
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          <i className="fas fa-plus mr-2"></i> Add Shipment
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Tracking #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Origin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentShipments.map((shipment) => (
                <tr key={shipment.shipment_id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {shipment.tracking_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCustomerName(shipment.customer_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.origin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.destination}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(shipment.status)}`}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(shipment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(shipment)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(shipment.shipment_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalItems={shipments.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Shipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingShipment ? 'Edit Shipment' : 'Add New Shipment'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tracking Number</label>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                    readOnly={editingShipment}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.company_name || customer.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origin</label>
                  <select
                    value={formData.origin_id}
                    onChange={(e) => setFormData({ ...formData, origin_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Origin</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.city}, {location.state} - {location.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Destination</label>
                  <select
                    value={formData.destination_id}
                    onChange={(e) => setFormData({ ...formData, destination_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Destination</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.city}, {location.state} - {location.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Route (Optional)</label>
                  <select
                    value={formData.route_id}
                    onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select Route</option>
                    {routes.map((route) => (
                      <option key={route.route_id} value={route.route_id}>
                        {route.route_name} ({route.start_location} to {route.end_location})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle (Optional)</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => v.status === 'available').map((vehicle) => (
                      <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                        {vehicle.license_plate} - {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver (Optional)</label>
                  <select
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select Driver</option>
                    {drivers.filter(d => d.status === 'available').map((driver) => (
                      <option key={driver.driver_id} value={driver.driver_id}>
                        {driver.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_weight}
                    onChange={(e) => setFormData({ ...formData, total_weight: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Volume (m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_volume}
                    onChange={(e) => setFormData({ ...formData, total_volume: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shipment Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipment_value}
                    onChange={(e) => setFormData({ ...formData, shipment_value: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="insurance_required"
                    checked={formData.insurance_required}
                    onChange={(e) => setFormData({ ...formData, insurance_required: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="insurance_required" className="ml-2 block text-sm text-gray-900">
                    Insurance Required
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                  <textarea
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pickup Date</label>
                  <input
                    type="datetime-local"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Delivery</label>
                  <input
                    type="datetime-local"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  {editingShipment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}