import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      localStorage.setItem('sr_token', urlToken);
      return urlToken;
    }
    return localStorage.getItem('sr_token');
  })
  
  const [role, setRole] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let urlRole = urlParams.get('role');
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      if (!urlRole) {
         try {
           const payload = JSON.parse(atob(urlToken.split('.')[1]));
           urlRole = payload.role || 'PASSENGER'; // Default to PASSENGER for Google Auth if missing
         } catch (e) {}
      }
      if (urlRole) {
        localStorage.setItem('sr_role', urlRole);
        return urlRole;
      }
    }
    return localStorage.getItem('sr_role');
  })
  
  const [user, setUser] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      try {
        const payload = JSON.parse(atob(urlToken.split('.')[1]));
        const u = { email: payload.sub, name: payload.sub?.split('@')[0] || 'User' };
        localStorage.setItem('sr_user', JSON.stringify(u));
        return u;
      } catch (e) {
        console.error('Failed to parse token payload from URL:', e);
      }
    }
    const u = localStorage.getItem('sr_user')
    return u ? JSON.parse(u) : null
  })

  // Clean the URL search params after all initial state is settled
  useEffect(() => {
    if (window.location.search.includes('token=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const login = (tokenVal, roleVal, userData) => {
    localStorage.setItem('sr_token', tokenVal)
    localStorage.setItem('sr_role', roleVal)
    localStorage.setItem('sr_user', JSON.stringify(userData))
    setToken(tokenVal)
    setRole(roleVal)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('sr_token')
    localStorage.removeItem('sr_role')
    localStorage.removeItem('sr_user')
    setToken(null)
    setRole(null)
    setUser(null)
  }

  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{ token, role, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
