import { useEffect, useState, useContext } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await authFetch('/api/logs/');
        setLogs(data);
      } catch {
        setError('Failed to fetch activity logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user]);

  if (user?.role !== 'admin') {
    return <div className="text-red-500">Access denied. Admins only.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Activity Log</h2>
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
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">No activity found.</td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 border">{formatToLocalTime(log.timestamp)}</td>
                <td className="px-4 py-2 border">{log.user_email || log.user_id}</td>
                <td className="px-4 py-2 border">{log.action}</td>
                <td className="px-4 py-2 border">{log.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLog; 