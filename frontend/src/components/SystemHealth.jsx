import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

const SystemHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const data = await authFetch("http://localhost:8000/api/system/health");
      console.log("Health data received:", data);
      setHealthData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching system health:', err);
      setError(err.message || 'Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch health data immediately on component mount
    fetchHealthData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000);

    setRefreshInterval(interval);

    // Clean up on component unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  if (loading && !healthData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="flex justify-center">
          <div className="animate-pulse text-gray-400">Loading system health data...</div>
        </div>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="text-red-500 text-center">
          {error}
          <button 
            onClick={fetchHealthData}
            className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">System Health</h2>
        <button 
          onClick={fetchHealthData}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Server Status */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="text-blue-500 text-md font-medium mb-2">Server Uptime</div>
          <div className="text-xl font-bold">{healthData.server.uptime}</div>
          <div className="text-sm text-gray-500 mt-2">Response Time: {healthData.server.response_time}</div>
        </div>
        
        {/* Resource Usage */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <div className="text-green-500 text-md font-medium mb-2">Resource Usage</div>
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span>CPU:</span>
              <span className="font-medium">{healthData.resources.cpu_usage}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Memory:</span>
              <span className="font-medium">{healthData.resources.memory_usage}</span>
            </div>
            <div className="flex justify-between">
              <span>Storage:</span>
              <span className="font-medium">{healthData.resources.storage_usage}</span>
            </div>
          </div>
        </div>
        
        {/* System Load */}
        <div className={`${healthData.status.system_load.status === 'Normal' ? 'bg-purple-50 border-purple-100' : 'bg-yellow-50 border-yellow-100'} p-4 rounded-lg border`}>
          <div className={`${healthData.status.system_load.status === 'Normal' ? 'text-purple-500' : 'text-yellow-500'} text-md font-medium mb-2`}>System Load</div>
          <div className="text-xl font-bold">{healthData.status.system_load.status}</div>
          <div className="text-sm text-gray-500 mt-2">Load Average: {healthData.status.system_load.load_average}</div>
          <div className="text-sm text-gray-500">Process Uptime: {healthData.status.system_load.process_uptime}</div>
        </div>
        
        {/* Database Status */}
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <div className="text-indigo-500 text-md font-medium mb-2">Database Status</div>
          <div className="text-xl font-bold">{healthData.status.database.status}</div>
          <div className="text-sm text-gray-500 mt-2">Storage: {healthData.status.database.storage_size}</div>
          <div className="text-sm text-gray-500">Active Connections: {healthData.status.database.active_connections}</div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
