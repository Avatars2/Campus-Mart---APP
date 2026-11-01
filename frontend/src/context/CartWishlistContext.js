import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';
import { AuthContext } from './AuthContext';
import getPusherClient from '../utils/pusher';

const CartWishlistContext = createContext();

export const useCartWishlist = () => useContext(CartWishlistContext);

export const CartWishlistProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistItemIds, setWishlistItemIds] = useState([]);
  const { user } = useContext(AuthContext);

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
        const items = wishlistRes.data.wishlist.items || [];
        setWishlistCount(items.length);
        setWishlistItemIds(items.map((item) => (
          typeof item === 'object' ? item.id || item._id : item
        )));
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error('Error fetching cart/wishlist counts:', error);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCounts();
    } else {
      setCartCount(0);
      setWishlistCount(0);
      setWishlistItemIds([]);
    }
  }, [user?.id]);

  // Real-time sync for cart & wishlist counts
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const onSync = () => {
      if (user?.id) fetchCounts();
    };

    const marketChannel = pusher.subscribe('market-items');
    marketChannel.bind('item:updated', onSync);
    marketChannel.bind('item:deleted', onSync);

    let userChannel = null;
    const userId = user?.id || user?._id;
    if (userId) {
      userChannel = pusher.subscribe(`user-${userId}`);
      userChannel.bind('order:created', onSync);
      userChannel.bind('order:updated', onSync);
    }

    return () => {
      marketChannel.unbind('item:updated', onSync);
      marketChannel.unbind('item:deleted', onSync);
      if (userChannel) {
        userChannel.unbind('order:created', onSync);
        userChannel.unbind('order:updated', onSync);
      }
    };
  }, [user?.id, user?._id]);

  const addToCart = async (item, quantity = 1) => {
    const itemId = item.id || item._id;

    try {
      await client.post('/cart', { item_id: itemId, quantity });
      fetchCounts();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
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
    const itemId = item.id || item._id;
    const isWishlisted = wishlistItemIds.includes(itemId);

    try {
      if (isWishlisted) {
        await client.delete(`/wishlist/${itemId}`);
        setWishlistItemIds((currentIds) => currentIds.filter((id) => id !== itemId));
        setWishlistCount((count) => Math.max(0, count - 1));
      } else {
        await client.post('/wishlist', { item_id: itemId });
        setWishlistItemIds((currentIds) => [...currentIds, itemId]);
        setWishlistCount((count) => count + 1);
      }
      return !isWishlisted;
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return isWishlisted;
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
    if (user?.id) fetchCounts();
  };

  return (
    <CartWishlistContext.Provider value={{ 
      cartCount, 
      wishlistCount, 
      wishlistItemIds,
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
