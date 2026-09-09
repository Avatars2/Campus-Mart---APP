import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const CartWishlistContext = createContext();

export const useCartWishlist = () => useContext(CartWishlistContext);

export const CartWishlistProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [userId, setUserId] = useState(null);

  const fetchCounts = async () => {
    try {
      const [cartRes, wishlistRes] = await Promise.all([
        client.get('/cart'),
        client.get('/wishlist')
      ]);

      if (cartRes.data?.cart) {
        setCartCount(cartRes.data.cart.items.length);
      }
      if (wishlistRes.data?.wishlist) {
        setWishlistCount(wishlistRes.data.wishlist.items.length);
      }
    } catch (error) {
      console.error('Error fetching cart/wishlist counts:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserId(userInfo.id);
        fetchCounts();
      }
    };
    initialize();
  }, []);

  const addToCart = async (item, quantity = 1) => {
    try {
      await client.post('/cart', { item_id: item.id, quantity });
      fetchCounts();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await client.delete(`/cart/${itemId}`);
      fetchCounts();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const toggleWishlist = async (item) => {
    try {
      // For simplicity, we just post to add. A full toggle would check if it exists first.
      await client.post('/wishlist', { item_id: item.id });
      fetchCounts();
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const removeFromWishlist = async (itemId) => {
    try {
      await client.delete(`/wishlist/${itemId}`);
      fetchCounts();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const refreshCounts = () => {
    if (userId) fetchCounts();
  };

  return (
    <CartWishlistContext.Provider value={{ 
      cartCount, 
      wishlistCount, 
      refreshCounts, 
      addToCart, 
      removeFromCart, 
      toggleWishlist, 
      removeFromWishlist 
    }}>
      {children}
    </CartWishlistContext.Provider>
  );
};
