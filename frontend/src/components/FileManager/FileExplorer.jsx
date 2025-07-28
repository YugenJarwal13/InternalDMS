import { useState, useEffect } from 'react';
import NotAuthorizedModal from './NotAuthorizedModal';
import { authFetch } from '../../utils/authFetch';
import UploadFolderModal from './UploadFolderModal';
import UploadModal from './UploadModal';
import RenameModal from './RenameModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import MoveModal from './MoveModal';
import CreateFolderModal from './CreateFolderModal';
import { HiFolder, HiOutlineDocument, HiChevronDown, HiChevronRight, HiPlus, HiUpload, HiPencil, HiTrash } from 'react-icons/hi';
import { HiArrowsRightLeft } from 'react-icons/hi2';

function formatToLocalTime(val) {
  if (!val) return '';
  if (!isNaN(val) && typeof val !== 'object') {
    const date = new Date(Number(val) * 1000);
    return date.toLocaleString();
  }
  let iso = val;
  if (typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')) {
    iso += 'Z';
  }
  const date = new Date(iso);
  return isNaN(date) ? '' : date.toLocaleString();
}

const downloadFile = async (path, name) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    alert('Download failed');
    return;
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const FolderNode = ({ path, name, isRoot = false, onAction = () => { }, onFolderSelect = () => {} }) => {
  const [expanded, setExpanded] = useState(isRoot);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadFolder, setShowUploadFolder] = useState(false);
  const [showNotAuth, setShowNotAuth] = useState(false);
  // Helper to check authorization before showing any modal
  const checkAuth = async (action, targetPath = path) => {
    try {
      await authFetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, path: targetPath }),
      });
      return true;
    } catch (err) {
      if (err.code === 403) setShowNotAuth(true);
      return false;
    }
  };

  const fetchChildren = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch(`/api/folders/list?parent_path=${encodeURIComponent(path)}`);
      setChildren(data);
      setLoaded(true);
    } catch (err) {
      setError('Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchChildren();
    }
  }, []);

  const handleToggle = async () => {
    if (!expanded) {
      setExpanded(true);
      await fetchChildren();
      // Update current folder in parent component for search/filter
      onFolderSelect(path);
    } else {
      setExpanded(false);
    }
  };

  const handleUploadSuccess = async () => {
    await fetchChildren();
  };

  const handleRenameSuccess = async () => {
    await fetchChildren();
  };

  const handleDeleteFolder = async (force = false) => {
    try {
      console.log(`Attempting to delete folder: ${path} with force=${force}`);
      const res = await authFetch('/api/folders/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, force }),
      });
      console.log('Delete response:', res);

      if (res.warning && res.can_proceed && !force) {
        const confirmDelete = window.confirm(res.warning);
        if (confirmDelete) {
          await handleDeleteFolder(true);
        }
        return;
      }

      onAction();
      setShowDelete(false);
    } catch (err) {
      console.error('Delete folder error:', err);
      alert(`Failed to delete folder: ${err.message || 'Unknown error'}`);
    }
  };

  const handleMoveFolder = async (destination) => {
    try {
      console.log(`Attempting to move folder from ${path} to ${destination}`);
      const response = await authFetch('/api/folders/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: path, destination_path: destination }),
      });
      console.log('Move response:', response);
      await fetchChildren();
      setShowMove(false);
    } catch (err) {
      console.error('Move folder error:', err);
      alert(`Failed to move folder: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <li className="ml-2">
      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg group hover:bg-blue-50 transition-all ${isRoot ? 'font-bold text-lg bg-blue-100' : ''}`}>
        <button onClick={handleToggle} className="focus:outline-none" title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <HiChevronDown className="inline w-5 h-5 text-blue-700" /> : <HiChevronRight className="inline w-5 h-5 text-blue-700" />}
        </button>
        <HiFolder className="w-6 h-6 text-blue-700" />
        <span className="truncate flex-1">{name}</span>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showCreateFolder) return;
            const ok = await checkAuth('create_folder');
            if (ok) setShowCreateFolder(true);
          }}
          className="p-1 rounded hover:bg-blue-100"
          title="New Folder"
        >
          <HiPlus className="w-5 h-5 text-blue-600" />
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showUpload) return;
            const ok = await checkAuth('upload');
            if (ok) setShowUpload(true);
          }}
          className="p-1 rounded hover:bg-green-100"
          title="Upload Files"
        >
          <HiUpload className="w-5 h-5 text-green-600" />
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showUploadFolder) return;
            const ok = await checkAuth('upload');
            if (ok) setShowUploadFolder(true);
          }}
          className="p-1 rounded hover:bg-green-200"
          title="Upload Folder"
        >
          <span role="img" aria-label="Upload Folder" className="w-5 h-5 text-green-700">📁⤴️</span>
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showRename) return;
            const ok = await checkAuth('rename');
            if (ok) setShowRename(true);
          }}
          className="p-1 rounded hover:bg-yellow-100"
          title="Rename"
        >
          <HiPencil className="w-5 h-5 text-yellow-600" />
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showMove) return;
            const ok = await checkAuth('move');
            if (ok) setShowMove(true);
          }}
          className="p-1 rounded hover:bg-purple-100"
          title="Move"
        >
          <HiArrowsRightLeft className="w-5 h-5 text-purple-600" />
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showDelete) return;
            const ok = await checkAuth('delete');
            if (ok) setShowDelete(true);
          }}
          className="p-1 rounded hover:bg-red-100"
          title="Delete"
        >
          <HiTrash className="w-5 h-5 text-red-500" />
        </button>
        {loading && <span className="ml-2 text-xs text-gray-400">Loading...</span>}
      </div>

      {error && <div className="text-red-500 ml-6">{error}</div>}

      {expanded && loaded && (
        <ul className="ml-4 border-l border-blue-100 pl-2">
          {children.length === 0 && <li className="text-gray-400 ml-4 italic">Empty folder</li>}
          {children.map((item) =>
            item.is_folder ? (
              <FolderNode 
                key={item.path} 
                path={item.path} 
                name={item.name} 
                onAction={fetchChildren} 
                onFolderSelect={onFolderSelect}
              />
            ) : (
              <FileNode key={item.path} item={item} parentPath={path} onAction={fetchChildren} />
            )
          )}
        </ul>
      )}

      <CreateFolderModal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} parentPath={path} onCreateSuccess={fetchChildren} />
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} parentPath={path} onUploadSuccess={handleUploadSuccess} />
      <UploadFolderModal isOpen={showUploadFolder} onClose={() => setShowUploadFolder(false)} parentPath={path} onUploadSuccess={handleUploadSuccess} />
      <RenameModal isOpen={showRename} onClose={() => setShowRename(false)} path={path} currentName={name} isFolder={true} onRenameSuccess={handleRenameSuccess} />
      <DeleteConfirmModal open={showDelete} onClose={() => setShowDelete(false)} onConfirm={() => handleDeleteFolder(false)} itemName={name} />
      <MoveModal open={showMove} onClose={() => setShowMove(false)} onMove={handleMoveFolder} currentPath={path} />
      <NotAuthorizedModal open={showNotAuth} onClose={() => setShowNotAuth(false)} />
    </li>
  );
};

const FileNode = ({ item, parentPath, onAction }) => {
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showNotAuth, setShowNotAuth] = useState(false);
  // Helper to check authorization before showing any modal
  const checkAuth = async (action, targetPath = item.path) => {
    try {
      await authFetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, path: targetPath }),
      });
      return true;
    } catch (err) {
      if (err.code === 403) setShowNotAuth(true);
      return false;
    }
  };

  const handleRenameSuccess = async () => {
    await onAction();
  };

  const handleDeleteFile = async () => {
    try {
      await authFetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path }),
      });
      await onAction();
      setShowDelete(false);
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const handleMoveFile = async (destination) => {
    try {
      await authFetch('/api/files/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: item.path, destination_path: destination }),
      });
      await onAction();
      setShowMove(false);
    } catch (err) {
      alert('Failed to move file');
    }
  };

  return (
    <li className="ml-8 flex items-center gap-2 px-2 py-1 rounded-lg group hover:bg-gray-50 transition-all">
      <HiOutlineDocument className="w-5 h-5 text-gray-500" />
      <span className="truncate flex-1">{item.name}</span>
      <button onClick={() => downloadFile(item.path, item.name)} className="p-1 rounded hover:bg-blue-100" title="Download">
        <HiUpload className="w-5 h-5 text-blue-600" />
      </button>
      <button
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showRename) return;
          const ok = await checkAuth('rename');
          if (ok) setShowRename(true);
        }}
        className="p-1 rounded hover:bg-yellow-100"
        title="Rename"
      >
        <HiPencil className="w-5 h-5 text-yellow-600" />
      </button>
      <button
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showMove) return;
          const ok = await checkAuth('move');
          if (ok) setShowMove(true);
        }}
        className="p-1 rounded hover:bg-purple-100"
        title="Move"
      >
        <HiArrowsRightLeft className="w-5 h-5 text-purple-600" />
      </button>
      <button
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showDelete) return;
          const ok = await checkAuth('delete');
          if (ok) setShowDelete(true);
        }}
        className="p-1 rounded hover:bg-red-100"
        title="Delete"
      >
        <HiTrash className="w-5 h-5 text-red-500" />
      </button>
      <RenameModal isOpen={showRename} onClose={() => setShowRename(false)} path={item.path} currentName={item.name} isFolder={false} onRenameSuccess={handleRenameSuccess} />
      <DeleteConfirmModal open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDeleteFile} itemName={item.name} />
      <MoveModal open={showMove} onClose={() => setShowMove(false)} onMove={handleMoveFile} currentPath={item.path} />
      <NotAuthorizedModal open={showNotAuth} onClose={() => setShowNotAuth(false)} />
    </li>
  );
};


const FileExplorer = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ 
    is_folder: "", 
    min_size: "", 
    max_size: "",
    owner_email: "",
    created_after: "",
    created_before: ""
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentFolder, setCurrentFolder] = useState("/");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    
    setLoading(true);
    setError("");
    try {
      const data = await authFetch(`/api/files/disk-search?query=${encodeURIComponent(search)}&parent_path=${encodeURIComponent(currentFolder)}`);
      setResults(data);
    } catch (err) {
      setError("Search failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const params = [];
    if (filter.is_folder !== "") params.push(`is_folder=${filter.is_folder}`);
    if (filter.min_size) params.push(`min_size=${filter.min_size}`);
    if (filter.max_size) params.push(`max_size=${filter.max_size}`);
    if (filter.owner_email) params.push(`owner_email=${encodeURIComponent(filter.owner_email)}`);
    if (filter.created_after) params.push(`created_after=${encodeURIComponent(filter.created_after)}`);
    if (filter.created_before) params.push(`created_before=${encodeURIComponent(filter.created_before)}`);
    
    const queryStr = params.length ? "&" + params.join("&") : "";
    try {
      const data = await authFetch(`/api/files/disk-filter?parent_path=${encodeURIComponent(currentFolder)}${queryStr}`);
      setResults(data);
    } catch (err) {
      setError("Filter failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setSearch("");
    setFilter({ 
      is_folder: "", 
      min_size: "", 
      max_size: "",
      owner_email: "",
      created_after: "",
      created_before: ""
    });
    setError("");
  };

  const updateCurrentFolder = (path) => {
    setCurrentFolder(path);
    // Clear any search/filter results when changing folders
    if (results) {
      clearResults();
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h3 className="mb-4 font-bold text-2xl text-blue-800 flex items-center gap-2">
        <HiFolder className="w-7 h-7 text-blue-700" /> File Explorer
      </h3>
      <form onSubmit={handleSearch} className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search files or folders (disk)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-blue-200 rounded px-3 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">Search</button>
        {results && <button type="button" onClick={clearResults} className="ml-2 px-3 py-1 rounded bg-gray-200 text-gray-700">Clear</button>}
      </form>
      
      <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Advanced Filters</h4>
        <form onSubmit={handleFilter} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">File Type</label>
            <select
              value={filter.is_folder}
              onChange={e => setFilter(f => ({ ...f, is_folder: e.target.value }))}
              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="true">Folders</option>
              <option value="false">Files</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Owner Email</label>
            <input
              type="email"
              placeholder="Filter by owner"
              value={filter.owner_email}
              onChange={e => setFilter(f => ({ ...f, owner_email: e.target.value }))}
              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Min Size (bytes)</label>
            <input
              type="number"
              min="0"
              placeholder="Minimum size"
              value={filter.min_size}
              onChange={e => setFilter(f => ({ ...f, min_size: e.target.value }))}
              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Size (bytes)</label>
            <input
              type="number"
              min="0"
              placeholder="Maximum size"
              value={filter.max_size}
              onChange={e => setFilter(f => ({ ...f, max_size: e.target.value }))}
              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Created After</label>
            <input
              type="datetime-local"
              value={filter.created_after}
              onChange={e => setFilter(f => ({ ...f, created_after: e.target.value }))}
              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Created Before</label>
            <input
              type="datetime-local"
              value={filter.created_before}
              onChange={e => setFilter(f => ({ ...f, created_before: e.target.value }))}
              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
            />
          </div>
          
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={clearResults} className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm">Clear</button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 text-sm">Apply Filters</button>
          </div>
        </form>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading && <div className="text-gray-500 mb-2">Loading...</div>}
      {results ? (
        <ul className="bg-white rounded-xl shadow p-4 border border-blue-100">
          {results.length === 0 && <li className="text-gray-400 italic">No results found.</li>}
          {results.map(item => (
            <li key={item.path} className="flex flex-col px-2 py-1 rounded-lg group hover:bg-blue-50 transition-all">
              <div className="flex items-center gap-2">
                {item.is_folder ? <HiFolder className="w-5 h-5 text-blue-700" /> : <HiOutlineDocument className="w-5 h-5 text-gray-500" />}
                <span className="truncate flex-1 font-medium">{item.name}</span>
                {!item.is_folder && (
                  <span className="text-xs text-gray-500">{item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''}</span>
                )}
                {!item.is_folder && (
                  <button 
                    onClick={() => downloadFile(item.path, item.name)} 
                    className="p-1 rounded hover:bg-blue-100" 
                    title="Download"
                  >
                    <HiUpload className="w-5 h-5 text-blue-600" />
                  </button>
                )}
              </div>
              
              {/* Enhanced metadata display */}
              <div className="ml-7 text-xs text-gray-500 mt-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {item.path && <div><span className="font-semibold">Path:</span> {item.path}</div>}
                  {item.owner && <div><span className="font-semibold">Owner:</span> {item.owner}</div>}
                  {item.created_at && (
                    <div><span className="font-semibold">Created:</span> {formatToLocalTime(item.created_at)}</div>
                  )}
                  {item.modified_at && (
                    <div><span className="font-semibold">Modified:</span> {formatToLocalTime(item.modified_at)}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="bg-white rounded-xl shadow p-4 border border-blue-100">
          <FolderNode 
            path="/" 
            name="Root" 
            isRoot 
            onFolderSelect={updateCurrentFolder}
          />
        </ul>
      )}
    </div>
  );
};

export default FileExplorer;
