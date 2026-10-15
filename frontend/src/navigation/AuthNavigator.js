import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LandingScreen from '../screens/Auth/Landing';
import LoginScreen from '../screens/Auth/Login';
import RegisterScreen from '../screens/Auth/Register';
import ForgotPasswordScreen from '../screens/Auth/ForgotPassword';
import VerifyLoginOTPScreen from '../screens/Auth/VerifyLoginOTP';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false, // Hide headers for auth flow for a cleaner look
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'CampusMart' }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'OTP Login' }} />
      <Stack.Screen name="VerifyLoginOTP" component={VerifyLoginOTPScreen} />
    </Stack.Navigator>
  );
}
