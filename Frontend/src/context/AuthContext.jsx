import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { login as apiLogin, register as apiRegister, getCurrentUser, logout as apiLogout } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = useMemo(() => {
    return user !== null && !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }, [user]);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    setUser(null);
    setError(null);
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser({
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
      });
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiLogin(email, password);

      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.token);
      }

      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          role: response.user.role,
        });
      }

      return response;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setError(message);
      clearAuth();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  const register = useCallback(async (data) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiRegister(data);

      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.token);
      }

      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          role: response.user.role,
        });
      }

      return response;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      setError(message);
      clearAuth();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors on logout
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      login,
      register,
      logout,
      clearError,
    }),
    [user, loading, error, isAuthenticated, login, register, logout, clearError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;