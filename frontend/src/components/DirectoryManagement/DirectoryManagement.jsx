import { useEffect, useState, useContext } from 'react';
import { authFetch } from '../../utils/authFetch';
import { UserContext } from '../../context/UserContext';

const DirectoryManagement = () => {
  const { user } = useContext(UserContext);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usersError, setUsersError] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: '' });
  const [userForm, setUserForm] = useState({ user_id: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/teams/');
      setTeams(data);
    } catch (err) {
      setError('Failed to fetch teams: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await authFetch('/api/users/all');
      setUsers(data);
      console.log('Fetched users:', data); // Debug log
    } catch (err) {
      const errorMessage = 'Failed to fetch users: ' + (err.message || 'Unknown error');
      console.error(errorMessage, err);
      setUsersError(errorMessage);
      setUsers([]); // Clear users on error
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTeams();
      fetchUsers();
    }
  }, [user]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await authFetch('/api/teams/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      });
      setShowCreateTeamModal(false);
      setTeamForm({ name: '' });
      await fetchTeams();
    } catch (err) {
      setFormError(err.message || 'Failed to create team');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}"? This will also delete the team folder and all its contents.`)) {
      return;
    }

    try {
      await authFetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      await fetchTeams();
    } catch (err) {
      alert('Failed to delete team: ' + (err.message || 'Unknown error'));
    }
  };

  const handleAssignUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await authFetch(`/api/teams/${selectedTeam.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userForm.user_id) }),
      });
      setShowAssignUserModal(false);
      setUserForm({ user_id: '' });
      setSelectedTeam(null);
      await fetchTeams();
    } catch (err) {
      setFormError(err.message || 'Failed to assign user to team');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveUser = async (teamId, userId, userEmail, teamName) => {
    if (!window.confirm(`Remove user "${userEmail}" from team "${teamName}"?`)) {
      return;
    }

    try {
      await authFetch(`/api/teams/${teamId}/users/${userId}`, {
        method: 'DELETE',
      });
      await fetchTeams();
    } catch (err) {
      alert('Failed to remove user: ' + (err.message || 'Unknown error'));
    }
  };

  const openAssignUserModal = (team) => {
    setSelectedTeam(team);
    setUserForm({ user_id: '' });
    setFormError('');
    setUsersError(''); // Clear any previous user errors
    setShowAssignUserModal(true);
    
    // Refresh users list when opening modal to ensure it's up-to-date
    if (users.length === 0 || usersError) {
      fetchUsers();
    }
  };

  const navigateToTeamFolder = (folderPath) => {
    // Navigate to the file explorer with this folder path in the same tab
    window.location.href = `/files?path=${encodeURIComponent(folderPath)}`;
  };

  if (user?.role !== 'admin') {
    return <div className="text-red-500">Access denied. Admins only.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Directory Management</h2>
      
      <button
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        onClick={() => setShowCreateTeamModal(true)}
      >
        Create Team
      </button>

      {loading && <div>Loading teams...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="space-y-6">
        {teams.length === 0 && !loading && (
          <div className="text-gray-500 italic">No teams found. Create your first team to get started.</div>
        )}

        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{team.name}</h3>
                <p className="text-gray-600">Folder Path: {team.folder_path}</p>
                <p className="text-gray-500 text-sm">Created: {new Date(team.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateToTeamFolder(team.folder_path)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                >
                  Go to Folder
                </button>
                <button
                  onClick={() => openAssignUserModal(team)}
                  className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm"
                >
                  Add User
                </button>
                <button
                  onClick={() => handleDeleteTeam(team.id, team.name)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                >
                  Delete Team
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Team Members ({team.users.length})</h4>
              {team.users.length === 0 ? (
                <p className="text-gray-500 italic">No users assigned to this team</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-50 rounded">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Email</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Granted By</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Date Added</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.users.map((userAccess) => (
                        <tr key={userAccess.id} className="border-t border-gray-200">
                          <td className="px-3 py-2 text-sm">{userAccess.email}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{userAccess.granted_by_email}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {new Date(userAccess.granted_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleRemoveUser(team.id, userAccess.id, userAccess.email, team.name)}
                              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <form className="bg-white p-6 rounded shadow-md w-full max-w-sm" onSubmit={handleCreateTeam}>
            <h3 className="text-xl font-bold mb-4">Create New Team</h3>
            {formError && <div className="text-red-500 mb-2">{formError}</div>}
            <input
              type="text"
              name="name"
              placeholder="Team name"
              value={teamForm.name}
              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1"
                disabled={formLoading}
              >
                {formLoading ? 'Creating...' : 'Create Team'}
              </button>
              <button
                type="button"
                className="bg-gray-300 px-4 py-2 rounded flex-1"
                onClick={() => setShowCreateTeamModal(false)}
                disabled={formLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignUserModal && selectedTeam && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <form className="bg-white p-6 rounded shadow-md w-full max-w-sm" onSubmit={handleAssignUser}>
            <h3 className="text-xl font-bold mb-4">Add User to "{selectedTeam.name}"</h3>
            {formError && <div className="text-red-500 mb-2">{formError}</div>}
            {usersError && <div className="text-red-500 mb-2">{usersError}</div>}
            {usersLoading ? (
              <div className="text-gray-500 mb-4">Loading users...</div>
            ) : (
              <select
                name="user_id"
                value={userForm.user_id}
                onChange={(e) => setUserForm({ ...userForm, user_id: e.target.value })}
                className="w-full mb-4 p-2 border border-gray-300 rounded"
                required
              >
                <option value="">Select a user</option>
                {(() => {
                  const availableUsers = users.filter(u => !selectedTeam.users.some(tu => tu.id === u.id));
                  
                  // Enhanced debugging
                  console.log('=== ADD USER DROPDOWN DEBUG ===');
                  console.log('Selected Team:', selectedTeam.name, '(ID:', selectedTeam.id, ')');
                  console.log('Team users:', selectedTeam.users.map(tu => ({ id: tu.id, email: tu.email })));
                  console.log('All users from API:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
                  console.log('Available users for dropdown:', availableUsers.map(u => ({ id: u.id, email: u.email })));
                  
                  // Specific check for yugenj
                  const yugenj = users.find(u => u.email.includes('yugenj'));
                  if (yugenj) {
                    const isInTeam = selectedTeam.users.some(tu => tu.id === yugenj.id);
                    console.log(`YUGENJ CHECK: Found ${yugenj.email} (ID: ${yugenj.id}), Already in team: ${isInTeam}`);
                  } else {
                    console.log('YUGENJ CHECK: User yugenj not found in users list');
                  }
                  console.log('=== END DEBUG ===');
                  
                  return availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ));
                })()}
              </select>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex-1"
                disabled={formLoading}
              >
                {formLoading ? 'Adding...' : 'Add User'}
              </button>
              <button
                type="button"
                className="bg-gray-300 px-4 py-2 rounded flex-1"
                onClick={() => setShowAssignUserModal(false)}
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

export default DirectoryManagement;
