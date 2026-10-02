import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

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

  const pendingOrders = orders.filter(o => ['pending', 'cancel_requested'].includes(o.status)).length;
  const confirmedOrders = orders.filter(o => ['delivered', 'completed', 'rental_active'].includes(o.status)).length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const returnedOrders = orders.filter(o => ['returned', 'return_requested'].includes(o.status)).length;

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Pending') return ['pending', 'cancel_requested'].includes(order.status);
    if (activeFilter === 'Confirmed') return ['delivered', 'completed', 'rental_active'].includes(order.status);
    if (activeFilter === 'Cancelled') return order.status === 'cancelled';
    if (activeFilter === 'Returned') return ['returned', 'return_requested'].includes(order.status);
    return true;
  });

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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Summary Row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setActiveFilter(activeFilter === 'Pending' ? 'All' : 'Pending')}
              style={{ flex: 1, minWidth: '45%', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Pending' ? 1 : 0.4, borderWidth: activeFilter === 'Pending' ? 1 : 0, borderColor: '#D97706' }}
            >
              <Text style={{ fontSize: 12, color: '#B45309', fontWeight: '600' }}>Pending</Text>
              <Text style={{ fontSize: 20, color: '#92400E', fontWeight: '800' }}>{pendingOrders}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setActiveFilter(activeFilter === 'Confirmed' ? 'All' : 'Confirmed')}
              style={{ flex: 1, minWidth: '45%', backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Confirmed' ? 1 : 0.4, borderWidth: activeFilter === 'Confirmed' ? 1 : 0, borderColor: '#059669' }}
            >
              <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>Confirmed</Text>
              <Text style={{ fontSize: 20, color: '#047857', fontWeight: '800' }}>{confirmedOrders}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setActiveFilter(activeFilter === 'Cancelled' ? 'All' : 'Cancelled')}
              style={{ flex: 1, minWidth: '45%', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Cancelled' ? 1 : 0.4, borderWidth: activeFilter === 'Cancelled' ? 1 : 0, borderColor: '#DC2626' }}
            >
              <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>Cancelled</Text>
              <Text style={{ fontSize: 20, color: '#B91C1C', fontWeight: '800' }}>{cancelledOrders}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setActiveFilter(activeFilter === 'Returned' ? 'All' : 'Returned')}
              style={{ flex: 1, minWidth: '45%', backgroundColor: '#EDE9FE', padding: 12, borderRadius: 8, opacity: activeFilter === 'All' || activeFilter === 'Returned' ? 1 : 0.4, borderWidth: activeFilter === 'Returned' ? 1 : 0, borderColor: '#7C3AED' }}
            >
              <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>Returned</Text>
              <Text style={{ fontSize: 20, color: '#6D28D9', fontWeight: '800' }}>{returnedOrders}</Text>
            </TouchableOpacity>
          </View>

          {filteredOrders.length === 0 ? (
            <Text style={styles.emptyState}>No orders found.</Text>
          ) : (
            filteredOrders.map(order => {
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
                <View key={order.id || order._id} style={styles.orderCard}>
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
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
