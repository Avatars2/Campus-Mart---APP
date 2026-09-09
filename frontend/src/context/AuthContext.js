import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('student');
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
        }
      } catch (error) {
        console.error('Failed to check token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  const signIn = async (token, user) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userRole', user?.role || 'student');
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      setUserRole(user?.role || 'student');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userInfo');
      setIsAuthenticated(false);
      setUserRole('student');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
