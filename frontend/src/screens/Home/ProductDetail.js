import React, { useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, Modal, TextInput, Linking } from 'react-native';
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
  const [wishlistModalVisible, setWishlistModalVisible] = useState(false);
  const [wishlistUpdating, setWishlistUpdating] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 8, paddingHorizontal: 10, height: 40, width: '100%' }}>
          <Ionicons name="search" size={20} color="#565959" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search items"
            style={{ flex: 1, fontSize: 16, color: '#0F1111' }}
            placeholderTextColor="#565959"
            returnKeyType="search"
            onSubmitEditing={(e) => {
              if (e.nativeEvent.text.trim()) {
                navigation.navigate('HomeMain', { searchQuery: e.nativeEvent.text.trim() });
              }
            }}
          />
        </View>
      ),
      headerTitleContainerStyle: { width: '85%', paddingRight: 10 },
    });
  }, [navigation]);

  const itemId = item.id || item._id;
  const isWishlisted = wishlistItemIds.includes(itemId);

  const handleToggleWishlistClick = () => {
    setWishlistModalVisible(true);
  };

  const confirmToggleWishlist = async () => {
    if (wishlistUpdating) return;
    setWishlistUpdating(true);
    await toggleWishlist(item);
    setWishlistUpdating(false);
    setWishlistModalVisible(false);
  };

  const handleAddToCartClick = () => {
    setConfirmModalVisible(true);
  };

  const confirmAddToCart = async () => {
    await addToCart(item, 1);
    setConfirmModalVisible(false);
  };

  const handleBuyNow = () => {
    if (item.is_currently_rented) return;
    navigation.navigate('Checkout', { 
      checkoutItems: [{
        id: item.id || item._id,
        name: item.name,
        price: item.price,
        listing_type: item.listing_type,
        rental_period: item.rental_period,
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
        
        {/* TOP SECTION: Seller, Ratings, Title */}
        <View style={styles.topHeaderContainer}>
          <View style={styles.storeRow}>
            <View>
              <View style={styles.storeNameRow}>
                <Image source={sellerImage} style={styles.storeIcon} />
                <Text style={styles.storeNameText}>{item.seller_name}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                const sId = typeof item.seller_id === 'object' ? (item.seller_id.id || item.seller_id._id) : (item.seller_id || (typeof item.seller === 'object' ? (item.seller.id || item.seller._id) : item.seller));
                const sImage = item.seller_image || (typeof item.seller_id === 'object' ? item.seller_id.profile_photo_url : null) || (typeof item.seller === 'object' ? item.seller.profile_photo_url : null);
                
                navigation.navigate('SellerStore', {
                  sellerId: sId,
                  sellerName: item.seller_name || (typeof item.seller === 'object' ? item.seller.full_name : 'Seller'),
                  sellerImage: sImage
                });
              }}>
                <Text style={styles.visitStoreText}>Visit the store</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSummaryTop}>
              <Text style={styles.ratingStarsTop}>
                {item.average_rating > 0 ? '★'.repeat(Math.round(item.average_rating)) + '☆'.repeat(5 - Math.round(item.average_rating)) : '☆☆☆☆☆'}
              </Text>
              <Text style={styles.ratingValueTop}>{item.ratings_count}</Text>
            </View>
          </View>
          
          <Text style={styles.productTitle}>{item.name}</Text>
          <Text style={styles.statsText}>{item.quantity > 0 ? `${item.quantity}+ available` : 'Out of stock'}</Text>
        </View>

        {/* IMAGE SECTION */}
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

          {/* Wishlist Button over Image */}
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={handleToggleWishlistClick}
            disabled={wishlistUpdating}
            accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            activeOpacity={0.8}
          >
            <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* PRICE & BUYING SECTION */}
        <View style={styles.buySection}>
          <View style={styles.priceRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.priceText}>{item.price}</Text>
            {item.listing_type === 'rent' && (
              <Text style={styles.rentalPeriodText}>/ {item.rental_period || 'day'}</Text>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.actionButtonYellow, item.is_currently_rented && styles.disabledButton]}
            activeOpacity={0.85}
            onPress={handleAddToCartClick}
            disabled={item.is_currently_rented}
          >
            <Text style={styles.actionButtonYellowText}>Add to Cart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButtonOrange, item.is_currently_rented && styles.disabledButton]}
            activeOpacity={0.85}
            onPress={handleBuyNow}
            disabled={item.is_currently_rented}
          >
            <Text style={styles.actionButtonOrangeText}>{item.is_currently_rented ? 'Currently Rented' : item.listing_type === 'rent' ? 'Rent Now' : 'Buy Now'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* DESCRIPTION SECTION */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          
          <View style={styles.badgesRow}>
            {item.listing_type && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.listing_type === 'rent' ? 'Rent' : 'Sale'}
                </Text>
              </View>
            )}
            {item.condition_rating && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Condition: {{ 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' }[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')}
                </Text>
              </View>
            )}
            {item.category_name && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Category: {item.category_name}</Text>
              </View>
            )}
            {item.created_at && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Listed: {formatDate(item.created_at)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.descriptionText}>{item.description || 'No description provided.'}</Text>

          {/* Seller Card */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Seller</Text>
          <View style={styles.sellerCard}>
            <TouchableOpacity 
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                const sId = typeof item.seller_id === 'object' ? (item.seller_id.id || item.seller_id._id) : (item.seller_id || (typeof item.seller === 'object' ? (item.seller.id || item.seller._id) : item.seller));
                const sImage = item.seller_image || (typeof item.seller_id === 'object' ? item.seller_id.profile_photo_url : null) || (typeof item.seller === 'object' ? item.seller.profile_photo_url : null);
                navigation.navigate('SellerStore', {
                  sellerId: sId,
                  sellerName: item.seller_name || (typeof item.seller === 'object' ? item.seller.full_name : 'Seller'),
                  sellerImage: sImage
                });
              }}
            >
              <Image source={sellerImage} style={styles.sellerAvatar} />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{item.seller_name}</Text>
                {(() => {
                  const sellerPhone = typeof item.seller_id === 'object' ? item.seller_id.phone : (typeof item.seller === 'object' ? item.seller.phone : null);
                  return sellerPhone ? (
                    <Text style={styles.sellerSubtitle}>{sellerPhone}</Text>
                  ) : (
                    <Text style={styles.sellerSubtitle}>Verified Student</Text>
                  );
                })()}
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {(() => {
                const sellerPhone = typeof item.seller_id === 'object' ? item.seller_id.phone : (typeof item.seller === 'object' ? item.seller.phone : null);
                if (sellerPhone) {
                  return (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(`tel:${sellerPhone}`)}
                      style={{ padding: 8, backgroundColor: '#E8F5E9', borderRadius: 20 }}
                    >
                      <Ionicons name="call" size={20} color="#2E7D32" />
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
              
              <TouchableOpacity 
                onPress={() => navigation.navigate('Messages', {
                  screen: 'ChatThread',
                  params: {
                    itemId: item._id || item.id,
                    otherUserId: typeof item.seller_id === 'object' ? (item.seller_id.id || item.seller_id._id) : (item.seller_id || (typeof item.seller === 'object' ? (item.seller.id || item.seller._id) : item.seller)),
                    itemName: item.name,
                    otherUserName: item.seller_name || (typeof item.seller === 'object' ? item.seller.full_name : 'Seller'),
                    otherUserPhoto: item.seller_image || (typeof item.seller_id === 'object' ? item.seller_id.profile_photo_url : null) || (typeof item.seller === 'object' ? item.seller.profile_photo_url : null),
                  }
                })}
                style={{ padding: 8, backgroundColor: '#E0E7FF', borderRadius: 20 }}
              >
                <Ionicons name="chatbubble" size={20} color="#0052CC" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

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

      {/* Wishlist Confirmation Modal */}
      <Modal
        visible={wishlistModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setWishlistModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isWishlisted ? '#FFEBEB' : '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name={isWishlisted ? "heart-dislike" : "heart"} size={32} color={isWishlisted ? "#FF3B30" : "#0052CC"} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1F36', marginBottom: 8, textAlign: 'center' }}>
              {isWishlisted ? 'Remove from Wishlist?' : 'Add to Wishlist?'}
            </Text>
            <Text style={{ fontSize: 16, color: '#697386', marginBottom: 24, textAlign: 'center', lineHeight: 22 }}>
              {isWishlisted 
                ? `Are you sure you want to remove "${item.name}" from your wishlist?`
                : `Are you sure you want to add "${item.name}" to your wishlist?`
              }
            </Text>
            
            <View style={{ width: '100%', flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: isWishlisted ? '#FFF0F0' : '#F0F5FF', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: isWishlisted ? '#FFD6D6' : '#D6E4FF' }}
                onPress={() => setWishlistModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={{ color: isWishlisted ? '#FF3B30' : '#0052CC', fontSize: 16, fontWeight: '600' }}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: isWishlisted ? '#FF3B30' : '#0052CC', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                onPress={confirmToggleWishlist}
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
