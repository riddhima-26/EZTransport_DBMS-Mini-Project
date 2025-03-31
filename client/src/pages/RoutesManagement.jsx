import { useState, useEffect } from 'react';
import api from '../services/api';

export default function RoutesManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/routes');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching routes:', error);
        setError('Failed to load routes');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-800 mb-6">Routes</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Start Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">End Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Distance (km)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Duration (hrs)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((route) => (
                <tr key={route.id} className="hover:bg-purple-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.start_location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.end_location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.distance}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 