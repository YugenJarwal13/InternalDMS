import React from 'react';

const DeleteConfirmModal = ({ open, onClose, onConfirm, itemName }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded shadow p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">Delete {itemName}?</h2>
        <p className="mb-4 text-gray-600">Are you sure you want to delete this item? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-500 text-white">Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 