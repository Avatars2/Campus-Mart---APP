import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image, TextInput, Alert, ScrollView, Platform, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function AdminItemsScreen() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredItems.length, pageSize, currentPage]);

  const toggleDropdown = () => {
    if (dropdownVisible) {
      setDropdownVisible(false);
      return;
    }
    if (dropdownBtnRef.current?.measureInWindow) {
      dropdownBtnRef.current.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number' && width > 0) {
          const windowHeight = Dimensions.get('window').height;
          const windowWidth = Dimensions.get('window').width;
          setDropdownPos({
            bottom: Math.max(10, windowHeight - y + 6),
            right: Math.max(16, windowWidth - (x + width)),
          });
        }
        setDropdownVisible(true);
      });
    } else {
      setDropdownVisible(true);
    }
  };

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
    } else if (tab === 'Inactive') {
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
    setCurrentPage(1);
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

  const renderPagination = () => {
    if (filteredItems.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredItems.length);

    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    return (
      <View style={styles.pagination}>
        {/* ── Results Info & Page Size Dropdown in the Same Row ── */}
        <View style={styles.paginationHeaderRow}>
          <Text style={styles.pageInfo}>
            Showing {startIdx} to {endIdx} of {filteredItems.length} items
          </Text>

          <TouchableOpacity
            ref={dropdownBtnRef}
            style={[styles.pageSizeDropdownBtn, dropdownVisible && styles.pageSizeDropdownBtnActive]}
            onPress={toggleDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.pageSizeDropdownText}>Page: {pageSize}</Text>
            <Ionicons
              name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#007185"
            />
          </TouchableOpacity>
        </View>

        {/* ── Page Controls (Previous, Numbers, Next) ── */}
        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={currentPage === 1 ? '#94A3B8' : '#007185'}
            />
          </TouchableOpacity>

          {pages.map((p, i) =>
            p === '...' ? (
              <Text key={`dot-${i}`} style={styles.pageDots}>
                ...
              </Text>
            ) : (
              <TouchableOpacity
                key={p}
                style={[styles.pageNumBtn, currentPage === p && styles.pageNumBtnActive]}
                onPress={() => setCurrentPage(p)}
              >
                <Text style={[styles.pageNumText, currentPage === p && styles.pageNumTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={currentPage === totalPages ? '#94A3B8' : '#007185'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
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
            style={[styles.tabBtn, activeTab === 'Inactive' && styles.tabBtnActive]} 
            onPress={() => handleTabPress('Inactive')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Inactive' ? '#FFFFFF' : '#F59E0B' }]} />
            <Text style={[styles.tabText, activeTab === 'Inactive' && styles.tabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007185" />
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
          data={pagedItems}
          keyExtractor={(item, index) => (item.id || item._id || index).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007185']} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderPagination}
        />
      )}

      {/* ── Anchored Page Size Dropdown Modal (Opens right at the Page button) ── */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="none"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalBackdrop}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View
            style={[
              styles.anchoredDropdownMenu,
              { bottom: dropdownPos.bottom, right: dropdownPos.right },
            ]}
          >
            {PAGE_SIZE_OPTIONS.map((size) => {
              const isSelected = pageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setDropdownVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      isSelected && styles.dropdownItemTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={15} color="#007185" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
