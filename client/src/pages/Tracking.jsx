import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Pagination from '../components/Pagination';

const Tracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [shipmentId, setShipmentId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState('id'); // 'id' or 'tracking'
  const [events, setEvents] = useState([]);
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

  // Parse query parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const tracking = params.get('tracking');

    if (id) {
      setShipmentId(id);
      setSearchMode('id');
      handleSearch('id', id);
    } else if (tracking) {
      setTrackingNumber(tracking);
      setSearchMode('tracking');
      handleSearch('tracking', tracking);
    }
  }, [location.search]);

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

  const handleSearch = async (mode, value) => {
    if (!value) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Search by shipment ID or tracking number
      let shipmentResponse;
      if (mode === 'id') {
        shipmentResponse = await api.get(`/shipments/${value}`);
      } else {
        // Use the new tracking number endpoint
        shipmentResponse = await api.get(`/shipments/tracking/${value}`);
      }
      
      if (!shipmentResponse.data || (Array.isArray(shipmentResponse.data) && shipmentResponse.data.length === 0)) {
        setError('Shipment not found');
        setShipment(null);
        setTrackingEvents([]);
        setLoading(false);
        return;
      }
      
      const shipmentData = Array.isArray(shipmentResponse.data) ? shipmentResponse.data[0] : shipmentResponse.data;
      setShipment(shipmentData);
      
      // Get tracking events for the shipment
      const eventsResponse = await api.get(`/shipment/${shipmentData.shipment_id}/tracking`);
      setTrackingEvents(eventsResponse.data || []);
      
    } catch (err) {
      console.error('Error fetching shipment tracking:', err);
      setError('Failed to load tracking information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchMode === 'id') {
      handleSearch('id', shipmentId);
    } else {
      handleSearch('tracking', trackingNumber);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pickup':
        return <i className="fas fa-box text-blue-500"></i>;
      case 'departure':
        return <i className="fas fa-warehouse text-purple-500"></i>;
      case 'arrival':
        return <i className="fas fa-building text-indigo-500"></i>;
      case 'delivery':
        return <i className="fas fa-truck-loading text-green-500"></i>;
      case 'issue':
        return <i className="fas fa-exclamation-triangle text-red-500"></i>;
      case 'delay':
        return <i className="fas fa-clock text-yellow-500"></i>;
      default:
        return <i className="fas fa-circle text-gray-500"></i>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'returned':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calculate pagination
  const indexOfLastEvent = currentPage * itemsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);

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

  const handleSubmitForm = async (e) => {
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Shipment Tracking</h1>
      
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="flex space-x-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search By</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="searchMode"
                    checked={searchMode === 'id'}
                    onChange={() => setSearchMode('id')}
                  />
                  <span className="ml-2">Shipment ID</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="searchMode"
                    checked={searchMode === 'tracking'}
                    onChange={() => setSearchMode('tracking')}
                  />
                  <span className="ml-2">Tracking Number</span>
                </label>
              </div>
            </div>
          </div>
          
          {searchMode === 'id' ? (
            <div className="mb-4">
              <label htmlFor="shipmentId" className="block text-sm font-medium text-gray-700 mb-1">
                Shipment ID
              </label>
              <input
                type="text"
                id="shipmentId"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter shipment ID"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number
              </label>
              <input
                type="text"
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter tracking number"
              />
            </div>
          )}
          
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading...
              </span>
            ) : (
              'Track Shipment'
            )}
          </button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          <div className="flex">
            <i className="fas fa-exclamation-circle mt-1 mr-2"></i>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {shipment && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Shipment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tracking Number</dt>
                  <dd className="text-base font-semibold text-gray-900">{shipment.tracking_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(shipment.status)}`}>
                      {shipment.status?.replace('_', ' ')}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                  <dd className="text-base text-gray-900">
                    {new Date(shipment.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Origin</dt>
                  <dd className="text-base text-gray-900">{shipment.origin}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Destination</dt>
                  <dd className="text-base text-gray-900">{shipment.destination}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estimated Delivery</dt>
                  <dd className="text-base text-gray-900">
                    {shipment.estimated_delivery 
                      ? new Date(shipment.estimated_delivery).toLocaleDateString() 
                      : 'Not available'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
      
      {shipment && trackingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Tracking Timeline</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {trackingEvents.map((event, eventIdx) => (
                <li key={event.event_id}>
                  <div className="relative pb-8">
                    {eventIdx !== trackingEvents.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      ></span>
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-100">
                          {getStatusIcon(event.event_type)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1).replace('_', ' ')}
                            {event.location ? ` at ${event.location}` : ''}
                          </p>
                          {event.notes && (
                            <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                          )}
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <div>
                            {new Date(event.event_timestamp).toLocaleDateString()}
                          </div>
                          <div>
                            {new Date(event.event_timestamp).toLocaleTimeString()}
                          </div>
                          {event.recorded_by && (
                            <div className="text-xs text-gray-400 mt-1">
                              By: {event.recorded_by}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
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
            <form onSubmit={handleSubmitForm} className="space-y-4">
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
};

export default Tracking;