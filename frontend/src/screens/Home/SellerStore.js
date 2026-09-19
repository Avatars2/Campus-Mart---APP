import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import RatingStars from '../../components/commerce/RatingStars';
import storeStyles from './SellerStore.styles';
import homeStyles from './styles'; // Reuse itemCard styles from Home

export default function SellerStore({ route, navigation }) {
  const { sellerId, sellerName, sellerImage } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: `${sellerName}'s Store`,
    });
    fetchSellerItems();
  }, [sellerId]);

  const fetchSellerItems = async () => {
    try {
      const response = await client.get(`/items?seller_id=${sellerId}`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching seller items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSellerItems();
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150';
    const sImage = item.seller_image ? item.seller_image : 'https://via.placeholder.com/50';
    const conditionMap = { 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' };
    const condition = item.condition_rating ? (conditionMap[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')) : '';

    return (
      <TouchableOpacity
        style={homeStyles.itemCard}
        onPress={() => navigation.navigate('ProductDetail', { item })}
        activeOpacity={0.9}
      >
        <View style={homeStyles.itemImageContainer}>
          <Image source={{ uri: imageUrl }} style={homeStyles.itemImage} />
          {item.listing_type === 'rent' ? (
            <View style={[homeStyles.conditionBadge, { backgroundColor: '#007185' }]}>
              <Text style={homeStyles.conditionBadgeText}>{item.is_currently_rented ? 'Rented' : 'Rent'}</Text>
            </View>
          ) : condition ? (
            <View style={homeStyles.conditionBadge}>
              <Text style={homeStyles.conditionBadgeText}>{condition}</Text>
            </View>
          ) : null}
        </View>
        
        <View style={homeStyles.itemDetails}>
          <Text style={homeStyles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={homeStyles.itemPrice}>
            <Text style={{ fontSize: 13, fontWeight: 'normal' }}>₹</Text>{item.price}
            {item.listing_type === 'rent' ? <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#565959' }}> / {item.rental_period || 'day'}</Text> : ''}
          </Text>

          <View style={homeStyles.ratingRow}>
            <RatingStars value={item.average_rating} count={item.ratings_count} size={13} />
          </View>

          <View style={homeStyles.sellerContainer}>
            <Image source={{ uri: sImage }} style={homeStyles.sellerAvatar} />
            <Text style={homeStyles.sellerName} numberOfLines={1}>Sold by {item.seller_name}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={storeStyles.container}>
      {/* Store Header */}
      <View style={storeStyles.header}>
        <Image 
          source={{ uri: sellerImage || 'https://via.placeholder.com/100' }} 
          style={storeStyles.sellerImage} 
        />
        <Text style={storeStyles.sellerName}>{sellerName}</Text>
        <Text style={storeStyles.sellerSubtitle}>Verified Campus Seller</Text>
      </View>

      {/* Items List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0052CC" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => (item._id || item.id).toString()}
          numColumns={2}
          columnWrapperStyle={homeStyles.columnWrapper}
          contentContainerStyle={homeStyles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={storeStyles.emptyContainer}>
              <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
              <Text style={storeStyles.emptyText}>This seller hasn't listed any items yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

