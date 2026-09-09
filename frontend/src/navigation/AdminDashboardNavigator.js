import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminHomeScreen from '../screens/Admin/Home';
import AdminUsersScreen from '../screens/Admin/Users';

const Stack = createNativeStackNavigator();

export default function AdminDashboardNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use our custom headers within the screens
      }}
    >
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
    </Stack.Navigator>
  );
}
