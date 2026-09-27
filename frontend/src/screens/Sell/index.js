import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
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
  const saveItems = useCallback((value) => {
    // Sort items: active first, then sold/inactive
    const sortedItems = [...value].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return 0;
    });
    setItems(sortedItems);
  }, []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadItems, saveItems);

  const handleItemPress = (item) => {
    if (item.is_suspended) {
      Alert.alert(
        'Item Suspended',
        'This item has been suspended by the administrator due to a policy violation. It is no longer visible to other students.'
      );
    }
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/100';
    
    let statusText = 'Sold';
    let statusStyle = styles.statusSold;
    let textStyle = styles.statusTextSold;
    
    if (item.is_suspended) {
      statusText = 'Suspended';
      statusStyle = { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 };
      textStyle = { color: '#DC2626', fontSize: 12, fontWeight: '600' };
    } else if (item.is_currently_rented) {
      statusText = 'Currently rented';
    } else if (item.is_active) {
      statusText = 'Active';
      statusStyle = styles.statusActive;
      textStyle = styles.statusTextActive;
    }

    return (
      <TouchableOpacity 
        style={[styles.itemCard, item.is_suspended && { opacity: 0.7 }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        <View style={styles.itemDetails}>
          <Text style={[styles.itemName, item.is_suspended && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category_name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.itemPrice}>₹{item.price}{item.listing_type === 'rent' ? ` / ${item.rental_period || 'day'}` : ''}</Text>
            {!item.is_suspended && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProduct', { item })}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={18} color="#007185" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.itemFooter}>
            <Text style={styles.itemCondition}>
              {{ 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' }[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')}
            </Text>
            <View style={statusStyle}>
              <Text style={textStyle}>{statusText}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.screenTitle}>List<Text style={{ color: '#007185' }}>ings</Text></Text>
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

