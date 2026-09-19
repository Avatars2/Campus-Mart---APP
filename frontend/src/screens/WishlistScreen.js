import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl, Modal, Animated } from 'react-native';
import styles from './WishlistScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { useCartWishlist } from '../context/CartWishlistContext';
import client from '../api/client';
import useScreenRefresh from '../hooks/useScreenRefresh';

export default function WishlistScreen({ navigation }) {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartPromptItem, setCartPromptItem] = useState(null);
  const [removePromptItem, setRemovePromptItem] = useState(null);
  const { removeFromWishlist, addToCart } = useCartWishlist();

  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(titleSlideAnim, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const loadWishlist = useCallback(async () => {
    const response = await client.get('/wishlist');
    return response.data.wishlist?.items || [];
  }, []);
  const saveWishlist = useCallback((items) => setWishlistItems(items), []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadWishlist, saveWishlist);

  const handleRemove = async (id) => {
    await removeFromWishlist(id);
    setWishlistItems(prev => prev.filter(item => (item.id || item._id) !== id));
  };

  const handleRemovePress = (item) => {
    setRemovePromptItem(item);
  };

  const confirmRemove = async () => {
    if (!removePromptItem) return;
    const itemId = removePromptItem.id || removePromptItem._id;
    setRemovePromptItem(null);
    await handleRemove(itemId);
  };

  const handleMoveToCart = async (item) => {
    setCartPromptItem(null);
    if (!item.is_active) {
      Alert.alert('Unavailable', 'This item is no longer available.');
      return;
    }
    const added = await addToCart(item, 1);
    if (!added) {
      Alert.alert('Unable to add item', 'This item could not be added to your cart. Please try again.');
      return;
    }

    await handleRemove(item.id || item._id);
    navigation.navigate('Cart');
  };

  const handleCartPress = (item) => {
    if (!item.is_active) {
      Alert.alert('Unavailable', 'This item is no longer available.');
      return;
    }
    setCartPromptItem(item);
  };

  const handleOpenItem = (item) => {
    navigation.navigate('MainTabs', {
      screen: 'Home',
      params: {
        screen: 'ProductDetail',
        params: { item },
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: '#697386', marginBottom: 16 }}>Unable to load your wishlist.</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={retry}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={Boolean(cartPromptItem)}
        animationType="fade"
        transparent
        onRequestClose={() => setCartPromptItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="cart" size={32} color="#0052CC" />
            </View>
            <Text style={styles.confirmationTitle}>Add to Cart?</Text>
            <Text style={styles.confirmationMessage}>
              Are you sure you want to add &quot;{cartPromptItem?.name}&quot; to your cart?
            </Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.noButton}
                onPress={() => setCartPromptItem(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.noButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.yesButton}
                onPress={() => handleMoveToCart(cartPromptItem)}
                activeOpacity={0.85}
              >
                <Text style={styles.yesButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(removePromptItem)}
        animationType="fade"
        transparent
        onRequestClose={() => setRemovePromptItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.removeConfirmationIcon}>
              <Ionicons name="trash-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.confirmationTitle}>Remove from Wishlist?</Text>
            <Text style={styles.confirmationMessage}>
              Are you sure you want to remove &quot;{removePromptItem?.name}&quot; from your wishlist?
            </Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.noButton}
                onPress={() => setRemovePromptItem(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.noButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeYesButton}
                onPress={confirmRemove}
                activeOpacity={0.85}
              >
                <Text style={styles.yesButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Animated.Text style={[styles.headerTitle, { opacity: titleFadeAnim, transform: [{ translateY: titleSlideAnim }] }]}>
          My<Text style={{ color: '#007185' }}>Wishlist</Text>
        </Animated.Text>
      </View>

      <FlatList
        data={wishlistItems}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#0052CC']} />}
        keyExtractor={item => item.id || item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#B0B7C3" />
            <Text style={styles.emptyText}>Your wishlist is empty</Text>
          </View>
        }
        renderItem={({ item }) => {
          const conditionMap = { 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' };
          const condition = item.condition_rating ? (conditionMap[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')) : '';
          
          return (
            <View style={styles.itemCard}>
              <TouchableOpacity style={styles.itemImageContainer} onPress={() => handleOpenItem(item)} activeOpacity={0.75}>
                <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} style={styles.itemImage} />
              </TouchableOpacity>
              
              <View style={styles.itemDetails}>
                <TouchableOpacity onPress={() => handleOpenItem(item)} activeOpacity={0.75}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </TouchableOpacity>

                <View style={styles.badgeRow}>
                  {item.listing_type === 'rent' ? (
                    <View style={[styles.conditionBadge, { backgroundColor: '#007185' }]}>
                      <Text style={styles.conditionBadgeText}>{item.is_currently_rented ? 'Rented' : 'Rent'}</Text>
                    </View>
                  ) : condition ? (
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionBadgeText}>{condition}</Text>
                    </View>
                  ) : null}
                </View>

                {item.is_active ? (
                  <Text style={styles.stockText}>In Stock</Text>
                ) : (
                  <Text style={styles.unavailableText}>Currently unavailable.</Text>
                )}

                <View style={styles.actionContainer}>
                  <TouchableOpacity 
                    style={[styles.cartBtn, !item.is_active && styles.disabledBtn]} 
                    onPress={() => handleCartPress(item)}
                    disabled={!item.is_active}
                    accessibilityLabel="Add to cart"
                  >
                    <Text style={styles.cartBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemovePress(item)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

