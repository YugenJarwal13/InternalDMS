import { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';
import RemoteUploadModal from './RemoteUploadModal';
import RemoteRenameModal from './RemoteRenameModal';
import RemoteMoveModal from './RemoteMoveModal';
import {
  HiFolder,
  HiOutlineDocument,
  HiChevronDown,
  HiChevronRight,
  HiPlus,
  HiUpload,
  HiPencil,
  HiTrash,
} from 'react-icons/hi';
import { HiArrowsRightLeft } from 'react-icons/hi2';

const RemoteCreateFolderModal = ({ isOpen, onClose, remoteBaseUrl, parentPath, onCreateSuccess }) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('remote_base_url', remoteBaseUrl);
      formData.append('parent_path', parentPath);
      formData.append('folder_name', folderName);
      
      await authFetch('/api/remote/create-folder', {
        method: 'POST',
        body: formData,
      });
      
      onCreateSuccess();
      onClose();
      setFolderName('');
    } catch (err) {
      setError('Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Create New Folder (Remote)</h3>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Folder name"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            className="w-full mb-4 p-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Folder'}
          </button>
        </form>
      </div>
    </div>
  );
};

const RemoteFolderNode = ({ item, remoteBaseUrl, onRefresh, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const fetchChildren = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch(`/api/remote/list?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(item.path)}`);
      setChildren(data);
      setLoaded(true);
    } catch (err) {
      setError('Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!expanded) {
      setExpanded(true);
      await fetchChildren();
    } else {
      setExpanded(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete folder '${item.name}'?`)) return;
    try {
      await authFetch(`/api/remote/delete?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch {
      alert('Delete failed');
    }
  };

  const handleDownload = async () => {
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

  const indentStyle = { marginLeft: `${depth * 16}px` };

  return (
    <li style={indentStyle}>
      <div 
        className="flex items-center gap-2 px-2 py-1 rounded-lg group hover:bg-blue-50 transition-all cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="focus:outline-none" title={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <HiChevronDown className="inline w-5 h-5 text-blue-700" /> : <HiChevronRight className="inline w-5 h-5 text-blue-700" />}
          </div>
          <HiFolder className="w-6 h-6 text-blue-700" />
          <span className="truncate flex-1">{item.name}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCreateFolder(true);
            }}
            className="p-1 rounded hover:bg-blue-100"
            title="New Folder"
          >
            <HiPlus className="w-5 h-5 text-blue-600" />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowUpload(true);
            }}
            className="p-1 rounded hover:bg-green-100"
            title="Upload Files"
          >
            <HiUpload className="w-5 h-5 text-green-600" />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowRename(true);
            }}
            className="p-1 rounded hover:bg-yellow-100"
            title="Rename"
          >
            <HiPencil className="w-5 h-5 text-yellow-600" />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMove(true);
            }}
            className="p-1 rounded hover:bg-purple-100"
            title="Move"
          >
            <HiArrowsRightLeft className="w-5 h-5 text-purple-600" />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            className="p-1 rounded hover:bg-red-100"
            title="Delete"
          >
            <HiTrash className="w-5 h-5 text-red-500" />
          </button>
          
          {loading && <span className="ml-2 text-xs text-gray-400">Loading...</span>}
        </div>
      </div>

      {error && <div className="text-red-500 ml-6">{error}</div>}

      {expanded && loaded && (
        <ul className="ml-4 border-l border-blue-100 pl-2">
          {children.length === 0 && <li className="text-gray-400 ml-4 italic">Empty folder</li>}
          {children.map((child) =>
            child.is_folder ? (
              <RemoteFolderNode 
                key={child.path} 
                item={child}
                remoteBaseUrl={remoteBaseUrl}
                onRefresh={fetchChildren}
                depth={depth + 1}
              />
            ) : (
              <RemoteFileNode 
                key={child.path} 
                item={child}
                remoteBaseUrl={remoteBaseUrl}
                onRefresh={fetchChildren}
                depth={depth + 1}
              />
            )
          )}
        </ul>
      )}

      <RemoteUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        remoteBaseUrl={remoteBaseUrl}
        parentPath={item.path}
        onUploadSuccess={fetchChildren}
      />
      
      <RemoteCreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        remoteBaseUrl={remoteBaseUrl}
        parentPath={item.path}
        onCreateSuccess={fetchChildren}
      />
      
      <RemoteRenameModal
        isOpen={showRename}
        onClose={() => setShowRename(false)}
        remoteBaseUrl={remoteBaseUrl}
        path={item.path}
        currentName={item.name}
        isFolder={true}
        onRenameSuccess={onRefresh}
      />
      
      <RemoteMoveModal
        isOpen={showMove}
        onClose={() => setShowMove(false)}
        remoteBaseUrl={remoteBaseUrl}
        path={item.path}
        isFolder={true}
        onMoveSuccess={onRefresh}
      />
    </li>
  );
};

const RemoteFileNode = ({ item, remoteBaseUrl, onRefresh, depth = 0 }) => {
  const [showRename, setShowRename] = useState(false);
  const [showMove, setShowMove] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete file '${item.name}'?`)) return;
    try {
      await authFetch(`/api/remote/delete?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch {
      alert('Delete failed');
    }
  };

  const handleDownload = async () => {
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

  const indentStyle = { marginLeft: `${32 + (depth * 16)}px` };

  return (
    <li className="flex items-center gap-2 px-2 py-1 rounded-lg group hover:bg-gray-50 transition-all" style={indentStyle}>
      <HiOutlineDocument className="w-5 h-5 text-gray-500" />
      <span className="truncate flex-1">{item.name}</span>
      
      <button 
        onClick={handleDownload} 
        className="p-1 rounded hover:bg-blue-100" 
        title="Download"
      >
        <HiUpload className="w-5 h-5 text-blue-600" />
      </button>
      
      <button
        onClick={() => setShowRename(true)}
        className="p-1 rounded hover:bg-yellow-100"
        title="Rename"
      >
        <HiPencil className="w-5 h-5 text-yellow-600" />
      </button>
      
      <button
        onClick={() => setShowMove(true)}
        className="p-1 rounded hover:bg-purple-100"
        title="Move"
      >
        <HiArrowsRightLeft className="w-5 h-5 text-purple-600" />
      </button>
      
      <button
        onClick={handleDelete}
        className="p-1 rounded hover:bg-red-100"
        title="Delete"
      >
        <HiTrash className="w-5 h-5 text-red-500" />
      </button>

      <RemoteRenameModal
        isOpen={showRename}
        onClose={() => setShowRename(false)}
        remoteBaseUrl={remoteBaseUrl}
        path={item.path}
        currentName={item.name}
        isFolder={false}
        onRenameSuccess={onRefresh}
      />
      
      <RemoteMoveModal
        isOpen={showMove}
        onClose={() => setShowMove(false)}
        remoteBaseUrl={remoteBaseUrl}
        path={item.path}
        isFolder={false}
        onMoveSuccess={onRefresh}
      />
    </li>
  );
};

const RemoteFileExplorer = () => {
  const [remoteBaseUrl, setRemoteBaseUrl] = useState('');
  const [rootItems, setRootItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const fetchRootItems = async () => {
    if (!remoteBaseUrl) return;
    setLoading(true);
    setError('');
    try {
      const data = await authFetch(`/api/remote/list?remote_base_url=${encodeURIComponent(remoteBaseUrl)}&path=/`);
      setRootItems(data);
      setConnected(true);
    } catch (err) {
      setError('Failed to connect to remote server');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    fetchRootItems();
  };

  const handleDisconnect = () => {
    setRemoteBaseUrl('');
    setRootItems([]);
    setConnected(false);
    setError('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="mb-4 font-bold text-2xl text-gray-800">Remote File Explorer</h3>
        
        {!connected ? (
          <form onSubmit={handleConnect} className="flex gap-3">
            <input
              type="text"
              placeholder="Please enter remote server DMS URL (e.g. http://remote-dms.company.com:8000)"
              value={remoteBaseUrl}
              onChange={e => setRemoteBaseUrl(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-800 font-medium">Connected to: {remoteBaseUrl}</span>
            </div>
            <button 
              onClick={handleDisconnect}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 font-medium">{error}</div>
        </div>
      )}

      {connected && (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h4 className="font-semibold text-gray-800">Remote Files & Folders</h4>
          </div>
          
          <div className="p-4 overflow-auto max-h-[600px]">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading remote contents...</div>
              </div>
            )}
            
            {!loading && rootItems.length === 0 && (
              <div className="text-gray-400 italic text-center py-8">
                Remote folder is empty
              </div>
            )}
            
            {!loading && rootItems.length > 0 && (
              <ul className="space-y-1">
                {rootItems.map((item) =>
                  item.is_folder ? (
                    <RemoteFolderNode 
                      key={item.path} 
                      item={item}
                      remoteBaseUrl={remoteBaseUrl}
                      onRefresh={fetchRootItems}
                      depth={0}
                    />
                  ) : (
                    <RemoteFileNode 
                      key={item.path} 
                      item={item}
                      remoteBaseUrl={remoteBaseUrl}
                      onRefresh={fetchRootItems}
                      depth={0}
                    />
                  )
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteFileExplorer; 