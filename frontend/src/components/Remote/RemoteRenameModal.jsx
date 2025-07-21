import { useState } from 'react';
import { authFetch } from '../../utils/authFetch';

const RemoteRenameModal = ({ isOpen, onClose, remoteBaseUrl, path, currentName, isFolder, onRenameSuccess }) => {
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRename = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('remote_base_url', remoteBaseUrl);
    formData.append('source_path', path);
    const destPath = path.substring(0, path.lastIndexOf('/') + 1) + newName;
    formData.append('destination_path', destPath);
    try {
      await authFetch('/api/remote/move', {
        method: 'POST',
        body: formData,
        headers: {},
      });
      onRenameSuccess();
      onClose();
    } catch (err) {
      setError('Rename failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Rename {isFolder ? 'Folder' : 'File'} (Remote)</h3>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <form onSubmit={handleRename}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RemoteRenameModal; 