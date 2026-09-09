import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AdminDashboardNavigator from './AdminDashboardNavigator';
import AdminCategoriesScreen from '../screens/Admin/Categories';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'AdminDashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'AdminCategories') {
            iconName = focused ? 'pricetags' : 'pricetags-outline';
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
      <Tab.Screen name="AdminDashboard" component={AdminDashboardNavigator} options={{ title: 'Dashboard', headerShown: false }} />
      <Tab.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ title: 'Categories', headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ title: 'Profile', headerShown: false }} />
    </Tab.Navigator>
  );
}
