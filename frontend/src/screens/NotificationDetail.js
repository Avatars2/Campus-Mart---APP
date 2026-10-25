import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { openAttachment } from '../utils/attachmentHelper';
import styles from './NotificationDetail.styles';

const getId = (value) => value?.id || value?._id || value;

export default function NotificationDetail({ route, navigation }) {
  const { notification } = route.params || {};
  const isSystemNotification = notification?.type === 'SYSTEM';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!isSystemNotification);
  const [error, setError] = useState(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  useEffect(() => {
    if (isSystemNotification) {
      setLoading(false);
      return;
    }

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
  }, [notification?.relatedId, isSystemNotification]);

  const handleOpenPdf = async () => {
    if (!notification?.attachment?.url) return;
    setOpeningPdf(true);
    try {
      await openAttachment({
        url: notification.attachment.url,
        fileName: notification.attachment.name,
        name: notification.attachment.name,
        mimeType: notification.attachment.mimeType || 'application/pdf',
      });
    } finally {
      setOpeningPdf(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // If System Notification (Admin Announcement)
  if (isSystemNotification) {
    const hasPdf = Boolean(notification?.attachment?.url);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color="#1A1F36" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Campus Announcement
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.notificationBanner}>
            <Ionicons name="megaphone-outline" size={24} color="#2563EB" />
            <View style={styles.bannerText}>
              <Text style={styles.notificationTitle}>{notification?.title || 'Notice'}</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {notification?.createdAt
                  ? new Date(notification.createdAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recent'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 8 }]}>Announcement Details</Text>
            <Text style={{ fontSize: 15, color: '#334155', lineHeight: 24 }}>
              {notification?.body}
            </Text>
          </View>

          {hasPdf && (
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 12 }]}>Attached Document</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#EFF6FF',
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                  borderRadius: 12,
                  padding: 14,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 }}>
                  <Ionicons name="document-text" size={32} color="#2563EB" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A8A' }} numberOfLines={1}>
                      {decodeURIComponent(notification.attachment.name || 'Notice_Attachment.pdf')}
                    </Text>
                    {Boolean(notification.attachment.size) && (
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        PDF Document • {formatFileSize(notification.attachment.size)}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#2563EB',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    opacity: openingPdf ? 0.7 : 1,
                  }}
                  onPress={handleOpenPdf}
                  disabled={openingPdf}
                  activeOpacity={0.8}
                >
                  {openingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                    {openingPdf ? 'Opening...' : 'View PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: '#2563EB', borderColor: '#2563EB', alignItems: 'center' }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backButtonText, { color: '#FFFFFF', fontWeight: '600' }]}>Close Notice</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Order Notifications handling (Original flow)
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
  const statusLabel = order.status === 'completed'
    ? (item.listing_type === 'rent' ? 'Rental Completed' : 'Transaction Successful')
    : order.status === 'return_requested'
      ? 'Return Requested'
      : order.status === 'rental_active'
        ? 'Rental Active'
        : order.status === 'delivered'
          ? 'Item Delivered'
          : 'Pending';
  const statusColor = order.status === 'completed' ? '#007600' : order.status === 'pending' ? '#007185' : '#E77600';
  const paymentLabel = ['UPI', 'Razorpay'].includes(order.payment_method)
    ? (order.payment_status === 'paid' ? 'Paid with Razorpay' : 'Razorpay payment pending')
    : 'Pay when you receive the item';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{notification?.title || 'Order Details'}</Text>
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
            <Ionicons name={order.status === 'completed' ? 'checkmark-circle' : order.status === 'delivered' ? 'cube' : order.status === 'return_requested' ? 'return-down-back' : order.status === 'rental_active' ? 'timer-outline' : 'time'} size={24} color={statusColor} />
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
              {item.listing_type === 'rent' && <Text style={styles.detailText}>Rate: ₹{item.price} per {item.rental_period || 'day'}</Text>}
              {order.rental_due_at && <Text style={styles.detailText}>Return by: {new Date(order.rental_due_at).toLocaleString()}</Text>}
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
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Payment status: </Text>{order.payment_status || 'unpaid'}</Text>
          {order.seller_payout_status && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Seller transfer: </Text>{order.seller_payout_status}
            </Text>
          )}
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Delivery: </Text>{order.delivery_address || 'Campus Pickup'}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Order date: </Text>{new Date(order.createdAt).toLocaleDateString('en-IN')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
