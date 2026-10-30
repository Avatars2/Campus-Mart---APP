import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput, ScrollView, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const response = await client.get('/admin/orders');
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch admin orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const pendingOrders = orders.filter(o => ['pending', 'cancel_requested'].includes(o.status)).length;
  const confirmedOrders = orders.filter(o => ['delivered', 'completed', 'rental_active'].includes(o.status)).length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const returnedOrders = orders.filter(o => ['returned', 'return_requested'].includes(o.status)).length;

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeFilter === 'Pending') {
      list = list.filter(o => ['pending', 'cancel_requested'].includes(o.status));
    } else if (activeFilter === 'Confirmed') {
      list = list.filter(o => ['delivered', 'completed', 'rental_active'].includes(o.status));
    } else if (activeFilter === 'Cancelled') {
      list = list.filter(o => o.status === 'cancelled');
    } else if (activeFilter === 'Returned') {
      list = list.filter(o => ['returned', 'return_requested'].includes(o.status));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o =>
        o.item_id?.name?.toLowerCase().includes(q) ||
        o.seller_id?.full_name?.toLowerCase().includes(q) ||
        o.buyer_id?.full_name?.toLowerCase().includes(q) ||
        (o.id || o._id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  const pagedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredOrders.length, pageSize, currentPage]);

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

  const renderPagination = () => {
    if (filteredOrders.length === 0) return null;

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredOrders.length);

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
            Showing {startIdx} to {endIdx} of {filteredOrders.length} orders
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
              color="#1E3A8A"
            />
          </TouchableOpacity>
        </View>

        {/* ── Page Controls (Previous, Numbers, Next) ── */}
        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={currentPage === 1 ? '#94A3B8' : '#1E3A8A'}
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
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={currentPage === totalPages ? '#94A3B8' : '#1E3A8A'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrder = ({ item: order }) => {
    const orderDate = new Date(order.updatedAt || order.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    
    const getStatusDisplay = (status) => {
      if (['pending', 'cancel_requested'].includes(status)) return { icon: 'time-outline', color: '#F59E0B', text: 'Pending' };
      if (['delivered', 'completed', 'rental_active'].includes(status)) return { icon: 'checkmark-circle', color: '#10B981', text: 'Confirmed' };
      if (status === 'cancelled') return { icon: 'close-circle', color: '#DC2626', text: 'Cancelled' };
      if (['returned', 'return_requested'].includes(status)) return { icon: 'refresh-circle', color: '#8B5CF6', text: 'Returned' };
      return { icon: 'ellipse', color: '#9CA3AF', text: status || 'Unknown' };
    };
    const statDef = getStatusDisplay(order.status);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.itemTitle}>{order.item_id?.name || 'Unknown Item'}</Text>
          <Text style={styles.price}>₹{order.total_price}</Text>
        </View>
        
        <View style={styles.userInfoRow}>
          <Text style={styles.userLabel}>Seller:</Text>
          <Ionicons name="person-circle-outline" size={14} color="#9CA3AF" />
          <Text style={styles.userName}>{order.seller_id?.full_name || 'Unknown'}</Text>
        </View>
        
        <View style={styles.userInfoRow}>
          <Text style={styles.userLabel}>Buyer:</Text>
          <Ionicons name="person-circle-outline" size={14} color="#9CA3AF" />
          <Text style={styles.userName}>{order.buyer_id?.full_name || 'Unknown'}</Text>
        </View>
        
        <View style={styles.dateRow}>
          <Ionicons name={statDef.icon} size={14} color={statDef.color} />
          <Text style={[styles.dateText, { color: statDef.color, fontWeight: '600' }]}>{statDef.text} on {orderDate}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by item, seller, buyer..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pill Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeFilter === 'All' && styles.tabBtnActive]} 
            onPress={() => handleFilterChange('All')}
          >
            {activeFilter === 'All' && <Ionicons name="grid" size={14} color="#FFFFFF" />}
            <Text style={[styles.tabText, activeFilter === 'All' && styles.tabTextActive]}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeFilter === 'Pending' && styles.tabBtnActive]} 
            onPress={() => handleFilterChange('Pending')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeFilter === 'Pending' ? '#FFFFFF' : '#F59E0B' }]} />
            <Text style={[styles.tabText, activeFilter === 'Pending' && styles.tabTextActive]}>
              Pending ({pendingOrders})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeFilter === 'Confirmed' && styles.tabBtnActive]} 
            onPress={() => handleFilterChange('Confirmed')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeFilter === 'Confirmed' ? '#FFFFFF' : '#10B981' }]} />
            <Text style={[styles.tabText, activeFilter === 'Confirmed' && styles.tabTextActive]}>
              Confirmed ({confirmedOrders})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeFilter === 'Cancelled' && styles.tabBtnActive]} 
            onPress={() => handleFilterChange('Cancelled')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeFilter === 'Cancelled' ? '#FFFFFF' : '#DC2626' }]} />
            <Text style={[styles.tabText, activeFilter === 'Cancelled' && styles.tabTextActive]}>
              Cancelled ({cancelledOrders})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeFilter === 'Returned' && styles.tabBtnActive]} 
            onPress={() => handleFilterChange('Returned')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeFilter === 'Returned' ? '#FFFFFF' : '#8B5CF6' }]} />
            <Text style={[styles.tabText, activeFilter === 'Returned' && styles.tabTextActive]}>
              Returned ({returnedOrders})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <FlatList
          data={pagedOrders}
          keyExtractor={(item) => (item.id || item._id).toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
          ListFooterComponent={renderPagination}
          ListEmptyComponent={<Text style={styles.emptyState}>No orders found.</Text>}
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
                    <Ionicons name="checkmark" size={15} color="#1E3A8A" />
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
