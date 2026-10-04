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

  const loginStaff = async (username_or_phone, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username_or_phone,
        password,
      });
      const data = response.data;
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: data.user_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
      }));
      return { success: true, role: data.role };
    } catch (error) {
      const msg = extractErrorMessage(error, 'Login failed. Please check your username/phone and password.');
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginPatientWithOTP = async (phone, otp) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/patient/verify-otp', {
        phone,
        otp,
      });
      const data = response.data;
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        full_name: data.full_name,
        phone: data.phone,
        role: 'patient',
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: data.user_id,
        full_name: data.full_name,
        phone: data.phone,
        role: 'patient',
      }));
      return { success: true, role: 'patient' };
    } catch (error) {
      const msg = extractErrorMessage(error, 'Invalid or expired OTP. Please try again.');
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
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginStaff, loginPatientWithOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
