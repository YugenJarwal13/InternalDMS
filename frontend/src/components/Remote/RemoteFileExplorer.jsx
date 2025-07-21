import { useState } from 'react';
import { authFetch } from '../../utils/authFetch';
import RemoteUploadModal from './RemoteUploadModal';
import RemoteRenameModal from './RemoteRenameModal';
import RemoteMoveModal from './RemoteMoveModal';

const RemoteFileExplorer = () => {
  const [remoteBaseUrl, setRemoteBaseUrl] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(['/']);
  const [showUpload, setShowUpload] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);

  const fetchItems = async (path = currentPath) => {
    if (!remoteBaseUrl) return;
    setLoading(true);
    setError('');
    try {
      const data = await authFetch(`/api/remote/list?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(path)}`);
      setItems(data);
    } catch (err) {
      setError('Failed to load remote folder contents');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    setCurrentPath('/');
    setHistory(['/']);
    fetchItems('/');
  };

  const handleFolderClick = (path) => {
    setCurrentPath(path);
    setHistory((prev) => [...prev, path]);
    fetchItems(path);
  };

  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevPath = newHistory[newHistory.length - 1];
      setCurrentPath(prevPath);
      setHistory(newHistory);
      fetchItems(prevPath);
    }
  };

  const handleDownload = async (item) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/remote/download?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(item.path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.is_folder ? 'folder' : 'file'} '${item.name}'?`)) return;
    try {
      await authFetch(`/api/remote/delete?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
      });
      await fetchItems();
    } catch {
      alert('Delete failed');
    }
  };

  const handleRenameSuccess = async () => {
    await fetchItems();
  };

  const handleMoveSuccess = async () => {
    await fetchItems();
  };

  const handleUploadSuccess = async () => {
    await fetchItems();
  };

  return (
    <div>
      <h3 className="mb-4 font-bold text-lg">Remote File Explorer</h3>
      <form onSubmit={handleConnect} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Remote Base URL (e.g. http://localhost:9000)"
          value={remoteBaseUrl}
          onChange={e => setRemoteBaseUrl(e.target.value)}
          className="p-2 border border-gray-300 rounded w-96"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Connect</button>
      </form>
      {remoteBaseUrl && (
        <>
          <div className="flex items-center mb-4">
            <button
              onClick={handleBack}
              disabled={history.length <= 1}
              className="mr-2 px-2 py-1 bg-gray-300 rounded disabled:opacity-50"
            >
              Back
            </button>
            <span className="text-gray-700">Current Path: {currentPath}</span>
            <button
              onClick={() => setShowUpload(true)}
              className="ml-4 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Upload
            </button>
          </div>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          <ul className="bg-white rounded shadow p-4">
            {items.length === 0 && <li className="text-gray-500">Empty folder</li>}
            {items.map((item) => (
              <li key={item.path} className="flex items-center mb-2">
                {item.is_folder ? (
                  <button
                    className="text-blue-600 hover:underline text-left"
                    onClick={() => handleFolderClick(item.path)}
                  >
                    📁 {item.name}
                  </button>
                ) : (
                  <span>📄 {item.name}</span>
                )}
                <button
                  onClick={() => handleDownload(item)}
                  className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Download
                </button>
                <button
                  onClick={() => setRenameTarget(item)}
                  className="ml-2 text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >
                  Rename
                </button>
                <button
                  onClick={() => setMoveTarget(item)}
                  className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                >
                  Move
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <RemoteUploadModal
            isOpen={showUpload}
            onClose={() => setShowUpload(false)}
            remoteBaseUrl={remoteBaseUrl}
            parentPath={currentPath}
            onUploadSuccess={handleUploadSuccess}
          />
          <RemoteRenameModal
            isOpen={!!renameTarget}
            onClose={() => setRenameTarget(null)}
            remoteBaseUrl={remoteBaseUrl}
            path={renameTarget?.path || ''}
            currentName={renameTarget?.name || ''}
            isFolder={renameTarget?.is_folder || false}
            onRenameSuccess={handleRenameSuccess}
          />
          <RemoteMoveModal
            isOpen={!!moveTarget}
            onClose={() => setMoveTarget(null)}
            remoteBaseUrl={remoteBaseUrl}
            path={moveTarget?.path || ''}
            isFolder={moveTarget?.is_folder || false}
            onMoveSuccess={handleMoveSuccess}
          />
        </>
      )}
    </div>
  );
};

export default RemoteFileExplorer; 