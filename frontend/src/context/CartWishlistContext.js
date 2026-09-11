import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';
import { AuthContext } from './AuthContext';

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
      console.error('Error fetching cart/wishlist counts:', error);
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
