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

  if (!user) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to the DMS Dashboard</h1>
        <p className="text-gray-600">Manage your documents and folders efficiently</p>
      </div>
      
      
      {/* System Overview for Admin Users Only */}
      {user.role === 'admin' && (
        <div className="mb-6">
          {/* System Health Component */}
          <SystemHealth />
        </div>
      )}
      
      {/* Statistics Table Component */}
      <StatisticsTable />
    </div>
  );
};

export default Dashboard;
