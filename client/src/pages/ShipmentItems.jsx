import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function ShipmentItems() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [formData, setFormData] = useState({
    shipment_id: '',
    description: '',
    quantity: 1,
    weight: 0,
    volume: 0,
    item_value: 0,
    is_hazardous: 0,
    is_fragile: 0
  });

  useEffect(() => {
    fetchData();
    fetchShipments();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shipment-items');
      console.log('API Response:', response.data); // Debug log
      setData(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching shipment items:', error);
      setError('Failed to load shipment items');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    try {
      const response = await api.get('/shipments');
      setShipments(response.data || []);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      shipment_id: '',
      description: '',
      quantity: 1,
      weight: 0,
      volume: 0,
      item_value: 0,
      is_hazardous: 0,
      is_fragile: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      shipment_id: item.shipment_id,
      description: item.description,
      quantity: item.quantity,
      weight: item.weight,
      volume: item.volume,
      item_value: item.item_value,
      is_hazardous: item.is_hazardous,
      is_fragile: item.is_fragile
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this shipment item?')) {
      try {
        await api.delete(`/shipment-items/${itemId}`);
        setData(data.filter(item => item.item_id !== itemId));
      } catch (err) {
        console.error('Error deleting shipment item:', err);
        setError(err.response?.data?.error || 'Failed to delete shipment item');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/shipment-items/${editingItem.item_id}`, formData);
        fetchData(); // Refresh data after update
      } else {
        await api.post('/shipment-items', formData);
        fetchData(); // Refresh data after create
      }
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || (editingItem ? 'Failed to update item' : 'Failed to create item'));
    }
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-purple-900">Shipment Items</h2>
        <button 
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          <i className="fas fa-plus mr-2"></i> Add Item
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Item ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Shipment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Weight (kg)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Volume (m³)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Handling</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((item) => (
                <tr key={item.item_id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.item_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.shipment_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.weight}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.volume}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.item_value?.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {item.is_hazardous === 1 ? (
                        <span className="text-red-600" title="Hazardous Material">
                          <i className="fas fa-radiation-alt"></i>
                        </span>
                      ) : null}
                      {item.is_fragile === 1 ? (
                        <span className="text-yellow-600" title="Fragile Item">
                          <i className="fas fa-wine-glass"></i>
                        </span>
                      ) : null}
                      {item.is_hazardous === 0 && item.is_fragile === 0 ? (
                        <span className="text-green-600" title="Standard Handling">
                          <i className="fas fa-check"></i>
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(item.item_id)}
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
        totalItems={data.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Shipment Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingItem ? 'Edit Shipment Item' : 'Add New Shipment Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Shipment</label>
                <select
                  value={formData.shipment_id}
                  onChange={(e) => setFormData({ ...formData, shipment_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                >
                  <option value="">Select Shipment</option>
                  {shipments.map((shipment) => (
                    <option key={shipment.shipment_id} value={shipment.shipment_id}>
                      ID: {shipment.shipment_id} - Tracking: {shipment.tracking_number}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Volume (m³)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.item_value}
                  onChange={(e) => setFormData({ ...formData, item_value: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    id="is_hazardous"
                    type="checkbox"
                    checked={formData.is_hazardous === 1}
                    onChange={(e) => setFormData({ ...formData, is_hazardous: e.target.checked ? 1 : 0 })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_hazardous" className="ml-2 block text-sm text-gray-700">
                    Hazardous Material
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="is_fragile"
                    type="checkbox"
                    checked={formData.is_fragile === 1}
                    onChange={(e) => setFormData({ ...formData, is_fragile: e.target.checked ? 1 : 0 })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_fragile" className="ml-2 block text-sm text-gray-700">
                    Fragile Item
                  </label>
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
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}