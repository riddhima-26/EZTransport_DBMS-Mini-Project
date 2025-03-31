import React from 'react';

export default function VehicleStats({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Status</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{data?.total || 0}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{data?.available || 0}</p>
          <p className="text-sm text-gray-600">Available</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-600">{data?.inMaintenance || 0}</p>
          <p className="text-sm text-gray-600">In Maintenance</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-600">{data?.inUse || 0}</p>
          <p className="text-sm text-gray-600">In Use</p>
        </div>
      </div>
    </div>
  );
} 