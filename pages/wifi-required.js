// pages/wifi-required.js or pages/table/wifi-required.js

import React from 'react';

export default function WifiRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-700 mt-4">
          You must be connected to the café Wi-Fi to access the menu.
        </p>
   {wifiName && wifiPassword ? (
          <div className="bg-gray-100 rounded-lg p-4 text-left mb-6">
            <p className="text-sm text-gray-600 mb-1">Wi-Fi Details:</p>
            <p><strong className="text-gray-700">Name:</strong> <span className="text-blue-600">{wifiName}</span></p>
            <p><strong className="text-gray-700">Password:</strong> <span className="text-blue-600">{wifiPassword}</span></p>
          </div>
        ) : (
          <p className="text-gray-500 mb-6">Wi-Fi credentials not found.</p>
        )}


      </div>
    </div>
  );
}
