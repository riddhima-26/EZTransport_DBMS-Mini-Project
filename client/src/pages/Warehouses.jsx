import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    location_id: '',
    warehouse_name: '',
    capacity: 0,
    current_occupancy: 0,
    manager_id: '',
    operating_hours: ''
  });

  useEffect(() => {
    fetchWarehouses();
    fetchLocations();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/warehouses');
      setWarehouses(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setError('Failed to load warehouses');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.data.filter(loc => loc.location_type === 'warehouse') || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleCreate = () => {
    setEditingWarehouse(null);
    setFormData({
      location_id: '',
      warehouse_name: '',
      capacity: 0,
      current_occupancy: 0,
      manager_id: '',
      operating_hours: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    const warehouseId = warehouse.warehouse_id;
    
    api.get(`/warehouses/${warehouseId}`).then(response => {
      const warehouseData = response.data;
      setFormData({
        location_id: warehouseData.location_id || '',
        warehouse_name: warehouseData.warehouse_name || '',
        capacity: warehouseData.capacity || 0,
        current_occupancy: warehouseData.current_occupancy || 0,
        manager_id: warehouseData.manager_id || '',
        operating_hours: warehouseData.operating_hours || ''
      });
      setIsModalOpen(true);
    }).catch(err => {
      console.error('Error fetching warehouse details:', err);
      setFormData({
        location_id: '',
        warehouse_name: warehouse.warehouse_name || '',
        capacity: parseFloat(warehouse.capacity) || 0,
        current_occupancy: parseFloat(warehouse.status) || 0,
        manager_id: '',
        operating_hours: ''
      });
      setIsModalOpen(true);
    });
  };

  const handleDelete = async (warehouseId) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await api.delete(`/warehouses/${warehouseId}`);
        setWarehouses(warehouses.filter(warehouse => warehouse.warehouse_id !== warehouseId));
      } catch (err) {
        console.error('Error deleting warehouse:', err);
        setError(err.response?.data?.error || 'Failed to delete warehouse');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.warehouse_id}`, formData);
        fetchWarehouses();
      } else {
        await api.post('/warehouses', formData);
        fetchWarehouses();
        fetchLocations();
      }
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || (editingWarehouse ? 'Failed to update warehouse' : 'Failed to create warehouse'));
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWarehouses = warehouses.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-purple-900">Warehouses Management</h2>
        <button 
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          <i className="fas fa-plus mr-2"></i> Add Warehouse
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Current Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentWarehouses.map((warehouse) => (
                <tr key={warehouse.warehouse_id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{warehouse.warehouse_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {warehouse.warehouse_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{warehouse.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parseFloat(warehouse.capacity).toLocaleString()} m³
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-purple-600">
                            {(parseFloat(warehouse.status) / parseFloat(warehouse.capacity) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-purple-600">
                            {parseFloat(warehouse.status).toLocaleString()} / {parseFloat(warehouse.capacity).toLocaleString()} m³
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                        <div 
                          style={{ width: `${Math.min(parseFloat(warehouse.status) / parseFloat(warehouse.capacity) * 100, 100)}%` }} 
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(warehouse)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(warehouse.warehouse_id)}
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
        totalItems={warehouses.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingWarehouse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.city}, {location.state} - {location.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse Name</label>
                <input
                  type="text"
                  value={formData.warehouse_name}
                  onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity (m³)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Occupancy (m³)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={formData.capacity}
                    value={formData.current_occupancy}
                    onChange={(e) => setFormData({ ...formData, current_occupancy: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                <input
                  type="text"
                  placeholder="e.g., Mon-Fri: 8AM-6PM, Sat: 9AM-2PM"
                  value={formData.operating_hours}
                  onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager ID</label>
                <input
                  type="number"
                  min="1"
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="mt-1 text-sm text-gray-500">Enter the user ID of the warehouse manager</p>
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
                  {editingWarehouse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}