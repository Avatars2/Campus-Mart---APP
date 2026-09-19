import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './styles';
import useScreenRefresh from '../../hooks/useScreenRefresh';

export default function SellScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const loadItems = useCallback(async () => {
    const response = await client.get('/items/my-items');
    return response.data;
  }, []);
  const saveItems = useCallback((value) => setItems(value), []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadItems, saveItems);

  const renderItem = ({ item }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/100';
    return (
      <View style={styles.itemCard}>
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category_name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.itemPrice}>₹{item.price}{item.listing_type === 'rent' ? ` / ${item.rental_period || 'day'}` : ''}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditProduct', { item })}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={18} color="#007185" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemFooter}>
            <Text style={styles.itemCondition}>
              {{ 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' }[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')}
            </Text>
            <View style={[styles.statusBadge, item.is_currently_rented ? styles.statusSold : item.is_active ? styles.statusActive : styles.statusSold]}>
              <Text style={[styles.statusText, item.is_currently_rented ? styles.statusTextSold : item.is_active ? styles.statusTextActive : styles.statusTextSold]}>
                {item.is_currently_rented ? 'Currently rented' : item.is_active ? 'Active' : 'Sold'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007185" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: '#697386', marginBottom: 16 }}>Unable to load your listings.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={retry} activeOpacity={0.8}>
          <Text style={styles.emptyButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My<Text style={{ color: '#007185' }}>Listings</Text></Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="pricetag-outline" size={44} color="#007185" />
          </View>
          <Text style={styles.emptyText}>No listings yet</Text>
          <Text style={styles.emptySubText}>Start selling by adding your first item to the marketplace!</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddProduct')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>Add Your First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#007185']} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

