import React, { useRef, useState } from 'react';
import { authFetch } from '../../utils/authFetch';

const UploadFolderModal = ({ isOpen, onClose, parentPath, onUploadSuccess }) => {
  const inputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const files = inputRef.current.files;
    if (!files.length) {
      setError('Please select a folder.');
      setLoading(false);
      return;
    }
    // Prepare FormData with files and their relative paths
    const formData = new FormData();
    formData.append('parent_path', parentPath);
    for (let file of files) {
      formData.append('files', file);
      formData.append('relpaths', file.webkitRelativePath || file.name);
    }
    try {
      await authFetch('/api/folders/upload-folder-structure', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type
      });
      onUploadSuccess && onUploadSuccess();
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
        <h3 className="text-lg font-bold mb-4">Upload Folder</h3>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <form onSubmit={handleUpload}>
          <input
            type="file"
            ref={inputRef}
            id="upload-folder-input"
            webkitdirectory="true"
            directory="true"
            multiple
            className="hidden"
          />
          <label
            htmlFor="upload-folder-input"
            className="mb-4 inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded cursor-pointer hover:bg-blue-200 font-semibold"
          >
            Choose Folder
          </label>
          <span className="block text-gray-500 text-sm mb-2">
            {inputRef.current && inputRef.current.files.length > 0
              ? Array.from(inputRef.current.files).map(f => f.webkitRelativePath || f.name).join(", ")
              : "No folder selected"}
          </span>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white">{loading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadFolderModal;
