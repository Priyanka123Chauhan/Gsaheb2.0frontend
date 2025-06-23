
import React, { useEffect, useState } from 'react';

export default function WifiRequired() {
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  useEffect(() => {
    setWifiName(localStorage.getItem('wifi_name') || '');
    setWifiPassword(localStorage.getItem('wifi_password') || '');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-indigo-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center w-full max-w-md transition-all duration-300">
        <h2 className="text-3xl font-extrabold text-red-600 mb-3">Access Denied</h2>
        <p className="text-gray-700 text-base mb-6">
          You must be connected to the café Wi-Fi to access the menu.
        </p>

        {wifiName && wifiPassword ? (
          <div className="bg-gray-100 p-5 rounded-xl text-left shadow-inner mb-6 border border-blue-200">
            <p className="text-sm font-semibold text-gray-500 mb-2">Café Wi-Fi Details</p>
            <div className="mb-2">
              <span className="text-gray-700 font-medium">Wi-Fi Name:</span>{' '}
              <span className="text-blue-700 font-semibold">{wifiName}</span>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Password:</span>{' '}
              <span className="text-blue-700 font-semibold">{wifiPassword}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">Wi-Fi credentials are not available at the moment.</p>
        )}

        <button
          onClick={() => {
            window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full transition-all duration-200 shadow-md"
        >
          Open Wi-Fi Settings
        </button>
      </div>
    </div>
  );
}

// // pages/wifi-required.js or pages/table/wifi-required.js

// import React from 'react';

// export default function WifiRequired() {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="bg-white p-6 rounded-lg shadow-lg text-center">
//         <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
//         <p className="text-gray-700 mt-4">
//           You must be connected to the café Wi-Fi to access the menu.
//         </p>
//     <button
//   onClick={() => {
//     window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
//   }}
//   className="bg-blue-600 text-white px-4 py-2 rounded"
// >
//   Open Wi-Fi Settings
// </button>

//       </div>
//     </div>
//   );
// }
