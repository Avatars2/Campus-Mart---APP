import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import styles from './OrderNotificationDetail.styles';

const getId = (value) => value?.id || value?._id || value;

export default function OrderNotificationDetail({ route, navigation }) {
  const { notification } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadOrder = async () => {
      try {
        const [purchasesResponse, salesResponse] = await Promise.all([
          client.get('/orders?type=purchases'),
          client.get('/orders?type=sales'),
        ]);
        const orderId = String(getId(notification?.relatedId));
        const allOrders = [
          ...(purchasesResponse.data.orders || []),
          ...(salesResponse.data.orders || []),
        ];
        const matchingOrder = allOrders.find((item) => String(getId(item)) === orderId);

        if (!matchingOrder) throw new Error('Order details not found');
        if (active) setOrder(matchingOrder);
      } catch (loadError) {
        if (active) setError('Unable to load order details. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrder();
    return () => { active = false; };
  }, [notification?.relatedId]);

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#0052CC" /></View>;
  }

  if (error || !order) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={styles.errorText}>{error || 'Order details not found.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const item = order.item_id || {};
  const buyer = order.buyer_id || {};
  const seller = order.seller_id || {};
  const statusLabel = order.status === 'completed' ? 'Transaction Successful' : order.status === 'delivered' ? 'Item Delivered' : 'Pending';
  const statusColor = order.status === 'completed' ? '#15803D' : order.status === 'delivered' ? '#B45309' : '#0052CC';
  const paymentLabel = order.payment_method === 'UPI' ? 'Pay now with UPI' : 'Pay when you receive the item';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Notification</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notificationBanner}>
          <Ionicons name="notifications-outline" size={22} color={statusColor} />
          <View style={styles.bannerText}>
            <Text style={styles.notificationTitle}>{notification?.title || 'Order update'}</Text>
            <Text style={styles.notificationBody}>{notification?.body}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current status</Text>
          <View style={styles.statusRow}>
            <Ionicons name={order.status === 'completed' ? 'checkmark-circle' : order.status === 'delivered' ? 'cube' : 'time'} size={24} color={statusColor} />
            <Text style={[styles.statusValue, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item Details</Text>
          <View style={styles.itemRow}>
            <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name || 'Item'}</Text>
              <Text style={styles.detailText}>Quantity: {order.quantity || 1}</Text>
              <Text style={styles.amount}>₹{order.total_price}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buyer Details</Text>
          <Text style={styles.personName}>{buyer.full_name || 'Buyer'}</Text>
          <Text style={styles.detailText}>Mobile No: {buyer.phone || 'Not provided'}</Text>
          <Text style={styles.detailText}>Student ID: {buyer.student_id || 'Not provided'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seller Details</Text>
          <Text style={styles.personName}>{seller.full_name || 'Seller'}</Text>
          <Text style={styles.detailText}>Mobile No: {seller.phone || 'Not provided'}</Text>
          <Text style={styles.detailText}>Student ID: {seller.student_id || 'Not provided'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment and Delivery</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Payment: </Text>{paymentLabel}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Delivery: </Text>{order.delivery_address || 'Campus Pickup'}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Order date: </Text>{new Date(order.createdAt).toLocaleDateString('en-IN')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
