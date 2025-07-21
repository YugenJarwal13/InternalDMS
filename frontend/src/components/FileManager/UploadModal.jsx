import { useRef, useState } from 'react';
import { authFetch } from '../../utils/authFetch';

const UploadModal = ({ isOpen, onClose, parentPath, onUploadSuccess }) => {
  const fileInputRef = useRef();
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const files = fileInputRef.current.files;
    if (!files.length) {
      setError('Please select at least one file.');
      setLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append('parent_path', parentPath);
    formData.append('remark', remark); // Add remark to form data
    for (let file of files) {
      formData.append('files', file);
    }
    try {
      await authFetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type
      });
      onUploadSuccess();
      onClose();
    } catch (err) {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Upload Files</h3>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <form onSubmit={handleUpload}>
          <input type="file" multiple ref={fileInputRef} className="mb-4" />
          <input
            type="text"
            placeholder="Remark (optional)"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadModal; 