import { useEffect, useState, useContext } from 'react';
import { authFetch } from '../../utils/authFetch';
import { UserContext } from '../../context/UserContext';
import { addUser, editUser } from '../../services/api';

const roles = ['admin', 'user'];

function formatToLocalTime(val) {
  if (!val) return '';
  // If it's a number or numeric string, treat as UNIX timestamp (seconds)
  if (!isNaN(val) && typeof val !== 'object') {
    const date = new Date(Number(val) * 1000);
    return date.toLocaleString();
  }
  // If it's an ISO string without timezone, treat as UTC
  let iso = val;
  if (typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')) {
    iso += 'Z';
  }
  const date = new Date(iso);
  return isNaN(date) ? '' : date.toLocaleString();
}

const UserManagement = () => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'user' });
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/users/all');
      setUsers(data);
    } catch {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(id);
    try {
      await authFetch(`/api/users/delete-user/${id}`, {
        method: 'DELETE',
      });
      await fetchUsers();
    } catch {
      alert('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const openAddModal = () => {
    setForm({ email: '', password: '', role: 'user' });
    setFormError('');
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setEditId(user.id);
    setForm({ email: user.email, password: '', role: user.role });
    setFormError('');
    setShowEditModal(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await addUser(form);
      setShowAddModal(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await editUser({ id: editId, ...form });
      setShowEditModal(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="text-red-500">Access denied. Admins only.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      <button
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        onClick={openAddModal}
      >
        Add User
      </button>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Role</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-4">No users found.</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 border">{u.id}</td>
                <td className="px-4 py-2 border">{u.email}</td>
                <td className="px-4 py-2 border">{u.role}</td>
                <td className="px-4 py-2 border flex gap-2">
                  <button
                    onClick={() => openEditModal(u)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                    disabled={deletingId === u.id}
                  >
                    {deletingId === u.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <form className="bg-white p-6 rounded shadow-md w-full max-w-sm" onSubmit={handleAddUser}>
            <h3 className="text-xl font-bold mb-4">Add User</h3>
            {formError && <div className="text-red-500 mb-2">{formError}</div>}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleFormChange}
              className="w-full mb-3 p-2 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleFormChange}
              className="w-full mb-3 p-2 border border-gray-300 rounded"
              required
            />
            <select
              name="role"
              value={form.role}
              onChange={handleFormChange}
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              required
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1"
                disabled={formLoading}
              >
                {formLoading ? 'Adding...' : 'Add User'}
              </button>
              <button
                type="button"
                className="bg-gray-300 px-4 py-2 rounded flex-1"
                onClick={() => setShowAddModal(false)}
                disabled={formLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <form className="bg-white p-6 rounded shadow-md w-full max-w-sm" onSubmit={handleEditUser}>
            <h3 className="text-xl font-bold mb-4">Edit User</h3>
            {formError && <div className="text-red-500 mb-2">{formError}</div>}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleFormChange}
              className="w-full mb-3 p-2 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="New Password (leave blank to keep)"
              value={form.password}
              onChange={handleFormChange}
              className="w-full mb-3 p-2 border border-gray-300 rounded"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleFormChange}
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              required
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1"
                disabled={formLoading}
              >
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="bg-gray-300 px-4 py-2 rounded flex-1"
                onClick={() => setShowEditModal(false)}
                disabled={formLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 