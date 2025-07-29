import React, { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import { useNavigate } from 'react-router-dom';
import StatisticsTable from "../components/FileManager/StatisticsTable";
import SystemHealth from "../components/SystemHealth";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authFetch("http://localhost:8000/api/users/me");
        setUser(data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        // Redirect if user not authenticated
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  if (!user) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome to the DMS Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="font-medium">Logged in as:</span> {user.email} ({user.role})
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
      
      
      {/* System Overview for Admin Users Only */}
      {user.role === 'admin' && (
        <div className="mb-6">
          {/* System Health Component */}
          <SystemHealth />

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Account Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="text-blue-500 text-lg font-medium">User Role</div>
                <div className="text-2xl font-bold mt-2">{user.role}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="text-green-500 text-lg font-medium">Account Status</div>
                <div className="text-2xl font-bold mt-2">Active</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Regular User Overview */}
      {user.role !== 'admin' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-blue-500 text-lg font-medium">User Role</div>
              <div className="text-2xl font-bold mt-2">{user.role}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="text-green-500 text-lg font-medium">Account Status</div>
              <div className="text-2xl font-bold mt-2">Active</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Statistics Table Component */}
      <StatisticsTable />
    </div>
  );
};

export default Dashboard;
