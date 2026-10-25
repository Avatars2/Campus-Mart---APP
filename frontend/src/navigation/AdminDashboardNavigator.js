import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminHomeScreen from '../screens/Admin/Home';
import AdminUsersScreen from '../screens/Admin/Users';
import AdminItemsScreen from '../screens/Admin/Items';
import AdminCategoriesScreen from '../screens/Admin/Categories';
import AdminReportsScreen from '../screens/Admin/Reports';
import AdminReportDetails from '../screens/Admin/Reports/AdminReportDetails';
import AdminOrdersScreen from '../screens/Admin/Orders';
import AdminNotificationsScreen from '../screens/Admin/Notifications';
import AdminCreateNotificationScreen from '../screens/Admin/Notifications/AdminCreateNotification';
import AdminAnalyticsScreen from '../screens/Admin/Analytics';
import ProductDetailScreen from '../screens/Home/ProductDetail';
import SellerStoreScreen from '../screens/Home/SellerStore';

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
      <Stack.Screen name="AdminItems" component={AdminItemsScreen} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
      <Stack.Screen name="AdminCreateNotification" component={AdminCreateNotificationScreen} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="AdminReportDetail" component={AdminReportDetails} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={({ navigation }) => ({ headerShown: true, title: 'Item Details', headerLeft: (props) => ( <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}><Ionicons name="chevron-back" size={26} color="#0F1111" /></TouchableOpacity> ) })} />
      <Stack.Screen name="SellerStore" component={SellerStoreScreen} options={({ navigation }) => ({ headerShown: true, headerLeft: (props) => ( <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}><Ionicons name="chevron-back" size={26} color="#0F1111" /></TouchableOpacity> ) })} />
    </Stack.Navigator>
  );
}
