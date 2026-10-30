import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import ProfileScreen from '../screens/Profile';
import EditProfileScreen from '../screens/Profile/EditProfile';
import Payment from '../screens/Profile/Payment';
import ChangePasswordScreen from '../screens/Profile/ChangePassword';
import MyReports from '../screens/Profile/MyReports';
import ReportDetails from '../screens/Profile/ReportDetails';
import HelpScreen from '../screens/Profile/Help';

const Stack = createNativeStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Payment" component={Payment} options={{ title: 'Payment' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="MyReports" component={MyReports} options={{ headerShown: false, title: 'Report' }} />
      <Stack.Screen name="ReportDetail" component={ReportDetails} options={{ headerShown: false }} />
      <Stack.Screen name="ReportDetails" component={ReportDetails} options={{ headerShown: false }} />
      <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false, title: 'Help' }} />
    </Stack.Navigator>
  );
}
