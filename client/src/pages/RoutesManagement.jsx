import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function RoutesManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    route_name: '',
    origin_id: '',
    destination_id: '',
    distance_km: '',
    estimated_duration_min: '',
    status: 'active',
    hazard_level: 'low'
  });

  useEffect(() => {
    fetchRoutes();
    fetchLocations();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/routes');
      setData(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to load routes');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleCreate = () => {
    setEditingRoute(null);
    setFormData({
      route_name: '',
      origin_id: '',
      destination_id: '',
      distance_km: '',
      estimated_duration_min: '',
      status: 'active',
      hazard_level: 'low'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    const originId = route.origin_id || '';
    const destinationId = route.destination_id || '';

    setFormData({
      route_name: route.route_name || '',
      origin_id: originId,
      destination_id: destinationId,
      distance_km: route.distance_km || '',
      estimated_duration_min: route.estimated_duration_min || route.duration * 60 || '',
      status: route.status || 'active',
      hazard_level: route.hazard_level || 'low'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (routeId) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await api.delete(`/routes/${routeId}`);
        setData(data.filter(route => route.route_id !== routeId));
      } catch (err) {
        console.error('Error deleting route:', err);
        setError(err.response?.data?.error || 'Failed to delete route');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoute) {
        await api.put(`/routes/${editingRoute.route_id}`, formData);
        fetchRoutes();
      } else {
        await api.post('/routes', formData);
        fetchRoutes();
      }
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || (editingRoute ? 'Failed to update route' : 'Failed to create route'));
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-purple-900">Routes Management</h2>
        <button 
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          <i className="fas fa-plus mr-2"></i> Add Route
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Route ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Route Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Start Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">End Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Distance (km)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Duration (hrs)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Hazard Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((route) => (
                <tr key={route.route_id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.route_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {route.route_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.start_location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.end_location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.distance_km}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {route.estimated_duration_min 
                      ? (route.estimated_duration_min / 60).toFixed(1) 
                      : route.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {route.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      route.hazard_level === 'high' ? 'bg-red-100 text-red-800' :
                      route.hazard_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {route.hazard_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(route)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(route.route_id)}
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingRoute ? 'Edit Route' : 'Add New Route'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Route Name</label>
                <input
                  type="text"
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
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
                <label className="block text-sm font-medium text-gray-700">Distance (km)</label>
                <input
                  type="number"
                  step="0.01" 
                  min="0"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.estimated_duration_min}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_min: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Hazard Level</label>
                <select
                  value={formData.hazard_level}
                  onChange={(e) => setFormData({ ...formData, hazard_level: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
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
                  {editingRoute ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}