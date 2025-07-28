import React, { useRef, useState } from 'react';
import { authFetch } from '../../utils/authFetch';

const UploadFolderModal = ({ isOpen, onClose, parentPath, onUploadSuccess }) => {
  const inputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [fileCount, setFileCount] = useState(0);

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
    
    // Get the base folder name from the first file's path
    const firstPath = files[0].webkitRelativePath || '';
    const baseFolder = firstPath.split('/')[0] || '';
    
    // Prepare FormData with files and their relative paths
    const formData = new FormData();
    formData.append('parent_path', parentPath);
    
    console.log(`Uploading ${files.length} files to ${parentPath}`);
    console.log(`Base folder: ${baseFolder}`);
    
    // Check if we have relative paths
    let hasRelativePaths = false;
    
    for (let file of files) {
      // Check if browser supports webkitRelativePath
      const relativePath = file.webkitRelativePath || file.name;
      hasRelativePaths = hasRelativePaths || (file.webkitRelativePath && file.webkitRelativePath !== '');
      
      formData.append('files', file);
      formData.append('relpaths', relativePath);
      console.log(`Adding file: ${relativePath}`);
    }
    
    if (!hasRelativePaths) {
      console.warn("Browser might not support directory upload properly - no relative paths found");
    }
    
    try {
      console.log('Sending upload request...');
      const response = await authFetch('/api/folders/upload-folder-structure', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type
      });
      console.log('Upload response:', response);
      
      if (response.created_files === 0) {
        setError('No files were uploaded. Please make sure you selected a folder with files.');
        setLoading(false);
        return;
      }
      
      onUploadSuccess && onUploadSuccess();
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Upload failed';
      
      if (err.message) {
        errorMessage += ': ' + err.message;
      }
      
      // Special case for common errors
      if (err.message && err.message.includes('413')) {
        errorMessage = 'Upload failed: Files are too large. Please try uploading smaller files.';
      } else if (err.message && err.message.includes('401')) {
        errorMessage = 'Upload failed: You need to log in again.';
      } else if (err.message && err.message.includes('403')) {
        errorMessage = 'Upload failed: You do not have permission to upload to this folder.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  
  // Handle directory selection
  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      // Extract folder name from the first file's path
      const firstPath = files[0].webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Unknown Folder';
      setSelectedFolderName(folderName);
      setFileCount(files.length);
    } else {
      setSelectedFolderName('');
      setFileCount(0);
    }
  };

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
            mozdirectory="true"
            multiple
            className="hidden"
            onChange={handleFolderSelect}
          />
          <label
            htmlFor="upload-folder-input"
            className="mb-4 inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded cursor-pointer hover:bg-blue-200 font-semibold"
          >
            Choose Folder
          </label>
          <div className="block text-gray-700 text-sm mb-2">
            {selectedFolderName ? (
              <div>
                <p><strong>Selected folder:</strong> {selectedFolderName}</p>
                <p><strong>Files:</strong> {fileCount}</p>
                <p><strong>Destination:</strong> {parentPath || '/'}</p>
              </div>
            ) : (
              "No folder selected"
            )}
          </div>
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
