// client/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    // Check if user is already logged in
    const loadUser = async () => {
      setLoading(true);
      try {
        if (token) {
          const res = await api.get('/auth/me');
          
          if (res.data.success) {
            setUser(res.data.data);
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        }
        setError(null);
      } catch (err) {
        console.error('Error loading user', err);
        localStorage.removeItem('token');
        setToken(null);
        setError(err.response?.data?.message || 'Failed to authenticate');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [token]);

  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', userData);
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
      }
    } catch (err) {
      console.error('Registration error', err);
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
      }
    } catch (err) {
      console.error('Login error', err);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put('/auth/updatedetails', userData);
      
      if (res.data.success) {
        setUser(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error('Update profile error', err);
      setError(err.response?.data?.message || 'Update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update user password
  const updatePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put('/auth/updatepassword', { 
        currentPassword, 
        newPassword 
      });
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        return true;
      }
    } catch (err) {
      console.error('Update password error', err);
      setError(err.response?.data?.message || 'Password update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get passenger details
  const getPassengerDetails = async () => {
    try {
      const res = await api.get('/auth/passenger');
      
      if (res.data.success) {
        return res.data.data;
      }
    } catch (err) {
      console.error('Get passenger details error', err);
      throw err;
    }
  };

  // Set authentication in chat context
  const setAuthenticated = async (sessionId) => {
    try {
      const res = await api.post('/chat/set-authenticated', { sessionId });
      return res.data;
    } catch (err) {
      console.error('Set authenticated error', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        token,
        register,
        login,
        logout,
        updateProfile,
        updatePassword,
        getPassengerDetails,
        setAuthenticated
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;