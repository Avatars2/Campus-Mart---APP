import React, { useCallback, useState } from 'react';
import styles from './CartScreen.styles';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartWishlist } from '../context/CartWishlistContext';
import client from '../api/client';
import useScreenRefresh from '../hooks/useScreenRefresh';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [removePromptItem, setRemovePromptItem] = useState(null);
  const { removeFromCart, removeFromWishlist, addToCart, refreshCounts } = useCartWishlist();
  const [updatingItemId, setUpdatingItemId] = useState(null);

  const loadCart = useCallback(async () => {
    const [cartResponse, wishlistResponse] = await Promise.all([
      client.get('/cart'),
      client.get('/wishlist'),
    ]);
    setSavedItems(wishlistResponse.data.wishlist?.items || []);
    return cartResponse.data.cart?.items || [];
  }, []);
  const saveCart = useCallback((items) => setCartItems(items), []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadCart, saveCart);

  const handleRemove = async (id) => {
    await removeFromCart(id);
    setCartItems(prev => prev.filter(ci => (ci.item.id || ci.item._id) !== id));
  };

  const confirmRemove = async () => {
    if (!removePromptItem) return;
    const itemId = removePromptItem.item.id || removePromptItem.item._id;
    setRemovePromptItem(null);
    await handleRemove(itemId);
  };

  const updateQuantity = async (cartItem, nextQuantity) => {
    const itemId = cartItem.item.id || cartItem.item._id;
    if (nextQuantity < 1 || nextQuantity > cartItem.item.quantity || updatingItemId === itemId) return;

    setUpdatingItemId(itemId);
    try {
      await client.patch(`/cart/${itemId}`, { quantity: nextQuantity });
      setCartItems((items) => items.map((currentItem) => (
        (currentItem.item.id || currentItem.item._id) === itemId
          ? { ...currentItem, quantity: nextQuantity }
          : currentItem
      )));
    } catch (error) {
      Alert.alert('Unable to update quantity', error.response?.data?.error || 'Please try again.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleSaveForLater = async (cartItem) => {
    const itemId = cartItem.item.id || cartItem.item._id;
    setUpdatingItemId(itemId);
    try {
      await client.post('/wishlist', { item_id: itemId });
      refreshCounts();
      await handleRemove(itemId);
      setSavedItems((items) => [cartItem.item, ...items.filter((item) => (item.id || item._id) !== itemId)]);
      Alert.alert('Saved for later', 'Item moved to your Wishlist.');
    } catch (error) {
      Alert.alert('Unable to save item', 'Please try again.');
    }
    setUpdatingItemId(null);
  };

  const handleMoveSavedToCart = async (item) => {
    const itemId = item.id || item._id;
    setUpdatingItemId(itemId);
    const added = await addToCart(item, 1);
    if (!added) {
      Alert.alert('Unable to add item', 'This item could not be added to your cart. Please try again.');
      setUpdatingItemId(null);
      return;
    }

    await removeFromWishlist(itemId);
    setSavedItems((items) => items.filter((savedItem) => (savedItem.id || savedItem._id) !== itemId));
    refreshCounts();
    await refresh();
    setUpdatingItemId(null);
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

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: '#697386', marginBottom: 16 }}>Unable to load your cart.</Text>
        <TouchableOpacity style={styles.checkoutBtn} onPress={retry}>
          <Text style={styles.checkoutBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.confirmationTitle}>Remove from Cart?</Text>
            <Text style={styles.confirmationMessage}>
              Are you sure you want to remove &quot;{removePromptItem?.item?.name}&quot; from your cart?
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={cartItems}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#0052CC']} />}
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
              <Text style={styles.itemPrice}>₹{ci.item.price}</Text>
              
              {!ci.item.is_active && (
                <Text style={styles.unavailableText}>Out of stock (Someone else bought this)</Text>
              )}
              <View style={styles.itemActionsRow}>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(ci, ci.quantity - 1)}
                    disabled={ci.quantity <= 1 || updatingItemId === (ci.item.id || ci.item._id) || !ci.item.is_active}
                    accessibilityLabel="Decrease quantity"
                  >
                    <Ionicons name="remove" size={16} color={ci.quantity <= 1 ? '#B0B7C3' : '#1A1F36'} />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{ci.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(ci, ci.quantity + 1)}
                    disabled={ci.quantity >= ci.item.quantity || updatingItemId === (ci.item.id || ci.item._id) || !ci.item.is_active}
                    accessibilityLabel="Increase quantity"
                  >
                    <Ionicons name="add" size={16} color={ci.quantity >= ci.item.quantity ? '#B0B7C3' : '#1A1F36'} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  onPress={() => handleSaveForLater(ci)}
                  disabled={updatingItemId === (ci.item.id || ci.item._id)}
                  style={styles.textAction}
                >
                  <Text style={styles.textActionLabel}>Save for later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRemovePromptItem(ci)}
                  disabled={updatingItemId === (ci.item.id || ci.item._id)}
                  style={styles.textAction}
                >
                  <Text style={styles.removeActionLabel}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.itemSummary}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalAmount}>₹{ci.item.price * ci.quantity}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={savedItems.length > 0 ? (
          <View style={styles.savedSection}>
            <View style={styles.savedSectionHeader}>
              <Ionicons name="bookmark-outline" size={19} color="#0052CC" />
              <Text style={styles.savedSectionTitle}>Saved for Later</Text>
            </View>
            {savedItems.map((item) => {
              const itemId = item.id || item._id;
              return (
                <View key={itemId} style={styles.savedCard}>
                  <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.savedImage} />
                  <View style={styles.savedDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    {!item.is_active && <Text style={styles.unavailableText}>Out of stock</Text>}
                    <TouchableOpacity
                      style={styles.moveToCartButton}
                      onPress={() => handleMoveSavedToCart(item)}
                      disabled={!item.is_active || updatingItemId === itemId}
                    >
                      <Ionicons name="cart-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.moveToCartText}>{item.is_active ? 'Move to Cart' : 'Unavailable'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
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



