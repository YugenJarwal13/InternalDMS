import { createContext, useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/authFetch';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Create a reusable function to fetch user data
  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await authFetch('/api/users/me');
      setUser(data);
      setAuthError(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setAuthError(error.message);
      // Only clear user if it's an authentication error
      if (error.message === 'Unauthorized' || error.message === 'No token found') {
        setUser(null);
        localStorage.removeItem('accessToken');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch when component mounts
    fetchUserData();

    // Set up event listener for storage changes (logout in other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        fetchUserData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchUserData]);

  // Provide a login function
  const login = useCallback(async (token) => {
    localStorage.setItem('accessToken', token);
    await fetchUserData();
  }, [fetchUserData]);

  // Provide a logout function
  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      loading, 
      login, 
      logout,
      fetchUserData,
      authError 
    }}>
      {children}
    </UserContext.Provider>
  );
}; 