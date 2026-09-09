import React, { useEffect, useState } from 'react';
import styles from './CartScreen.styles';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartWishlist } from '../context/CartWishlistContext';
import client from '../api/client';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { removeFromCart, refreshCounts } = useCartWishlist();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await client.get('/cart');
      setCartItems(response.data.cart?.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    await removeFromCart(id);
    setCartItems(prev => prev.filter(ci => (ci.item.id || ci.item._id) !== id));
  };

  const handleCheckout = () => {
    const availableItems = cartItems.filter(ci => ci.item.is_active);
    if (availableItems.length === 0) {
      Alert.alert('Cart is empty', 'You have no available items to checkout.');
      return;
    }
    
    // Convert to the format expected by checkout
    const checkoutItems = availableItems.map(ci => ({
      id: ci.item.id || ci.item._id,
      name: ci.item.name,
      price: ci.item.price,
      quantity: ci.quantity
    }));

    // Navigate to the Checkout screen
    navigation.navigate('Checkout', { 
      checkoutItems,
      fromCart: true 
    });
  };

  const total = cartItems
    .filter(ci => ci.item.is_active)
    .reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={ci => ci.id || ci._id || (ci.item && (ci.item.id || ci.item._id))}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#B0B7C3" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
          </View>
        }
        renderItem={({ item: ci }) => (
          <View style={[styles.itemCard, !ci.item.is_active && { opacity: 0.6 }]}>
            <Image source={{ uri: ci.item.images?.[0] || 'https://via.placeholder.com/150' }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>{ci.item.name}</Text>
              <Text style={styles.itemPrice}>₹{ci.item.price} x {ci.quantity}</Text>
              
              {!ci.item.is_active && (
                <Text style={styles.unavailableText}>Out of stock (Someone else bought this)</Text>
              )}
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(ci.item.id || ci.item._id)}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      />

      {cartItems.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₹{total}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}



