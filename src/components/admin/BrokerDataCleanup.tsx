import { useState } from 'react';
import { cleanUpBrokerData, verifyBrokerData } from '../../utils/brokerMigration';

export const BrokerDataCleanup = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);

  const handleCleanup = async () => {
    if (!window.confirm('This will clean up any remaining broker data. Make sure you have a backup!')) {
      return;
    }

    setIsRunning(true);
    setResults(null);
    
    try {
      const result = await cleanUpBrokerData();
      setResults(result);
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleVerify = async () => {
    const result = await verifyBrokerData();
    setVerification(result);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Broker Data Cleanup</h3>
      <p className="text-sm text-gray-600 mb-4">
        This tool helps clean up any remaining broker data that wasn't migrated properly.
      </p>

      <div className="space-y-3">
        <button
          onClick={handleVerify}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Verify Data Consistency
        </button>

        <button
          onClick={handleCleanup}
          disabled={isRunning}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {isRunning ? 'Running Cleanup...' : 'Run Data Cleanup'}
        </button>
      </div>

      {verification && (
        <div className="mt-4 p-3 border rounded">
          <h4 className="font-medium mb-2">Verification Results</h4>
          <div className={verification.consistent ? 'text-green-600' : 'text-red-600'}>
            {verification.consistent ? '✅ Data is consistent' : '⚠️ Issues found'}
          </div>
          {verification.issues.map((issue, index) => (
            <div key={index} className="mt-2 p-2 bg-red-50 text-sm">
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {results && (
        <div className="mt-4 p-3 border rounded">
          <h4 className="font-medium mb-2">Cleanup Results</h4>
          {results.error ? (
            <div className="text-red-600">{results.error}</div>
          ) : (
            <>
              <div className="text-green-600">
                ✅ Migrated {results.migrated} brokers
              </div>
              {results.errors.length > 0 && (
                <div className="mt-2">
                  <h5 className="font-medium">Errors:</h5>
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600">{error}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};