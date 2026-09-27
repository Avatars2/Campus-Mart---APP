import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminHomeScreen from '../screens/Admin/Home';
import AdminUsersScreen from '../screens/Admin/Users';
import AdminItemsScreen from '../screens/Admin/Items';
import AdminCategoriesScreen from '../screens/Admin/Categories';
import AdminReportsScreen from '../screens/Admin/Reports';
import AdminReportDetailScreen from '../screens/Admin/Reports/AdminReportDetailScreen';
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
        <Stack.Screen name="AdminReportDetail" component={AdminReportDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Item Details' }} />
      <Stack.Screen name="SellerStore" component={SellerStoreScreen} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}
