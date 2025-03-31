import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShipments = shipments.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const response = await api.get('/shipments');
        setShipments(response.data);
      } catch (err) {
        setError(err);
        setError('Failed to fetch shipments');
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shipment?')) {
      try {
        await api.delete(`/shipments/${id}`);
        setShipments(shipments.filter(shipment => shipment.id !== id));
      } catch (err) {
        setError(err);
        setError('Failed to delete shipment');
      }
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-800">Shipments</h1>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
          <i className="fas fa-plus mr-2"></i> New Shipment
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Tracking #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Origin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentShipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {shipment.tracking_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.origin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.destination}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900 mr-3">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDelete(shipment.id)}
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
    </div>
  );
}