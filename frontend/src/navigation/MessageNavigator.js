import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MessageList from '../screens/Messages';
import ChatThread from '../screens/Messages/ChatThread';
import BuyingRequestsGroup from '../screens/Messages/BuyingRequestsGroup';
import ProductDetailScreen from '../screens/Home/ProductDetail';

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
        headerLeft: (props) => ( <TouchableOpacity onPress={() => props.canGoBack && props.onPress ? props.onPress() : null} style={{ paddingRight: 16 }}><Ionicons name="chevron-back" size={26} color="#0052CC" /></TouchableOpacity> ),
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
        name="BuyingRequestsGroup" 
        component={BuyingRequestsGroup} 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="ChatThread" 
        component={ChatThread} 
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Item Details',
          headerLeft: (props) => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
              <Ionicons name="chevron-back" size={26} color="#0F1111" />
            </TouchableOpacity>
          )
        })} 
      />
    </Stack.Navigator>
  );
}
