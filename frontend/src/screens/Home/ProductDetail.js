import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartWishlist } from '../../context/CartWishlistContext';
import styles from './ProductDetail.styles';
import RatingStars from '../../components/commerce/RatingStars';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const { addToCart, toggleWishlist, wishlistItemIds } = useCartWishlist();
  const [activeSlide, setActiveSlide] = useState(0);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [wishlistUpdating, setWishlistUpdating] = useState(false);

  const itemId = item.id || item._id;
  const isWishlisted = wishlistItemIds.includes(itemId);

  const handleToggleWishlist = async () => {
    if (wishlistUpdating) return;
    setWishlistUpdating(true);
    await toggleWishlist(item);
    setWishlistUpdating(false);
  };

  const handleAddToCartClick = () => {
    setConfirmModalVisible(true);
  };

  const confirmAddToCart = async () => {
    await addToCart(item, 1);
    setConfirmModalVisible(false);
  };

  const handleBuyNow = () => {
    navigation.navigate('Checkout', { 
      checkoutItems: [{
        id: item.id || item._id,
        name: item.name,
        price: item.price,
        quantity: 1
      }],
      fromCart: false
    });
  };

  const images = item.images && item.images.length > 0
    ? item.images
    : ['https://via.placeholder.com/400'];

  const sellerImage = item.seller_image
    ? { uri: item.seller_image }
    : { uri: 'https://via.placeholder.com/100' };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setActiveSlide(index);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
          >
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={styles.carouselImage} />
            ))}
          </ScrollView>

          {/* Image Counter */}
          {images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>{activeSlide + 1}/{images.length}</Text>
            </View>
          )}

          {/* Pagination Dots */}
          {images.length > 1 && (
            <View style={styles.paginationContainer}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.paginationDot,
                    i === activeSlide ? styles.paginationDotActive : styles.paginationDotInactive
                  ]}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={handleToggleWishlist}
            disabled={wishlistUpdating}
            accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            activeOpacity={0.8}
          >
            <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Product Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.titlePriceRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>

          <View style={styles.badgesRow}>
            {item.listing_type && (
              <View style={[styles.badge, { backgroundColor: item.listing_type === 'rent' ? '#FEF2F2' : '#F0FDF4', borderColor: item.listing_type === 'rent' ? '#FECACA' : '#BBF7D0' }]}>
                <Text style={[styles.badgeText, { color: item.listing_type === 'rent' ? '#DC2626' : '#16A34A' }]}>
                  {item.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
                </Text>
              </View>
            )}
            {item.quantity !== undefined && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Qty: {item.quantity}</Text>
              </View>
            )}
            {item.condition_rating && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {{ 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' }[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')}
                </Text>
              </View>
            )}
            {item.category_name && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.category_name}</Text>
              </View>
            )}
            {item.created_at && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{formatDate(item.created_at)}</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingSummary}>
            <RatingStars value={item.average_rating} count={item.ratings_count} size={18} />
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{item.description || 'No description provided.'}</Text>

          <Text style={styles.sectionTitle}>Seller</Text>
          <TouchableOpacity 
            style={styles.sellerCard}
            onPress={() => navigation.navigate('Messages', {
              screen: 'ChatThread',
              params: {
                itemId: item._id || item.id,
                otherUserId: item.seller_id || (typeof item.seller === 'object' ? (item.seller._id || item.seller.id) : item.seller),
                itemName: item.name,
                otherUserName: item.seller_name || (typeof item.seller === 'object' ? item.seller.full_name : 'Seller')
              }
            })}
          >
            <Image source={sellerImage} style={styles.sellerAvatar} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{item.seller_name}</Text>
              <Text style={styles.sellerSubtitle}>Campus Seller · Verified Student</Text>
            </View>
            <Ionicons name="chatbubble-outline" size={24} color="#0052CC" style={{ marginRight: 15 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          activeOpacity={0.85}
          onPress={handleAddToCartClick}
        >
          <Ionicons name="cart-outline" size={20} color="#0052CC" />
          <Text style={styles.secondaryButtonText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.primaryButton} 
          activeOpacity={0.85}
          onPress={handleBuyNow}
        >
          <Ionicons name="flash-outline" size={20} color="#FFF" />
          <Text style={styles.primaryButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      {/* Add to Cart Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="cart" size={32} color="#0052CC" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1F36', marginBottom: 8, textAlign: 'center' }}>Add to Cart?</Text>
            <Text style={{ fontSize: 16, color: '#697386', marginBottom: 24, textAlign: 'center', lineHeight: 22 }}>
              Are you sure you want to add "{item.name}" to your cart?
            </Text>
            
            <View style={{ width: '100%', flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#F0F5FF', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#D6E4FF' }}
                onPress={() => setConfirmModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#0052CC', fontSize: 16, fontWeight: '600' }}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#0052CC', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                onPress={confirmAddToCart}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
