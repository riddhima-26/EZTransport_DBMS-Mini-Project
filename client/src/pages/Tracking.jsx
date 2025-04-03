import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Tracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/tracking');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching tracking events:', error);
        setError('Failed to load tracking events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-800 mb-6">Tracking Events</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Event ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Shipment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((event) => (
                <tr key={event.event_id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.event_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.shipment_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      event.event_type === 'pickup' ? 'bg-green-100 text-green-800' :
                      event.event_type === 'departure' ? 'bg-blue-100 text-blue-800' :
                      event.event_type === 'arrival' ? 'bg-purple-100 text-purple-800' :
                      event.event_type === 'issue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {event.notes && event.notes.trim() !== '' ? (
                      <button
                        className="text-purple-600 hover:text-purple-800 transition-colors"
                        onClick={() => {
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                          modal.innerHTML = `
                            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                              <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold text-purple-800">Event Notes</h3>
                                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                  <i class="fas fa-times"></i>
                                </button>
                              </div>
                              <p class="text-gray-700">${event.notes}</p>
                            </div>
                          `;
                          document.body.appendChild(modal);
                        }}
                        title="View Notes"
                      >
                        <i className="fas fa-sticky-note text-lg"></i>
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage} 
          totalItems={data.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage} 
        />
      </div>
    </div>
  );
} 