import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, SafeAreaView, Platform } from 'react-native';
import styles from './styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';

export default function BuyScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' or 'sales'

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await client.get(`/orders?type=${activeTab}`);
      setOrders(res.data.orders);
    } catch (err) {
      console.error('Fetch Orders Error:', err);
      setError(err.response?.data?.error || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleMessageUser = (user) => {
    if (!user) return;
    navigation.navigate('Messages', {
      screen: 'ChatScreen',
      params: { recipientId: user._id || user.id }
    });
  };

  const renderOrderItem = ({ item }) => {
    const orderItem = item.item_id || {};
    const seller = item.seller_id || {};
    
    // Format date beautifully
    const date = new Date(item.createdAt);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const otherUser = activeTab === 'purchases' ? item.seller_id : item.buyer_id;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderDate}>{dateString}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status === 'pending' ? 'Campus Pickup' : item.status}</Text>
          </View>
        </View>

        <View style={styles.orderContent}>
          <Image 
            source={{ uri: orderItem.images?.[0] || 'https://via.placeholder.com/100' }} 
            style={styles.itemImage} 
          />
          <View style={styles.orderDetails}>
            <Text style={styles.itemName} numberOfLines={2}>{orderItem.name || 'Unknown Item'}</Text>
            <Text style={styles.sellerName}>{activeTab === 'purchases' ? 'Seller' : 'Buyer'}: {otherUser?.full_name || 'Unknown'}</Text>
            <Text style={styles.itemPrice}>₹{item.total_price}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => handleMessageUser(otherUser)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#0052CC" style={{ marginRight: 6 }} />
            <Text style={styles.messageButtonText}>Message {activeTab === 'purchases' ? 'Seller' : 'Buyer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'purchases' && styles.tabButtonActive]}
          onPress={() => setActiveTab('purchases')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}>Purchases</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'sales' && styles.tabButtonActive]}
          onPress={() => setActiveTab('sales')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>Sales</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
        }
        renderItem={renderOrderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.iconBg}>
              <Ionicons name="bag-handle-outline" size={52} color="#0052CC" />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab === 'purchases' ? 'Purchases' : 'Sales'} Yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'purchases' 
                ? 'Items you purchase will appear here.'
                : 'Items you sell to others will appear here.'}
            </Text>
            {activeTab === 'purchases' && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.85}
              >
                <Text style={styles.browseButtonText}>Browse Marketplace</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}


