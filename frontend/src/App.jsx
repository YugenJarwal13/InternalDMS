import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import MainLayout from './components/Layout/MainLayout';
import { UserContext } from './context/UserContext';
import Files from './pages/Files';
import ActivityLogPage from './pages/ActivityLogPage';
import UserManagementPage from './pages/UserManagementPage';
import Remote from './pages/Remote';

const App = () => {
  const isAuthenticated = !!localStorage.getItem('accessToken');
  const { loading } = useContext(UserContext);

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={isAuthenticated ? (
          <MainLayout>
            <Dashboard />
          </MainLayout>
        ) : (
          <Navigate to="/login" />
        )}
      />
      <Route
        path="/files"
        element={isAuthenticated ? (
          <MainLayout>
            <Files />
          </MainLayout>
        ) : (
          <Navigate to="/login" />
        )}
      />
      <Route
        path="/activity-log"
        element={isAuthenticated ? (
          <MainLayout>
            <ActivityLogPage />
          </MainLayout>
        ) : (
          <Navigate to="/login" />
        )}
      />
      <Route
        path="/users"
        element={isAuthenticated ? (
          <MainLayout>
            <UserManagementPage />
          </MainLayout>
        ) : (
          <Navigate to="/login" />
        )}
      />
      <Route
        path="/remote"
        element={isAuthenticated ? (
          <MainLayout>
            <Remote />
          </MainLayout>
        ) : (
          <Navigate to="/login" />
        )}
      />
      {/* Add other protected routes here, wrapped in MainLayout */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
