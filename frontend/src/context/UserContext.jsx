import { createContext, useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let lastToken = localStorage.getItem('accessToken');
    let interval = setInterval(() => {
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken !== lastToken) {
        lastToken = currentToken;
        setLoading(true);
        if (!currentToken) {
          setUser(null);
          setLoading(false);
        } else {
          authFetch('/api/users/me')
            .then(data => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
        }
      }
    }, 500);
    // Initial fetch
    if (lastToken) {
      authFetch('/api/users/me')
        .then(data => setUser(data))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
    return () => clearInterval(interval);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}; 