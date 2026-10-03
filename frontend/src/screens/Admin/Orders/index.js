import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

const PAGE_SIZE = 10;

export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchOrders = async () => {
    try {
      const response = await client.get('/admin/orders');
      setOrders(response.data);
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
    setActiveFilter(activeFilter === filter ? 'All' : filter);
    setCurrentPage(1);
  };

  const pendingOrders = orders.filter(o => ['pending', 'cancel_requested'].includes(o.status)).length;
  const confirmedOrders = orders.filter(o => ['delivered', 'completed', 'rental_active'].includes(o.status)).length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const returnedOrders = orders.filter(o => ['returned', 'return_requested'].includes(o.status)).length;

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Pending') return ['pending', 'cancel_requested'].includes(order.status);
      if (activeFilter === 'Confirmed') return ['delivered', 'completed', 'rental_active'].includes(order.status);
      if (activeFilter === 'Cancelled') return order.status === 'cancelled';
      if (activeFilter === 'Returned') return ['returned', 'return_requested'].includes(order.status);
      return true;
    });
  }, [orders, activeFilter]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  const pagedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 }}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => handleFilterChange('Pending')}
        style={{ flex: 1, minWidth: '45%', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Pending' ? 1 : 0.4, borderWidth: activeFilter === 'Pending' ? 1 : 0, borderColor: '#D97706' }}
      >
        <Text style={{ fontSize: 12, color: '#B45309', fontWeight: '600' }}>Pending</Text>
        <Text style={{ fontSize: 20, color: '#92400E', fontWeight: '800' }}>{pendingOrders}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => handleFilterChange('Confirmed')}
        style={{ flex: 1, minWidth: '45%', backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Confirmed' ? 1 : 0.4, borderWidth: activeFilter === 'Confirmed' ? 1 : 0, borderColor: '#059669' }}
      >
        <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>Confirmed</Text>
        <Text style={{ fontSize: 20, color: '#047857', fontWeight: '800' }}>{confirmedOrders}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => handleFilterChange('Cancelled')}
        style={{ flex: 1, minWidth: '45%', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Cancelled' ? 1 : 0.4, borderWidth: activeFilter === 'Cancelled' ? 1 : 0, borderColor: '#DC2626' }}
      >
        <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>Cancelled</Text>
        <Text style={{ fontSize: 20, color: '#B91C1C', fontWeight: '800' }}>{cancelledOrders}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => handleFilterChange('Returned')}
        style={{ flex: 1, minWidth: '45%', backgroundColor: '#EDE9FE', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Returned' ? 1 : 0.4, borderWidth: activeFilter === 'Returned' ? 1 : 0, borderColor: '#7C3AED' }}
      >
        <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>Returned</Text>
        <Text style={{ fontSize: 20, color: '#6D28D9', fontWeight: '800' }}>{returnedOrders}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const renderPageNumber = (pageNum) => (
      <TouchableOpacity
        key={`page-${pageNum}`}
        style={[styles.pageNumBtn, currentPage === pageNum && styles.pageNumBtnActive]}
        onPress={() => setCurrentPage(pageNum)}
      >
        <Text style={[styles.pageNumText, currentPage === pageNum && styles.pageNumTextActive]}>
          {pageNum}
        </Text>
      </TouchableOpacity>
    );

    const pages = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(renderPageNumber(i));
      }
    } else {
      pages.push(renderPageNumber(1));
      
      if (currentPage > 3) {
        pages.push(<Text key="dots1" style={styles.pageDots}>...</Text>);
      }
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage === 1) end = 3;
      if (currentPage === totalPages) start = totalPages - 2;
      
      for (let i = start; i <= end; i++) {
        pages.push(renderPageNumber(i));
      }
      
      if (currentPage < totalPages - 2) {
        pages.push(<Text key="dots2" style={styles.pageDots}>...</Text>);
      }
      
      pages.push(renderPageNumber(totalPages));
    }

    return (
      <View style={styles.pagination}>
        <Text style={styles.pageInfo}>
          Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length} orders
        </Text>
        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#94A3B8' : '#1E3A8A'} />
          </TouchableOpacity>
          
          {pages}
          
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#94A3B8' : '#1E3A8A'} />
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={{ width: 40 }} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderPagination}
          ListEmptyComponent={<Text style={styles.emptyState}>No orders found.</Text>}
        />
      )}
    </View>
  );
}
