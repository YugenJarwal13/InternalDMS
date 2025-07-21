import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { Link } from 'react-router-dom';
import { HiFolder } from 'react-icons/hi';

const Sidebar = () => {
  const { user } = useContext(UserContext);

  return (
    <aside className="w-64 h-full bg-gray-800 text-white flex flex-col p-4">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <HiFolder className="w-7 h-7 text-blue-300" /> Internal DMS
      </h2>
      <nav className="flex flex-col gap-4">
        <Link to="/dashboard" className="hover:text-blue-300">Dashboard</Link>
        <Link to="/files" className="hover:text-blue-300">Files</Link>
        <Link to="/remote" className="hover:text-blue-300">Remote Server</Link>
        {user?.role === 'admin' && (
          <>
            <Link to="/activity-log" className="hover:text-blue-300">Activity Log</Link>
            <Link to="/users" className="hover:text-blue-300">User Management</Link>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar; 