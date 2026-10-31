import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check token on initial load
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('userRole');
        if (token) {
          setIsAuthenticated(true);
          setUserRole(role || 'student');
          const userInfo = await AsyncStorage.getItem('userInfo');
          setUser(userInfo ? JSON.parse(userInfo) : null);
        }
      } catch (error) {
        console.error('Failed to check token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();

    // Global listener for forced logouts (suspensions or invalid tokens)
    let isHandlingAuthError = false;
    const { DeviceEventEmitter, Alert } = require('react-native');
    const authListener = DeviceEventEmitter.addListener('AUTH_ERROR', async (data) => {
      if (isHandlingAuthError) return;
      isHandlingAuthError = true;
      setTimeout(() => { isHandlingAuthError = false; }, 3000);

      if (data?.isSuspended) {
        Alert.alert('Account Suspended', 'Your account has been suspended by the administrator.');
      } else {
        Alert.alert('Session Expired', 'Please log in again.');
      }

      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userInfo');
        setIsAuthenticated(false);
        setUserRole('student');
        setUser(null);
      } catch (e) {
        console.error('Logout error', e);
      }
    });

    return () => {
      authListener.remove();
    };
  }, []);

  const signIn = async (token, user, refreshToken = null) => {
    try {
      await AsyncStorage.setItem('token', token);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      await AsyncStorage.setItem('userRole', user?.role || 'student');
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      setUserRole(user?.role || 'student');
      setUser(user || null);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  const signOut = async () => {
    try {
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      // Notify backend to invalidate refresh token
      await client.post('/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userInfo');
      setIsAuthenticated(false);
      setUserRole('student');
      setUser(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
