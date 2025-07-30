import { useEffect, useState, useContext, useRef } from 'react';
import { authFetch } from '../../utils/authFetch';
import { UserContext } from '../../context/UserContext';

function formatToLocalTime(val) {
  if (!val) return '';
  // If it's a number or numeric string, treat as UNIX timestamp (seconds)
  if (!isNaN(val) && typeof val !== 'object') {
    const date = new Date(Number(val) * 1000);
    return date.toLocaleString();
  }
  // If it's an ISO string without timezone, treat as UTC
  let iso = val;
  if (typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')) {
    iso += 'Z';
  }
  const date = new Date(iso);
  return isNaN(date) ? '' : date.toLocaleString();
}

const ActivityLog = () => {
  const { user } = useContext(UserContext);
  const [logs, setLogs] = useState([]);
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await authFetch('/api/logs/');
        setLogs(data);
        setDisplayedLogs(data); // Show recent logs by default
      } catch {
        setError('Failed to fetch activity logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user]);

  // Search functionality with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery.trim());
      } else if (searchQuery.trim().length === 0) {
        // Show recent logs when search is empty
        setDisplayedLogs(logs);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, logs]);

  const performSearch = async (query) => {
    setSearchLoading(true);
    try {
      const results = await authFetch(`/api/logs/search?query=${encodeURIComponent(query)}`);
      setDisplayedLogs(results);
    } catch (err) {
      console.error('Search failed:', err);
      setDisplayedLogs([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDisplayedLogs(logs); // Reset to recent logs
  };

  const highlightMatch = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (user?.role !== 'admin') {
    return <div className="text-red-500">Access denied. Admins only.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Activity Log</h2>
        <span className="text-blue-600 font-semibold ml-4">
          {searchQuery ? `[${displayedLogs.length} search results]` : '[Most recent logs]'}
        </span>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by date/time, username, action, or details..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {searchLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            )}
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Timestamp</th>
              <th className="px-4 py-2 border">User</th>
              <th className="px-4 py-2 border">Action</th>
              <th className="px-4 py-2 border">Details</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Current Location</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-4">
                  {searchQuery ? 'No matching results found.' : 'No activity found.'}
                </td>
              </tr>
            )}
            {(searchQuery ? displayedLogs : displayedLogs.slice(0, 20)).map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border text-sm">
                  {searchQuery ? 
                    highlightMatch(formatToLocalTime(log.timestamp), searchQuery) : 
                    formatToLocalTime(log.timestamp)
                  }
                </td>
                <td className="px-4 py-2 border text-sm">
                  {searchQuery ? 
                    highlightMatch(log.user_email || log.user_id, searchQuery) : 
                    (log.user_email || log.user_id)
                  }
                </td>
                <td className="px-4 py-2 border text-sm">
                  {searchQuery ? 
                    highlightMatch(log.action, searchQuery) : 
                    log.action
                  }
                </td>
                <td className="px-4 py-2 border text-sm">
                  {searchQuery ? 
                    highlightMatch(log.details || '-', searchQuery) : 
                    (log.details || '-')
                  }
                </td>
                <td className="px-4 py-2 border text-sm">
                  {log.status ? (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.status === 'Present' ? 'bg-green-100 text-green-800' :
                      log.status === 'Deleted' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.status}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2 border text-sm">
                  {log.current_location ? (
                    <span 
                      className="text-blue-600 hover:text-blue-800 cursor-pointer font-mono text-xs"
                      title={log.current_location}
                    >
                      {log.current_location.length > 50 ? 
                        `...${log.current_location.slice(-50)}` : 
                        log.current_location
                      }
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLog; 