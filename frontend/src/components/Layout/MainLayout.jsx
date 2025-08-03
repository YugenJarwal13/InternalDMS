import Sidebar from './Sidebar';
import UserMenu from './UserMenu';

const MainLayout = ({ children }) => (
  <div className="flex h-screen">
    <Sidebar />
    <div className="flex-1 bg-gray-100 flex flex-col">
      {/* Top Bar with User Menu */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex justify-end">
        <UserMenu />
      </div>
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  </div>
);

export default MainLayout; 