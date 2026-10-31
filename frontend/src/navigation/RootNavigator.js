import React, { useContext } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import AdminNavigator from './AdminNavigator';
import { AuthContext } from '../context/AuthContext';

export default function RootNavigator() {
  const { isAuthenticated, userRole, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Image source={require('../../assets/logo.png')} style={{ width: 140, height: 140, borderRadius: 70, marginBottom: 20 }} resizeMode="contain" />
        <ActivityIndicator size="large" color="#007185" />
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
