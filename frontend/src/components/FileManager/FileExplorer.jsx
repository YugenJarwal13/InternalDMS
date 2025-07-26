import { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';
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

const FolderNode = ({ path, name, isRoot = false, onAction = () => { } }) => {
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
      const res = await authFetch('/api/folders/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, force }),
      });

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
      alert('Failed to delete folder');
    }
  };

  const handleMoveFolder = async (destination) => {
    try {
      await authFetch('/api/folders/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: path, destination_path: destination }),
      });
      await fetchChildren();
      setShowMove(false);
    } catch (err) {
      alert('Failed to move folder');
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
        <button onClick={() => setShowCreateFolder(true)} className="p-1 rounded hover:bg-blue-100" title="New Folder">
          <HiPlus className="w-5 h-5 text-blue-600" />
        </button>
        <button onClick={() => setShowUpload(true)} className="p-1 rounded hover:bg-green-100" title="Upload">
          <HiUpload className="w-5 h-5 text-green-600" />
        </button>
        <button onClick={() => setShowRename(true)} className="p-1 rounded hover:bg-yellow-100" title="Rename">
          <HiPencil className="w-5 h-5 text-yellow-600" />
        </button>
        <button onClick={() => setShowMove(true)} className="p-1 rounded hover:bg-purple-100" title="Move">
          <HiArrowsRightLeft className="w-5 h-5 text-purple-600" />
        </button>
        <button onClick={() => setShowDelete(true)} className="p-1 rounded hover:bg-red-100" title="Delete">
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
              <FolderNode key={item.path} path={item.path} name={item.name} onAction={fetchChildren} />
            ) : (
              <FileNode key={item.path} item={item} parentPath={path} onAction={fetchChildren} />
            )
          )}
        </ul>
      )}

      <CreateFolderModal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} parentPath={path} onCreateSuccess={fetchChildren} />
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} parentPath={path} onUploadSuccess={handleUploadSuccess} />
      <RenameModal isOpen={showRename} onClose={() => setShowRename(false)} path={path} currentName={name} isFolder={true} onRenameSuccess={handleRenameSuccess} />
      <DeleteConfirmModal open={showDelete} onClose={() => setShowDelete(false)} onConfirm={() => handleDeleteFolder(false)} itemName={name} />
      <MoveModal open={showMove} onClose={() => setShowMove(false)} onMove={handleMoveFolder} currentPath={path} />
    </li>
  );
};

const FileNode = ({ item, parentPath, onAction }) => {
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMove, setShowMove] = useState(false);

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
      <button onClick={() => setShowRename(true)} className="p-1 rounded hover:bg-yellow-100" title="Rename">
        <HiPencil className="w-5 h-5 text-yellow-600" />
      </button>
      <button onClick={() => setShowMove(true)} className="p-1 rounded hover:bg-purple-100" title="Move">
        <HiArrowsRightLeft className="w-5 h-5 text-purple-600" />
      </button>
      <button onClick={() => setShowDelete(true)} className="p-1 rounded hover:bg-red-100" title="Delete">
        <HiTrash className="w-5 h-5 text-red-500" />
      </button>
      <RenameModal isOpen={showRename} onClose={() => setShowRename(false)} path={item.path} currentName={item.name} isFolder={false} onRenameSuccess={handleRenameSuccess} />
      <DeleteConfirmModal open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDeleteFile} itemName={item.name} />
      <MoveModal open={showMove} onClose={() => setShowMove(false)} onMove={handleMoveFile} currentPath={item.path} />
    </li>
  );
};

const FileExplorer = () => {
  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h3 className="mb-4 font-bold text-2xl text-blue-800 flex items-center gap-2">
        <HiFolder className="w-7 h-7 text-blue-700" /> File Explorer
      </h3>
      <ul className="bg-white rounded-xl shadow p-4 border border-blue-100">
        <FolderNode path="/" name="Root" isRoot />
      </ul>
    </div>
  );
};

export default FileExplorer;
