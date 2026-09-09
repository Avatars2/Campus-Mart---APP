import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import styles from './WishlistScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { useCartWishlist } from '../context/CartWishlistContext';
import client from '../api/client';

export default function WishlistScreen({ navigation }) {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { removeFromWishlist, addToCart } = useCartWishlist();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await client.get('/wishlist');
      setWishlistItems(response.data.wishlist?.items || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    await removeFromWishlist(id);
    setWishlistItems(prev => prev.filter(item => (item.id || item._id) !== id));
  };

  const handleMoveToCart = async (item) => {
    if (!item.is_active) {
      Alert.alert('Unavailable', 'This item is no longer available.');
      return;
    }
    await addToCart(item, 1);
    await handleRemove(item.id || item._id);
    Alert.alert('Success', 'Item moved to Cart');
  };

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
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={wishlistItems}
        keyExtractor={item => item.id || item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#B0B7C3" />
            <Text style={styles.emptyText}>Your wishlist is empty</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
              
              {!item.is_active && (
                <Text style={styles.unavailableText}>Out of stock</Text>
              )}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(item.id || item._id)}>
                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.cartBtn, !item.is_active && styles.disabledBtn]} 
                onPress={() => handleMoveToCart(item)}
                disabled={!item.is_active}
              >
                <Ionicons name="cart-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

