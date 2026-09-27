import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import ProfileScreen from '../screens/Profile';
import EditProfileScreen from '../screens/Profile/EditProfile';
import ChangePasswordScreen from '../screens/Profile/ChangePassword';
import MyReportsScreen from '../screens/Profile/MyReportsScreen';
import ReportDetailScreen from '../screens/Profile/ReportDetailScreen';

const Stack = createNativeStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
