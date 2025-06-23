    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-700 mb-6">
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

        <button
          onClick={() => {
            window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg transition"
        >
          Open Wi-Fi Settings
        </button>
      </div>
    </div>
