import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { extractErrorMessage } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  const setAuthSession = (data) => {
    const userData = {
      id: data.user_id,
      username: data.username,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone,
      role: data.role,
      district: data.jurisdiction_district || null,
      state: data.jurisdiction_state || null,
    };
    setToken(data.access_token);
    setUser(userData);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });
      const data = response.data;
      setAuthSession(data);
      return { success: true, role: data.role };
    } catch (error) {
      const msg = extractErrorMessage(error, 'Sign in failed. Please check your username and password.');
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginPatient = async (phone, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login/patient', {
        phone: phone.trim(),
        password,
      });
      const data = response.data;
      setAuthSession(data);
      return { success: true, role: 'patient' };
    } catch (error) {
      const msg = extractErrorMessage(
        error,
        'Sign in failed. If you have not visited a village health camp yet, please visit our camp to get registered.'
      );
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signupStaff = async (staffData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/signup/staff', staffData);
      const data = response.data;
      setAuthSession(data);
      return { success: true, role: data.role };
    } catch (error) {
      const msg = extractErrorMessage(error, 'Account creation failed. Please check your information.');
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginPatient,
        signupStaff,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
