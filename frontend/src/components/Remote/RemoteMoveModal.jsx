import { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';

const RemoteMoveModal = ({ isOpen, onClose, remoteBaseUrl, path, isFolder, onMoveSuccess }) => {
  const [destination, setDestination] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    if (isOpen && remoteBaseUrl) {
      fetchFolders('/');
    }
  }, [isOpen, remoteBaseUrl]);

  const fetchFolders = async (parentPath) => {
    try {
      const data = await authFetch(`/api/remote/list?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(parentPath)}`);
      setFolders(data.filter(f => f.is_folder));
    } catch {
      setFolders([]);
    }
  };

  const handleMove = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('remote_base_url', remoteBaseUrl);
    formData.append('source_path', path);
    formData.append('destination_path', destination);
    try {
      await authFetch('/api/remote/move', {
        method: 'POST',
        body: formData,
        headers: {},
      });
      onMoveSuccess();
      onClose();
    } catch (err) {
      setError('Move failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Move {isFolder ? 'Folder' : 'File'} (Remote)</h3>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <form onSubmit={handleMove}>
          <label className="block mb-2 font-medium">Destination Folder</label>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
            required
          >
            <option value="/">/ (Root)</option>
            {folders.map(f => (
              <option key={f.path} value={f.path}>{f.path}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Moving...' : 'Move'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RemoteMoveModal; 