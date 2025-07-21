import Sidebar from './Sidebar';

const MainLayout = ({ children }) => (
  <div className="flex h-screen">
    <Sidebar />
    <main className="flex-1 bg-gray-100 overflow-auto p-6">{children}</main>
  </div>
);

export default MainLayout; 