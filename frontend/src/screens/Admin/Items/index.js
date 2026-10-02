import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminItemsScreen() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation();

  const fetchItems = async () => {
    try {
      const response = await client.get('/admin/items');
      setItems(response.data);
      applyFiltersAndSearch(response.data, searchQuery, activeTab);
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

  const applyFiltersAndSearch = (allItems, query, tab) => {
    let result = allItems;

    // Apply Tab Filter
    if (tab === 'Active') {
      result = result.filter(i => i.is_active);
    } else if (tab === 'Pending') {
      result = result.filter(i => !i.is_active);
    }

    // Apply Search
    if (query) {
      const lowercasedQuery = query.toLowerCase();
      result = result.filter(item => 
        item.name?.toLowerCase().includes(lowercasedQuery) ||
        item.seller_id?.full_name?.toLowerCase().includes(lowercasedQuery) ||
        item.category_id?.name?.toLowerCase().includes(lowercasedQuery)
      );
    }

    setFilteredItems(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFiltersAndSearch(items, text, activeTab);
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    applyFiltersAndSearch(items, searchQuery, tab);
  };

  const handleTogglePublish = async (itemId, currentStatus) => {
    try {
      // Optimistic update
      const updatedItems = items.map(i => (i._id || i.id) === itemId ? { ...i, is_active: !currentStatus } : i);
      setItems(updatedItems);
      applyFiltersAndSearch(updatedItems, searchQuery, activeTab);
      
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
              const remainingItems = items.filter(i => (i._id || i.id) !== itemId);
              setItems(remainingItems);
              applyFiltersAndSearch(remainingItems, searchQuery, activeTab);
              
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

  const getStatus = (item) => {
    if (item.is_active) return { label: 'Active', color: '#10B981', bg: '#D1FAE5', dot: '#059669' };
    return { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7', dot: '#D97706' };
  };

  const renderItem = ({ item }) => {
    const status = getStatus(item);
    const itemId = item._id || item.id;
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
    const categoryName = item.category_id?.name || 'Unknown Category';
    const sellerName = item.seller_id?.full_name || 'Unknown Seller';

    return (
      <View style={styles.itemCard}>
        {/* Left Image */}
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => navigation.navigate('ProductDetail', { item })}
          activeOpacity={0.8}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={24} color="#94A3B8" />
            </View>
          )}
        </TouchableOpacity>

        {/* Right Info */}
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { item })} style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="pricetag-outline" size={12} color="#9CA3AF" />
            <Text style={styles.metaText} numberOfLines={1}>{categoryName}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={12} color="#9CA3AF" />
            <Text style={styles.metaText} numberOfLines={1}>Seller: {sellerName}</Text>
          </View>

          <View style={styles.footerRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.hideBtn]} 
                onPress={() => handleTogglePublish(itemId, item.is_active)}
              >
                <Ionicons name={item.is_active ? "eye-off" : "eye"} size={14} color="#D97706" />
                <Text style={styles.hideText}>{item.is_active ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const activeCount = items.filter(i => i.is_active).length;
  const pendingCount = items.filter(i => !i.is_active).length;

  return (
    <View style={styles.container}>
      {/* Deep Blue Header Area */}
      <View style={styles.headerBackground}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Item Moderation</Text>
            <Text style={styles.headerSubtitle}>Review and manage all listed items</Text>
          </View>
          <View style={{ width: 52 }} />
        </View>
      </View>

      {/* Search Bar overlaps the header boundary slightly */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by item name, category, seller..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pill Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'All' && styles.tabBtnActive]} 
            onPress={() => handleTabPress('All')}
          >
            {activeTab === 'All' && <Ionicons name="grid" size={14} color="#FFFFFF" />}
            <Text style={[styles.tabText, activeTab === 'All' && styles.tabTextActive]}>
              All ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Active' && styles.tabBtnActive]} 
            onPress={() => handleTabPress('Active')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Active' ? '#FFFFFF' : '#10B981' }]} />
            <Text style={[styles.tabText, activeTab === 'Active' && styles.tabTextActive]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Pending' && styles.tabBtnActive]} 
            onPress={() => handleTabPress('Pending')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Pending' ? '#FFFFFF' : '#F59E0B' }]} />
            <Text style={[styles.tabText, activeTab === 'Pending' && styles.tabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : errorMsg && items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchItems(); }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => (item.id || item._id || index).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
