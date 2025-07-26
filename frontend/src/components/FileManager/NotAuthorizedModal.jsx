import React from 'react';

const NotAuthorizedModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded shadow p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4 text-red-600">Sorry, Not Authorized</h2>
        <p className="mb-4 text-gray-600">You do not have permission to perform this action.</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-blue-600 text-white">OK</button>
        </div>
      </div>
    </div>
  );
};

export default NotAuthorizedModal;
