import React from 'react';

export default function PerformanceMetrics({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">On-Time Delivery</span>
            <span className="text-sm font-medium text-blue-600">92%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">Vehicle Utilization</span>
            <span className="text-sm font-medium text-green-600">85%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">Customer Satisfaction</span>
            <span className="text-sm font-medium text-purple-600">4.8/5</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '96%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
} 