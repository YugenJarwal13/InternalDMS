import React, { useState } from 'react';

const MoveModal = ({ open, onClose, onMove, currentPath }) => {
  const [destination, setDestination] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded shadow p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">Move Item</h2>
        <input
          className="w-full px-3 py-2 border rounded mb-4"
          placeholder="Destination path"
          value={destination}
          onChange={e => setDestination(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
          <button onClick={() => onMove(destination)} className="px-4 py-2 rounded bg-blue-600 text-white">Move</button>
        </div>
      </div>
    </div>
  );
};

export default MoveModal; 