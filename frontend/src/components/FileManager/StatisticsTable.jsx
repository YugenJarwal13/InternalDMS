import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';

// Mock data for testing when backend is not available
const MOCK_DATA = [
  {
    folder_name: "Documents",
    path: "/Documents",
    subfolder_count: 5,
    file_count: 12,
    total_size: 1024 * 1024 * 3.2,
    size_formatted: "3.2 MB",
    owner: "admin@example.com"
  },
  {
    folder_name: "Images",
    path: "/Images",
    subfolder_count: 8,
    file_count: 45,
    total_size: 1024 * 1024 * 15.7,
    size_formatted: "15.7 MB",
    owner: "user@example.com"
  },
  {
    folder_name: "Projects",
    path: "/Projects",
    subfolder_count: 12,
    file_count: 78,
    total_size: 1024 * 1024 * 250,
    size_formatted: "250.0 MB",
    owner: "admin@example.com"
  }
];

const StatisticsTable = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('folder_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        const data = await authFetch(`/api/folders/statistics`);
        setStatistics(data.statistics);
        setUseMockData(false);
      } catch (err) {
        console.error('Error fetching real data, using mock data:', err);
        setStatistics(MOCK_DATA);
        setUseMockData(true);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in statistics component:', err);
      setError(err.message || 'Failed to load folder statistics');
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with ascending direction
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sort the statistics data
  const sortedStatistics = [...statistics].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'folder_name' || sortBy === 'owner') {
      // String comparison
      const valueA = (a[sortBy] || '').toLowerCase();
      const valueB = (b[sortBy] || '').toLowerCase();
      comparison = valueA.localeCompare(valueB);
    } else {
      // Numeric comparison
      comparison = a[sortBy] - b[sortBy];
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error: {error}
        <button 
          onClick={fetchStatistics}
          className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">Folder Statistics</h2>
      
      {useMockData && (
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Note: Using sample data. Connect to the backend for real-time statistics.
        </div>
      )}
      
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('folder_name')}
              >
                Folder Name {renderSortIcon('folder_name')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('owner')}
              >
                Owner {renderSortIcon('owner')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('subfolder_count')}
              >
                Subfolders {renderSortIcon('subfolder_count')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('file_count')}
              >
                Files {renderSortIcon('file_count')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('total_size')}
              >
                Size {renderSortIcon('total_size')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStatistics.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No folders found in this location
                </td>
              </tr>
            ) : (
              sortedStatistics.map((folder, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {folder.folder_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{folder.owner || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{folder.subfolder_count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{folder.file_count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{folder.size_formatted}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatisticsTable;
