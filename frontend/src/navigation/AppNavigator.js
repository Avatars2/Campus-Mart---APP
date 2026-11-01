import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeNavigator from './HomeNavigator';
import BuyScreen from '../screens/Buy';
import SellNavigator from './SellNavigator';
import ProfileNavigator from './ProfileNavigator';
import MessageNavigator from './MessageNavigator';
import { useMessages } from '../context/MessageContext';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Notification from '../screens/Notification';
import { useNotifications } from '../context/NotificationContext';
import { TouchableOpacity, Text } from 'react-native';
import Cart from '../screens/Cart';
import Wishlist from '../screens/Wishlist';
import Checkout from '../screens/Checkout/Checkout';
import OrderSuccess from '../screens/Checkout/OrderSuccess';
import NotificationDetail from '../screens/NotificationDetail';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { unreadCount: messageCount } = useMessages();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Buy') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Sell') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={iconName} size={24} color={color} />
              {focused && (
                <View style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: '#0052CC',
                  marginTop: 4,
                }} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#0052CC',
        tabBarInactiveTintColor: '#B0B7C3',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1A1F36',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeNavigator} 
        options={{ title: 'Home', headerShown: false }} 
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Home', { screen: 'HomeMain' });
          },
        })}
      />
      <Tab.Screen name="Buy" component={BuyScreen} options={{ title: 'Buy', headerShown: false }} />
      <Tab.Screen 
        name="Sell" 
        component={SellNavigator} 
        options={{ title: 'Sell', headerShown: false }} 
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Sell', { screen: 'SellMain' });
          },
        })}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessageNavigator} 
        options={{ 
          title: 'Messages', 
          headerShown: false,
          tabBarBadge: messageCount > 0 ? messageCount : null,
          tabBarBadgeStyle: { backgroundColor: '#FF3B30' }
        }} 
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Messages', { screen: 'MessageList' });
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator} 
        options={{ title: 'Profile', headerShown: false }} 
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Profile', { screen: 'ProfileMain' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { unreadCount: notifCount } = useNotifications();

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={Notification} 
        options={{ 
          presentation: 'modal',
          headerShown: false 
        }} 
      />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Cart" 
        component={Cart} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Wishlist" 
        component={Wishlist} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Checkout" 
        component={Checkout} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="OrderSuccess" 
        component={OrderSuccess} 
        options={{ headerShown: false, gestureEnabled: false }} 
      />
    </Stack.Navigator>
  );
}
