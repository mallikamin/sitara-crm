import React from 'react';
import { useData } from '../contexts/DataContextAPI';

export function MigrationButton() {
  const { apiAvailable, migrationStatus, triggerMigration } = useData();
  const [hasLocalData, setHasLocalData] = React.useState(false);

  React.useEffect(() => {
    const checkLocalData = () => {
      const data = localStorage.getItem('sitara_crm_data');
      const migrated = localStorage.getItem('sitara_crm_migrated');
      setHasLocalData(!!data && !migrated);
    };
    checkLocalData();
    // Check every second
    const interval = setInterval(checkLocalData, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!apiAvailable) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        ⚠️ API not available. Please ensure the backend is running.
      </div>
    );
  }

  if (!hasLocalData) {
    return (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
        ℹ️ No localStorage data found. You're using the database directly.
      </div>
    );
  }

  return (
    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      <div className="flex items-center justify-between">
        <div>
          <strong>📦 Data Migration Available</strong>
          <p className="text-sm mt-1">
            We found data in localStorage. Click the button below to migrate it to the database.
          </p>
        </div>
        <button
          onClick={triggerMigration}
          disabled={migrationStatus === 'migrating'}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded ml-4"
        >
          {migrationStatus === 'migrating' ? '🔄 Migrating...' : '🚀 Migrate Data'}
        </button>
      </div>
      {migrationStatus === 'migrating' && (
        <div className="mt-2 text-sm">Migration in progress... Please wait.</div>
      )}
    </div>
  );
}

