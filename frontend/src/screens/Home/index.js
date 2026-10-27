import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Image, RefreshControl, ScrollView, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import styles from './styles';
import { useNotifications } from '../../context/NotificationContext';
import { useCartWishlist } from '../../context/CartWishlistContext';
import RatingStars from '../../components/commerce/RatingStars';

const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently Listed (Default)', icon: 'time-outline' },
  { key: 'price_asc', label: 'Price: Low to High', icon: 'trending-down-outline' },
  { key: 'price_desc', label: 'Price: High to Low', icon: 'trending-up-outline' },
  { key: 'trending', label: 'Campus Trending', icon: 'flame-outline' },
];

export default function HomeScreen({ route, navigation }) {
  const [categories, setCategories] = useState([{ name: 'All' }]);
  const [items, setItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeListingType, setActiveListingType] = useState('all');

  // Filter & Sort States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('Category');

  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);

  const [conditionFilter, setConditionFilter] = useState([]);
  const [minRating, setMinRating] = useState(null);
  const [sortOption, setSortOption] = useState('recent'); // 'recent', 'price_asc', 'price_desc', 'trending'
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

  const fetchTrendingItems = async () => {
    try {
      const res = await client.get('/items?sort=trending&limit=8');
      setTrendingItems(res.data || []);
    } catch (err) {
      console.log('Error fetching trending items:', err);
    }
  };



  const fetchItems = useCallback(async (query = '', type = activeListingType, cat = activeCategory, minP = minPrice, maxP = maxPrice, conds = conditionFilter, minR = minRating, sort = sortOption) => {
    try {
      let url = `/items?listing_type=${type}&sort=${sort}`;
      if (query) {
        url += `&search=${encodeURIComponent(query)}`;
      }
      if (cat && cat !== 'All') {
        url += `&category=${encodeURIComponent(cat)}`;
      }
      if (minP !== null && minP !== undefined) {
        url += `&min_price=${minP}`;
      }
      if (maxP !== null && maxP !== undefined) {
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
  }, [activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating, sortOption]);

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
        break;
      }
    }

    setActiveListingType(typeToFetch);
    setActiveCategory(catToFetch);

    fetchItems(lowerQuery, typeToFetch, catToFetch, minPrice, maxPrice, conditionFilter, minRating, sortOption);
  }, [searchQuery, fetchItems, minPrice, maxPrice, conditionFilter, minRating, sortOption]);

  useFocusEffect(
    useCallback(() => {
      fetchCategoriesList();
      fetchTrendingItems();
      let queryToUse = searchQueryRef.current;
      if (route.params?.searchQuery) {
        queryToUse = route.params.searchQuery;
        setSearchQuery(queryToUse);
        searchQueryRef.current = queryToUse;
        navigation.setParams({ searchQuery: undefined });
        handleSearch(queryToUse);
      } else {
        fetchItems(queryToUse, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating, sortOption);
      }
    }, [fetchItems, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating, sortOption, route.params?.searchQuery, handleSearch])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrendingItems();
    fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating, sortOption);
  };

  const handleCategoryPress = (categoryName) => {
    setActiveCategory(categoryName);
    setLoading(true);
    fetchItems(searchQuery, activeListingType, categoryName, minPrice, maxPrice, conditionFilter, minRating, sortOption);
  };

  const handleListingTypeChange = (type) => {
    setActiveListingType(type);
    setLoading(true);
    fetchItems(searchQuery, type, activeCategory, minPrice, maxPrice, conditionFilter, minRating, sortOption);
  };

  const handleSortChange = (newSort) => {
    const updatedSort = sortOption === newSort ? 'recent' : newSort;
    setSortOption(updatedSort);
    setLoading(true);
    fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating, updatedSort);
  };

  const handleConditionChange = (conditionValue) => {
    const newCond = conditionFilter.includes(conditionValue)
      ? conditionFilter.filter(c => c !== conditionValue)
      : [...conditionFilter, conditionValue];
    setConditionFilter(newCond);
    setLoading(true);
    fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, newCond, minRating, sortOption);
  };

  const renderTrendingCarousel = () => {
    if (trendingItems.length === 0 || searchQuery.trim().length > 0) return null;

    return (
      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <View style={styles.trendingHeaderLeft}>
            <Ionicons name="flame" size={20} color="#EA580C" />
            <Text style={styles.trendingTitle}>Campus Trending</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingScroll}
        >
          {trendingItems.map((item) => {
            const img = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150';
            const isRent = item.listing_type === 'rent';
            const itemId = item.id || item._id;
            const hasOffer = Boolean(item.original_price && Number(item.original_price) > Number(item.price));
            const discountPct = hasOffer ? Math.round(((Number(item.original_price) - Number(item.price)) / Number(item.original_price)) * 100) : 0;

            return (
              <TouchableOpacity
                key={'trending-' + itemId}
                style={styles.trendingCard}
                onPress={() => navigation.navigate('ProductDetail', { item })}
                activeOpacity={0.88}
              >
                <View style={styles.trendingCardImageWrapper}>
                  <Image source={{ uri: img }} style={styles.trendingCardImage} />
                  <View style={styles.trendingTag}>
                    <Text style={styles.trendingTagText}>🔥 HOT</Text>
                  </View>
                  {hasOffer && (
                    <View style={styles.trendingOfferBadge}>
                      <Text style={styles.trendingOfferBadgeText}>🔥 {discountPct}% OFF</Text>
                    </View>
                  )}
                  <View style={[styles.trendingTypePill, { backgroundColor: isRent ? '#007185' : '#D97706' }]}>
                    <Text style={styles.trendingTypePillText}>{isRent ? 'Rent' : 'Buy'}</Text>
                  </View>
                </View>
                <View style={styles.trendingCardBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.trendingCardPrice}>
                      ₹{item.price}{isRent ? ` / ${item.rental_period || 'day'}` : ''}
                    </Text>
                    {hasOffer && (
                      <>
                        <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through', fontWeight: '500' }}>
                          ₹{item.original_price}
                        </Text>
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '800' }}>
                            {discountPct}% OFF
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <Text style={styles.trendingCardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <RatingStars value={item.average_rating || 5} count={item.ratings_count || 1} size={11} />
                  </View>
                  <View style={styles.trendingSellerRow}>
                    <Image
                      source={{ uri: item.seller_image || 'https://via.placeholder.com/50' }}
                      style={styles.trendingSellerAvatar}
                    />
                    <Text style={styles.trendingSellerName} numberOfLines={1}>
                      {item.seller_name || 'Student'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150';
    const sellerImage = item.seller_image ? item.seller_image : 'https://via.placeholder.com/50';
    const conditionMap = { 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' };
    const condition = item.condition_rating ? (conditionMap[item.condition_rating] || item.condition_rating.toString().replace('_', ' ')) : '';
    const hasOffer = Boolean(item.original_price && Number(item.original_price) > Number(item.price));
    const discountPct = hasOffer ? Math.round(((Number(item.original_price) - Number(item.price)) / Number(item.original_price)) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ProductDetail', { item })}
        activeOpacity={0.9}
      >
        <View style={styles.itemImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
          {hasOffer && (
            <View style={styles.cardDiscountRibbon}>
              <Text style={styles.cardDiscountRibbonText}>🔥 {discountPct}% OFF</Text>
            </View>
          )}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <Text style={styles.itemPrice}>
              <Text style={{ fontSize: 13, fontWeight: 'normal' }}>₹</Text>{item.price}
              {item.listing_type === 'rent' ? <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#565959' }}> / {item.rental_period || 'day'}</Text> : ''}
            </Text>
            {hasOffer && (
              <>
                <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through', fontWeight: '500' }}>
                  ₹{item.original_price}
                </Text>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '800' }}>
                    {discountPct}% OFF
                  </Text>
                </View>
              </>
            )}
          </View>

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

        {/* 2. Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#0F1111" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search campus items..."
              placeholderTextColor="#565959"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setActiveCategory('All'); fetchItems('', activeListingType, 'All', minPrice, maxPrice, conditionFilter, minRating, sortOption); }}>
                <Ionicons name="close-circle" size={18} color="#565959" style={{ marginRight: 6 }} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 3. Quick Filter Bar */}
        <View style={styles.quickFilterContainer}>
          <TouchableOpacity style={styles.filterIconButton} onPress={() => setIsFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={18} color="#007185" />
            <Text style={styles.filterIconText}>Filters</Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilterScroll}>
            <TouchableOpacity
              style={[styles.quickFilterChip, activeListingType === 'rent' && styles.quickFilterChipActive]}
              onPress={() => handleListingTypeChange(activeListingType === 'rent' ? 'all' : 'rent')}
            >
              <Text style={[styles.quickFilterText, activeListingType === 'rent' && styles.quickFilterTextActive]}>Rent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickFilterChip, activeListingType === 'sell' && styles.quickFilterChipActive]}
              onPress={() => handleListingTypeChange(activeListingType === 'sell' ? 'all' : 'sell')}
            >
              <Text style={[styles.quickFilterText, activeListingType === 'sell' && styles.quickFilterTextActive]}>Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickFilterChip, sortOption === 'price_desc' && styles.quickFilterChipActive]}
              onPress={() => handleSortChange('price_desc')}
            >
              <Text style={[styles.quickFilterText, sortOption === 'price_desc' && styles.quickFilterTextActive]}>Price: High to Low</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickFilterChip, sortOption === 'price_asc' && styles.quickFilterChipActive]}
              onPress={() => handleSortChange('price_asc')}
            >
              <Text style={[styles.quickFilterText, sortOption === 'price_asc' && styles.quickFilterTextActive]}>Price: Low to High</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickFilterChip, conditionFilter.includes(5) && styles.quickFilterChipActive]}
              onPress={() => handleConditionChange(5)}
            >
              <Text style={[styles.quickFilterText, conditionFilter.includes(5) && styles.quickFilterTextActive]}>New Condition</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Main Content List with Campus Trending Carousel */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007185" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => (item.id || item._id).toString()}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderTrendingCarousel}
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
                {searchQuery ? "Try a different search term or remove filters" : "Check back later for new listings!"}
              </Text>
            </View>
          }
        />
      )}

      {/* Comprehensive Filter Modal */}
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
                setMinRating(null);
                setSortOption('recent');
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
                {['Category', 'Price', 'Condition', 'Rating', 'Listing Type', 'Sort'].map(tab => (
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                      <TextInput
                        style={{ flex: 1, minWidth: 0, backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8, fontSize: 14, color: '#0F1111' }}
                        placeholder="Min (₹)"
                        keyboardType="numeric"
                        value={minPrice !== null && minPrice !== undefined ? minPrice.toString() : ''}
                        onChangeText={(val) => setMinPrice(val ? parseInt(val.replace(/[^0-9]/g, '')) : null)}
                        placeholderTextColor="#94A3B8"
                      />
                      <Text style={{ color: '#64748B', fontWeight: 'bold' }}>to</Text>
                      <TextInput
                        style={{ flex: 1, minWidth: 0, backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8, fontSize: 14, color: '#0F1111' }}
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
                              const newCond = isActive
                                ? conditionFilter.filter(c => c !== cond.value)
                                : [...conditionFilter, cond.value];
                              setConditionFilter(newCond);
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
                    <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
                    <View style={styles.filterOptionRow}>
                      {[4, 3, 2, 1].map(stars => (
                        <TouchableOpacity
                          key={stars}
                          style={[styles.filterOptionBtn, minRating === stars && styles.filterOptionBtnActive]}
                          onPress={() => setMinRating(minRating === stars ? null : stars)}
                        >
                          <Text style={[styles.filterOptionText, minRating === stars && styles.filterOptionTextActive]}>
                            {stars}★ & above
                          </Text>
                        </TouchableOpacity>
                      ))}
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

                {activeFilterTab === 'Sort' && (
                  <View>
                    <Text style={styles.filterSectionTitle}>Sort Products</Text>
                    <View style={styles.filterOptionRow}>
                      {SORT_OPTIONS.map(opt => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.filterOptionBtn, sortOption === opt.key && styles.filterOptionBtnActive]}
                          onPress={() => setSortOption(opt.key)}
                        >
                          <Text style={[styles.filterOptionText, sortOption === opt.key && styles.filterOptionTextActive]}>{opt.label}</Text>
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
                  fetchItems(searchQuery, activeListingType, activeCategory, minPrice, maxPrice, conditionFilter, minRating, sortOption);
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
