import React from 'react';

export default function ShipmentStats({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipment Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{data?.total || 0}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-600">{data?.pending || 0}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{data?.inTransit || 0}</p>
          <p className="text-sm text-gray-600">In Transit</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-600">{data?.delivered || 0}</p>
          <p className="text-sm text-gray-600">Delivered</p>
        </div>
      </div>
    </div>
  );
} 