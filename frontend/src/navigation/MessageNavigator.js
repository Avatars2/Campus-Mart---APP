import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MessageList from '../screens/Messages';
import ChatThread from '../screens/Messages/ChatThread';

const Stack = createNativeStackNavigator();

export default function MessageNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1A1F36',
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        headerTintColor: '#0052CC',
      }}
    >
      <Stack.Screen 
        name="MessageList" 
        component={MessageList} 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="ChatThread" 
        component={ChatThread} 
      />
    </Stack.Navigator>
  );
}
