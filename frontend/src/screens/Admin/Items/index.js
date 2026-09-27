import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminItemsScreen() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation();

  const fetchItems = async () => {
    try {
      const response = await client.get('/admin/items');
      setItems(response.data);
      setFilteredItems(response.data);
      setErrorMsg('');
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error('Failed to fetch admin items:', error);
      }
      setErrorMsg(error.response?.data?.error || 'Failed to load items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredItems(items);
    } else {
      const lowercasedQuery = text.toLowerCase();
      const filtered = items.filter(item => 
        item.name?.toLowerCase().includes(lowercasedQuery) ||
        item.seller_id?.full_name?.toLowerCase().includes(lowercasedQuery) ||
        item.category_id?.name?.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredItems(filtered);
    }
  };

  const handleTogglePublish = async (itemId, currentStatus) => {
    try {
      // Optimistic update
      setItems(items.map(i => i._id === itemId || i.id === itemId ? { ...i, is_active: !currentStatus } : i));
      setFilteredItems(filteredItems.map(i => i._id === itemId || i.id === itemId ? { ...i, is_active: !currentStatus } : i));
      
      await client.put(`/admin/items/${itemId}`, { is_active: !currentStatus });
    } catch (error) {
      console.error('Failed to update item status:', error);
      Alert.alert('Error', 'Failed to update listing status.');
      fetchItems(); // Revert
    }
  };

  const handleDelete = (itemId) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic delete
              setItems(items.filter(i => (i._id || i.id) !== itemId));
              setFilteredItems(filteredItems.filter(i => (i._id || i.id) !== itemId));
              
              await client.delete(`/admin/items/${itemId}`);
            } catch (error) {
              console.error('Failed to delete item:', error);
              Alert.alert('Error', 'Failed to delete listing.');
              fetchItems(); // Revert
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isActive = item.is_active;
    const itemId = item._id || item.id;
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

    return (
      <TouchableOpacity 
        style={[styles.itemCard, !isActive && { opacity: 0.7 }]}
        onPress={() => navigation.navigate('ProductDetail', { item })}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={24} color="#94A3B8" />
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, !isActive && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
          
          <Text style={styles.sellerName} numberOfLines={1}>
            Seller: {item.seller_id?.full_name || 'Unknown'}
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9' }]}>
            <Text style={[styles.statusText, { color: isActive ? '#166534' : '#64748B' }]}>
              {isActive ? 'Active' : 'Hidden'}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, isActive ? styles.unpublishButton : styles.publishButton]} 
              onPress={() => handleTogglePublish(itemId, isActive)}
            >
              <Text style={isActive ? styles.unpublishText : styles.publishText}>
                {isActive ? 'Hide' : 'Publish'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={() => handleDelete(itemId)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  if (errorMsg && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchItems(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Moderation</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings, categories, sellers..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => (item.id || item._id || index).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
