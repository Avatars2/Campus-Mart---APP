import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/Home/index';
import ProductDetailScreen from '../screens/Home/ProductDetail';
import SellerStoreScreen from '../screens/Home/SellerStore';

const Stack = createNativeStackNavigator();

export default function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
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
      <Stack.Screen 
        name="SellerStore" 
        component={SellerStoreScreen} 
        options={({ navigation }) => ({
          headerShown: true,
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
