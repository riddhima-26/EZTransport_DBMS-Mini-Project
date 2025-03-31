import React from 'react';

export default function RecentActivity({ activities }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities?.map((activity) => (
          <div key={activity.event_id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${getEventTypeColor(activity.event_type)}`}></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                {formatEventType(activity.event_type)} - {activity.tracking_number}
              </p>
              <p className="text-xs text-gray-500">
                {activity.location} • {formatDate(activity.event_timestamp)}
              </p>
            </div>
            <div className="text-xs text-gray-500">
              by {activity.recorded_by}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEventTypeColor(type) {
  switch (type) {
    case 'pickup': return 'bg-green-500';
    case 'delivery': return 'bg-blue-500';
    case 'delay': return 'bg-yellow-500';
    case 'issue': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function formatEventType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
} 