import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Tracking() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    shipment_id: '',
    event_type: 'pickup',
    location_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchShipments();
    fetchLocations();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tracking-events');
      setEvents(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching tracking events:', error);
      setError('Failed to load tracking events');
      setEvents([]);
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

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setFormData({
      shipment_id: '',
      event_type: 'pickup',
      location_id: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      shipment_id: event.shipment_id,
      event_type: event.event_type,
      location_id: event.location_id || '',
      notes: event.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this tracking event?')) {
      try {
        await api.delete(`/tracking-events/${eventId}`);
        setEvents(events.filter(event => event.event_id !== eventId));
      } catch (err) {
        console.error('Error deleting tracking event:', err);
        setError(err.response?.data?.error || 'Failed to delete tracking event');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await api.put(`/tracking-events/${editingEvent.event_id}`, formData);
        fetchEvents(); // Refresh data after update
      } else {
        await api.post('/tracking-events', formData);
        fetchEvents(); // Refresh data after create
      }
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || (editingEvent ? 'Failed to update event' : 'Failed to create event'));
    }
  };

  // Calculate pagination
  const indexOfLastEvent = currentPage * itemsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-800">Tracking Events</h1>
        <button 
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          <i className="fas fa-plus mr-2"></i> Add Event
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Event ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Shipment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEvents.map((event) => (
                <tr key={event.event_id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.event_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.shipment_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      event.event_type === 'pickup' ? 'bg-green-100 text-green-800' :
                      event.event_type === 'departure' ? 'bg-blue-100 text-blue-800' :
                      event.event_type === 'arrival' ? 'bg-purple-100 text-purple-800' :
                      event.event_type === 'delivery' ? 'bg-indigo-100 text-indigo-800' :
                      event.event_type === 'delay' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.event_timestamp ? new Date(event.event_timestamp).toLocaleString() : '-'}
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(event)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(event.event_id)}
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
        totalItems={events.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingEvent ? 'Edit Tracking Event' : 'Add New Tracking Event'}
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
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                >
                  <option value="pickup">Pickup</option>
                  <option value="departure">Departure</option>
                  <option value="arrival">Arrival</option>
                  <option value="delivery">Delivery</option>
                  <option value="delay">Delay</option>
                  <option value="issue">Issue</option>
                </select>
              </div>
              
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  rows={3}
                />
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
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}