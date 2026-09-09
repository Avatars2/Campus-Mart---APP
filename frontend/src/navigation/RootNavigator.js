import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import AdminNavigator from './AdminNavigator';
import { AuthContext } from '../context/AuthContext';

export default function RootNavigator() {
  const { isAuthenticated, userRole, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : userRole === 'admin' ? (
        <AdminNavigator />
      ) : (
        <AppNavigator />
      )}
    </>
  );
}
