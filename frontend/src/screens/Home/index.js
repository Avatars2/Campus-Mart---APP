import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Image, RefreshControl, ScrollView, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import styles from './styles';
import { useNotifications } from '../../context/NotificationContext';
import { useCartWishlist } from '../../context/CartWishlistContext';
import RatingStars from '../../components/commerce/RatingStars';



export default function HomeScreen({ route, navigation }) {
  const [categories, setCategories] = useState([{ name: 'All' }]);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeListingType, setActiveListingType] = useState('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('Category');
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [conditionFilter, setConditionFilter] = useState([]);
  const [minRating, setMinRating] = useState(null);
  const searchQueryRef = useRef('');
  const { unreadCount } = useNotifications();
  const { cartCount, wishlistCount } = useCartWishlist();
  searchQueryRef.current = searchQuery;

  const fetchCategoriesList = async () => {
    try {
      const response = await client.get('/categories');
      const cats = response.data.map(c => ({ name: c.name }));
      setCategories([{ name: 'All' }, ...cats]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategoriesList();
    }, [])
  );

  const fetchItems = useCallback(async (query = '', type = activeListingType, cat = activeCategory, minP = minPrice, maxP = maxPrice, conds = conditionFilter, minR = minRating) => {
    try {
      let url = `/items?listing_type=${type}`;
      if (query) {
        url += `&search=${encodeURIComponent(query)}`;
      }
      if (cat && cat !== 'All') {
        url += `&category=${encodeURIComponent(cat)}`;
      }
      if (minP !== null) {
        url += `&min_price=${minP}`;
      }
      if (maxP !== null) {
        url += `&max_price=${maxP}`;
      }
      if (conds && conds.length > 0) {
        url += `&condition_rating=${conds.join(',')}`;
      }
        if (minR !== null && minR !== undefined) {
          url += `&min_rating=${minR}`;
        }
      const response = await client.get(url);
      setItems(response.data);
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error("Error fetching items:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating]);

  const handleSearch = useCallback((queryOverride) => {
    setLoading(true);
    let typeToFetch = 'all';
    let catToFetch = 'All';
    let queryToFetch = (typeof queryOverride === 'string' ? queryOverride : searchQuery).trim();
    let lowerQuery = queryToFetch.toLowerCase();

    // Check for Listing Type keywords
    if (lowerQuery.includes('rent')) {
      typeToFetch = 'rent';
      lowerQuery = lowerQuery.replace(/rent/g, '').trim();
    } else if (lowerQuery.includes('sale') || lowerQuery.includes('sell') || lowerQuery.includes('buy')) {
      typeToFetch = 'sell';
      lowerQuery = lowerQuery.replace(/sale|sell|buy/g, '').trim();
    }

    // Check for Category keywords
    const categoryNames = ['Books', 'Electronics', 'Furniture', 'Stationery', 'Clothing', 'Others'];
    for (const catName of categoryNames) {
      if (lowerQuery.includes(catName.toLowerCase())) {
        catToFetch = catName;
        lowerQuery = lowerQuery.replace(catName.toLowerCase(), '').trim();
        break; // matched a category
      }
    }

    // Update state to keep UI in sync in case we ever display them
    setActiveListingType(typeToFetch);
    setActiveCategory(catToFetch);

    fetchItems(lowerQuery, typeToFetch, catToFetch, minPrice, maxPrice, conditionFilter);
  }, [searchQuery, fetchItems, minPrice, maxPrice, conditionFilter]);

  useFocusEffect(
    useCallback(() => {
      let queryToUse = searchQueryRef.current;
      if (route.params?.searchQuery) {
        queryToUse = route.params.searchQuery;
        setSearchQuery(queryToUse);
        searchQueryRef.current = queryToUse;
        navigation.setParams({ searchQuery: undefined }); // clear param so it doesn't get stuck
        handleSearch(queryToUse);
      } else {
        fetchItems(queryToUse, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter);
      }
    }, [fetchItems, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, route.params?.searchQuery, handleSearch])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating);
  };

  const handleCategoryPress = (categoryName) => {
    setActiveCategory(categoryName);
    setLoading(true);
    fetchItems(searchQuery, activeListingType, categoryName, minPrice, maxPrice, conditionFilter);
  };

  const handleListingTypeChange = (type) => {
    setActiveListingType(type);
    setLoading(true);
    fetchItems(searchQuery, type, activeCategory, minPrice, maxPrice, conditionFilter);
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150';
    const sellerImage = item.seller_image ? item.seller_image : 'https://via.placeholder.com/50';
    const conditionMap = { 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' };
    const condition = item.condition_rating ? (conditionMap[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')) : '';

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ProductDetail', { item })}
        activeOpacity={0.9}
      >
        <View style={styles.itemImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
          {item.listing_type === 'rent' ? (
            <View style={[styles.conditionBadge, { backgroundColor: '#007185' }]}>
              <Text style={styles.conditionBadgeText}>{item.is_currently_rented ? 'Rented' : 'Rent'}</Text>
            </View>
          ) : condition ? (
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionBadgeText}>{condition}</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemPrice}>
            <Text style={{ fontSize: 13, fontWeight: 'normal' }}>₹</Text>{item.price}
            {item.listing_type === 'rent' ? <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#565959' }}> / {item.rental_period || 'day'}</Text> : ''}
          </Text>

          <View style={styles.ratingRow}>
            <RatingStars value={item.average_rating} count={item.ratings_count} size={13} />
          </View>

          <View style={styles.sellerContainer}>
            <Image source={{ uri: sellerImage }} style={styles.sellerAvatar} />
            <Text style={styles.sellerName} numberOfLines={1}>Sold by {item.seller_name}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Fixed Top Bar */}
      <View style={styles.headerArea}>
        <View style={styles.topBar}>
          <Text style={styles.logoText}>Campus<Text style={{ color: '#007185' }}>Mart</Text></Text>
          <View style={styles.topIconsContainer}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Wishlist')}>
              <Ionicons name="heart-outline" size={26} color="#0F1111" />
              {wishlistCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{wishlistCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={26} color="#0F1111" />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={26} color="#0F1111" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Search Bar (Fixed) */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#0F1111" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items"
              placeholderTextColor="#565959"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setActiveCategory('All'); fetchItems('', activeListingType, 'All', minPrice, maxPrice, conditionFilter); }}>
                <Ionicons name="close-circle" size={20} color="#565959" style={{ marginRight: 8 }} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick Filter Bar */}
        <View style={styles.quickFilterContainer}>
          <TouchableOpacity style={styles.filterIconButton} onPress={() => setIsFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={20} color="#007185" />
            <Text style={styles.filterIconText}>Filters</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilterScroll}>
            <TouchableOpacity style={[styles.quickFilterChip, activeListingType === 'rent' && styles.quickFilterChipActive]} onPress={() => handleListingTypeChange(activeListingType === 'rent' ? 'all' : 'rent')}>
              <Text style={[styles.quickFilterText, activeListingType === 'rent' && styles.quickFilterTextActive]}>Rent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickFilterChip, activeListingType === 'sell' && styles.quickFilterChipActive]} onPress={() => handleListingTypeChange(activeListingType === 'sell' ? 'all' : 'sell')}>
              <Text style={[styles.quickFilterText, activeListingType === 'sell' && styles.quickFilterTextActive]}>Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickFilterChip, maxPrice === 500 && styles.quickFilterChipActive]} onPress={() => { setMaxPrice(maxPrice === 500 ? null : 500); setMinPrice(null); setLoading(true); fetchItems(searchQuery, activeListingType, activeCategory, null, maxPrice === 500 ? null : 500, conditionFilter); }}>
              <Text style={[styles.quickFilterText, maxPrice === 500 && styles.quickFilterTextActive]}>Under ₹500</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickFilterChip, conditionFilter.includes(5) && styles.quickFilterChipActive]} onPress={() => { const newCond = conditionFilter.includes(5) ? conditionFilter.filter(c => c !== 5) : [...conditionFilter, 5]; setConditionFilter(newCond); setLoading(true); fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, newCond); }}>
              <Text style={[styles.quickFilterText, conditionFilter.includes(5) && styles.quickFilterTextActive]}>New Condition</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Main Content List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007185" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007185']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="search-outline" size={44} color="#007185" />
              </View>
              <Text style={styles.emptyText}>No items found</Text>
              <Text style={styles.emptySubText}>
                {searchQuery ? "Try a different search term" : "Check back later for new listings!"}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => {
                setActiveCategory('All');
                setActiveListingType('all');
                setMinPrice(null);
                setMaxPrice(null);
                setConditionFilter([]);
              }}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F1111" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Sidebar */}
              <View style={styles.sidebar}>
                {['Category', 'Price', 'Condition', 'Rating', 'Listing Type'].map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.sidebarItem, activeFilterTab === tab && styles.sidebarItemActive]}
                    onPress={() => setActiveFilterTab(tab)}
                  >
                    <Text style={[styles.sidebarItemText, activeFilterTab === tab && styles.sidebarItemTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filter Content */}
              <ScrollView style={styles.filterContent}>
                {activeFilterTab === 'Category' && (
                  <View>
                    <Text style={styles.filterSectionTitle}>Select Category</Text>
                    <View style={styles.filterOptionRow}>
                      {categories.map(cat => (
                        <TouchableOpacity
                          key={cat.name}
                          style={[styles.filterOptionBtn, activeCategory === cat.name && styles.filterOptionBtnActive]}
                          onPress={() => setActiveCategory(cat.name)}
                        >
                          <Text style={[styles.filterOptionText, activeCategory === cat.name && styles.filterOptionTextActive]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {activeFilterTab === 'Price' && (
                  <View>
                    <Text style={styles.filterSectionTitle}>Custom Price Range</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 5 }}>
                      <TextInput
                        style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, fontSize: 16, color: '#0F1111' }}
                        placeholder="Min (₹)"
                        keyboardType="numeric"
                        value={minPrice !== null && minPrice !== undefined ? minPrice.toString() : ''}
                        onChangeText={(val) => setMinPrice(val ? parseInt(val.replace(/[^0-9]/g, '')) : null)}
                        placeholderTextColor="#94A3B8"
                      />
                      <Text style={{ marginHorizontal: 12, color: '#64748B', fontWeight: 'bold' }}>to</Text>
                      <TextInput
                        style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, fontSize: 16, color: '#0F1111' }}
                        placeholder="Max (₹)"
                        keyboardType="numeric"
                        value={maxPrice !== null && maxPrice !== undefined ? maxPrice.toString() : ''}
                        onChangeText={(val) => setMaxPrice(val ? parseInt(val.replace(/[^0-9]/g, '')) : null)}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}

                {activeFilterTab === 'Condition' && (
                  <View>
                    <Text style={styles.filterSectionTitle}>Item Condition</Text>
                    <View style={styles.filterOptionRow}>
                      {[
                        { label: 'New', value: 5 },
                        { label: 'Like New', value: 4 },
                        { label: 'Good', value: 3 },
                        { label: 'Fair', value: 2 },
                        { label: 'Poor', value: 1 },
                      ].map(cond => {
                        const isActive = conditionFilter.includes(cond.value);
                        return (
                          <TouchableOpacity
                            key={cond.label}
                            style={[styles.filterOptionBtn, isActive && styles.filterOptionBtnActive]}
                            onPress={() => {
                              if (isActive) setConditionFilter(conditionFilter.filter(v => v !== cond.value));
                              else setConditionFilter([...conditionFilter, cond.value]);
                            }}
                          >
                            <Text style={[styles.filterOptionText, isActive && styles.filterOptionTextActive]}>{cond.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {activeFilterTab === 'Rating' && (
                  <View>
                    <Text style={styles.filterSectionTitle}>Customer Ratings</Text>
                    <View style={{ marginTop: 10 }}>
                      {[4, 3, 2, 1].map(star => {
                        const isActive = minRating === star;
                        return (
                          <TouchableOpacity
                            key={star}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                            onPress={() => setMinRating(isActive ? null : star)}
                          >
                            <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                              {isActive && <View style={styles.radioInner} />}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {[...Array(5)].map((_, i) => (
                                <Ionicons key={i} name={i < star ? "star" : "star-outline"} size={20} color={i < star ? "#F59E0B" : "#D1D5DB"} style={{ marginRight: 2 }} />
                              ))}
                              <Text style={{ fontSize: 16, color: '#4B5563', marginLeft: 8 }}>& Up</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {activeFilterTab === 'Listing Type' && (
                  <View>
                    <Text style={styles.filterSectionTitle}>Listing Type</Text>
                    <View style={styles.filterOptionRow}>
                      {[
                        { label: 'All Items', value: 'all' },
                        { label: 'Sale', value: 'sell' },
                        { label: 'Rent', value: 'rent' },
                      ].map(type => (
                        <TouchableOpacity
                          key={type.label}
                          style={[styles.filterOptionBtn, activeListingType === type.value && styles.filterOptionBtnActive]}
                          onPress={() => setActiveListingType(type.value)}
                        >
                          <Text style={[styles.filterOptionText, activeListingType === type.value && styles.filterOptionTextActive]}>{type.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.showResultsBtn}
                onPress={() => {
                  setIsFilterModalVisible(false);
                  setLoading(true);
                  fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating);
                }}
              >
                <Text style={styles.showResultsText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
