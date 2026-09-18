import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import RatingStars from '../../components/commerce/RatingStars';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

export default function BuyScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' or 'sales'
  const [confirmation, setConfirmation] = useState(null);
  const [ratingPrompt, setRatingPrompt] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [invoiceLoading, setInvoiceLoading] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

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

  useEffect(() => {
    const hasActiveRental = orders.some((order) => order.status === 'rental_active' && order.rental_due_at);
    if (!hasActiveRental) return undefined;

    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [orders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatRentalTimeRemaining = (dueAt) => {
    const remainingSeconds = Math.max(0, Math.floor((new Date(dueAt).getTime() - currentTime) / 1000));
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleMessageUser = (user, item) => {
    const otherUserId = user?._id || user?.id;
    const itemId = item?._id || item?.id;

    if (!otherUserId || !itemId) return;

    navigation.navigate('Messages', {
      screen: 'ChatThread',
      params: {
        itemId,
        otherUserId,
        itemName: item.name || 'Item',
        otherUserName: user.full_name || 'User'
      }
    });
  };

  const updateOrderStatus = (order, nextStatus, title, message) => {
    setConfirmation({ order, nextStatus, title, message });
  };

  const confirmOrderStatus = async () => {
    if (!confirmation) return;

    const { order, nextStatus } = confirmation;
    try {
      await client.patch('/orders', {
        order_id: order._id || order.id,
        status: nextStatus,
      });
      setConfirmation(null);
      await fetchOrders();
      if (nextStatus === 'return_requested') {
        const buyerId = order.buyer_id?._id || order.buyer_id?.id;
        const sellerId = order.seller_id?._id || order.seller_id?.id;
        const itemId = order.item_id?._id || order.item_id?.id;
        try {
          await client.post('/messages', {
            senderId: buyerId,
            receiverId: sellerId,
            itemId,
            content: `I am ready to return ${order.item_id?.name || 'the rented item'}. Please discuss the return handover with me.`,
          });
        } catch (messageError) {
          console.error('Return message failed:', messageError);
        }
        handleMessageUser(order.seller_id, order.item_id);
      }
      if (nextStatus === 'completed' && order.item_id?.listing_type !== 'rent') {
        setSelectedRating(0);
        setRatingPrompt(order);
      }
    } catch (error) {
      setConfirmation(null);
      Alert.alert('Unable to update order', error.response?.data?.error || 'Please try again.');
    }
  };

  const submitRating = async () => {
    if (!ratingPrompt || !selectedRating) return;

    try {
      await client.patch('/orders', {
        order_id: ratingPrompt._id || ratingPrompt.id,
        rating: selectedRating,
      });
      setRatingPrompt(null);
      await fetchOrders();
    } catch (error) {
      Alert.alert('Unable to save rating', error.response?.data?.error || 'Please try again.');
    }
  };

  const escapeHtml = (value) => String(value || 'Not provided')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const generateInvoiceHtml = (order) => {
    const item = order.item_id && typeof order.item_id === 'object' ? order.item_id : {};
    const buyer = order.buyer_id && typeof order.buyer_id === 'object' ? order.buyer_id : {};
    const seller = order.seller_id && typeof order.seller_id === 'object' ? order.seller_id : {};
    const status = order.status === 'completed'
      ? 'Completed'
      : order.status === 'return_requested'
        ? 'Return requested'
        : order.status === 'rental_active'
          ? 'Rental active'
          : order.status === 'delivered'
            ? 'Delivered'
            : 'Pending';
    const orderNumber = String(order._id || order.id || 'CAMPUSMART').slice(-10).toUpperCase();
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const payment = order.payment_method === 'UPI' ? 'Pay now with UPI' : 'Pay when you receive the item';

    return `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 36px; color: #1A1F36; font-family: Arial, sans-serif; font-size: 13px; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0052CC; padding-bottom: 20px; }
        .brand { color: #0052CC; font-size: 28px; font-weight: 800; margin: 0 0 5px; }
        .muted { color: #697386; }
        .meta { text-align: right; line-height: 1.7; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 26px 0; }
        .party { border: 1px solid #D9E2F2; border-radius: 8px; padding: 16px; min-height: 110px; }
        .party h3 { color: #0052CC; font-size: 12px; margin: 0 0 10px; text-transform: uppercase; }
        .party strong, .party span { display: block; line-height: 1.6; }
        .summary { background: #F0F5FF; border-radius: 8px; padding: 14px 16px; margin-bottom: 26px; }
        .summary span { display: inline-block; margin-right: 28px; line-height: 1.8; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        th { background: #0052CC; color: white; text-align: left; padding: 11px 10px; }
        td { border-bottom: 1px solid #E2E8F0; padding: 12px 10px; vertical-align: top; }
        .amount { font-weight: 700; text-align: right; white-space: nowrap; }
        .total { text-align: right; font-size: 18px; font-weight: 800; color: #0052CC; }
        .invoice-actions { margin-top: 28px; text-align: center; }
        .invoice-actions button { border: 0; border-radius: 6px; background: #0052CC; color: #FFFFFF; cursor: pointer; font-size: 14px; font-weight: 700; padding: 11px 18px; }
        @media print { .invoice-actions { display: none; } }
      </style></head><body>
        <div class="header"><div><p class="brand">CampusMart</p><span class="muted">Student marketplace invoice</span></div><div class="meta"><strong>ORDER INVOICE</strong><br><span class="muted">Issued ${escapeHtml(new Date().toLocaleDateString('en-IN'))}</span></div></div>
        <div class="parties">
          <div class="party"><h3>Buyer</h3><strong>${escapeHtml(buyer.full_name || 'Buyer')}</strong><span>Mobile No: ${escapeHtml(buyer.phone)}</span><span>Student ID: ${escapeHtml(buyer.student_id)}</span></div>
          <div class="party"><h3>Seller</h3><strong>${escapeHtml(seller.full_name || 'Seller')}</strong><span>Mobile No: ${escapeHtml(seller.phone)}</span><span>Student ID: ${escapeHtml(seller.student_id)}</span></div>
        </div>
        <div class="summary"><span><strong>Order:</strong> #${escapeHtml(orderNumber)}</span><span><strong>Date:</strong> ${escapeHtml(orderDate)}</span><span><strong>Status:</strong> ${status}</span></div>
        <table><thead><tr><th>Item</th><th>Quantity</th><th style="text-align:right">Amount</th></tr></thead><tbody><tr><td><strong>${escapeHtml(item.name || 'Item')}</strong></td><td>${order.quantity || 1}</td><td class="amount">₹${escapeHtml(order.total_price)}</td></tr></tbody></table>
        <p><strong>Delivery:</strong> ${escapeHtml(order.delivery_address || 'Discuss with seller via Messages')}</p>
        <p><strong>Payment:</strong> ${escapeHtml(payment)}</p>
        <div class="total">Total amount: ₹${escapeHtml(order.total_price)}</div>
      </body></html>
    `;
  };

  const handleInvoice = async (order) => {
    const orderId = order._id || order.id;
    setInvoiceLoading(orderId);
    try {
      const html = generateInvoiceHtml(order);
      if (Platform.OS === 'web') {
        const invoiceWindow = window.open('', '_blank');
        if (!invoiceWindow) {
          throw new Error('Invoice window could not be opened');
        }

        invoiceWindow.document.open();
        invoiceWindow.document.write(html.replace('</body>', '<div class="invoice-actions"><button onclick="window.print()">Print / Save PDF</button></div></body>'));
        invoiceWindow.document.close();
        invoiceWindow.document.title = `CampusMart Invoice ${orderId}`;
      } else {
        const { base64 } = await Print.printToFileAsync({ html, base64: true });
        const fileName = `CampusMart_Invoice_${String(orderId).slice(-8).toUpperCase()}.pdf`;
        const localUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        
        if (Platform.OS === 'android') {
          const contentUri = await FileSystem.getContentUriAsync(localUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf',
          });
        } else {
          await Sharing.shareAsync(localUri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Invoice error', error?.message || 'Failed to generate the invoice. Please try again.');
    } finally {
      setInvoiceLoading(null);
    }
  };

  const orderSections = [
    {
      title: 'Pending Orders',
      data: orders.filter((order) => order.status !== 'completed'),
    },
    {
      title: 'Completed Orders',
      data: orders.filter((order) => order.status === 'completed'),
    },
  ].filter((section) => section.data.length > 0);

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
          <View style={styles.orderHeaderActions}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {item.status === 'completed'
                  ? 'Completed'
                  : item.status === 'return_requested'
                    ? 'Return requested'
                    : item.status === 'rental_active'
                      ? 'Rental active'
                      : item.status === 'delivered'
                        ? 'Delivered'
                        : 'Pending'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.invoiceIconButton}
              onPress={() => handleInvoice(item)}
              disabled={invoiceLoading === (item._id || item.id)}
              accessibilityLabel="Generate invoice"
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={19} color="#0052CC" />
            </TouchableOpacity>
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
            <Text style={styles.sellerName}>{item.delivery_address || 'Discuss with seller via Messages'} · {item.payment_method === 'UPI' ? 'Pay now with UPI' : 'Pay when you receive the item'}</Text>
            <Text style={styles.itemPrice}>₹{item.total_price}{orderItem.listing_type === 'rent' ? ` / ${orderItem.rental_period || 'day'}` : ''}</Text>
            {orderItem.listing_type === 'rent' && item.rental_due_at && item.status === 'rental_active' && (
              <View>
                <Text style={styles.sellerName}>
                  {activeTab === 'sales' ? 'Buyer time remaining' : 'Time remaining'}: {formatRentalTimeRemaining(item.rental_due_at)}
                </Text>
                <Text style={styles.sellerName}>Return by: {new Date(item.rental_due_at).toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.orderFooter}>
          {activeTab === 'sales' && item.status === 'pending' && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => updateOrderStatus(
                item,
                'delivered',
                'Mark item as delivered?',
                'Confirm that you delivered this item to the buyer.'
              )}
              activeOpacity={0.8}
            >
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.completeButtonText}>Mark item delivered</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'purchases' && item.status === 'delivered' && orderItem.listing_type !== 'rent' && (
            <View style={styles.receivedGroup}>
              <Text style={styles.receivedPrompt}>Did you receive this item?</Text>
              <TouchableOpacity
                style={styles.confirmReceivedButton}
                onPress={() => updateOrderStatus(
                  item,
                  'completed',
                  'Confirm item received?',
                  'Tap Yes to confirm that the item was successfully received.'
                )}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmReceivedText}>Yes, received</Text>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === 'purchases' && item.status === 'delivered' && orderItem.listing_type === 'rent' && (
            <View style={styles.receivedGroup}>
              <Text style={styles.receivedPrompt}>Did you receive this rental item?</Text>
              <TouchableOpacity
                style={styles.confirmReceivedButton}
                onPress={() => updateOrderStatus(
                  item,
                  'rental_active',
                  'Start rental period?',
                  'Confirm that you received the item. The rental period starts now.'
                )}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmReceivedText}>Confirm receipt</Text>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === 'purchases' && item.status === 'rental_active' && (
            <View style={styles.receivedGroup}>
              <Text style={styles.receivedPrompt}>
                {item.rental_due_at && new Date(item.rental_due_at).getTime() > currentTime
                  ? `Time remaining: ${formatRentalTimeRemaining(item.rental_due_at)}`
                  : 'Rental time has ended. Return the item to the seller.'}
              </Text>
              {item.rental_due_at && new Date(item.rental_due_at) <= new Date() ? (
                <TouchableOpacity
                  style={styles.confirmReceivedButton}
                  onPress={() => updateOrderStatus(
                    item,
                    'return_requested',
                    'Request item return?',
                    'Confirm that you are returning the item to the seller.'
                  )}
                  activeOpacity={0.8}
                >
                  <Ionicons name="return-down-back-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmReceivedText}>Return item</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          {activeTab === 'sales' && item.status === 'return_requested' && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => updateOrderStatus(
                item,
                'completed',
                'Confirm item returned?',
                'Confirm that you received the returned rental item from the buyer.'
              )}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.completeButtonText}>Confirm return</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'purchases' && item.status === 'completed' && (
            <View style={styles.completedGroup}>
              <View style={styles.successMessage}>
                <Ionicons name="checkmark-circle" size={17} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={styles.successMessageText}>{orderItem.listing_type === 'rent' ? 'Rental completed' : 'Transaction successful'}</Text>
              </View>
              {item.buyer_rating ? (
                <View style={styles.ratingSubmitted}>
                  <Text style={styles.ratingSubmittedLabel}>Your rating:</Text>
                  <RatingStars value={item.buyer_rating} count={0} size={13} showCount={false} />
                </View>
              ) : null}
            </View>
          )}
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => handleMessageUser(otherUser, orderItem)}
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
      <Modal
        visible={Boolean(confirmation)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmation(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="cube-outline" size={28} color="#0052CC" />
            </View>
            <Text style={styles.confirmationTitle}>{confirmation?.title}</Text>
            <Text style={styles.confirmationMessage}>{confirmation?.message}</Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.noButton}
                onPress={() => setConfirmation(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.noButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.yesButton}
                onPress={confirmOrderStatus}
                activeOpacity={0.8}
              >
                <Text style={styles.yesButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(ratingPrompt)}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingPrompt(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationModal}>
            <View style={styles.ratingIcon}>
              <Ionicons name="star" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.confirmationTitle}>Rate this item</Text>
            <Text style={styles.confirmationMessage}>How would you rate your purchase of {ratingPrompt?.item_id?.name || 'this item'}?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)} activeOpacity={0.75}>
                  <Ionicons name={star <= selectedRating ? 'star' : 'star-outline'} size={34} color="#F59E0B" style={styles.starIcon} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.confirmationActions}>
              <TouchableOpacity style={styles.noButton} onPress={() => setRatingPrompt(null)} activeOpacity={0.8}>
                <Text style={styles.noButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.yesButton, !selectedRating && styles.disabledButton]} onPress={submitRating} disabled={!selectedRating} activeOpacity={0.8}>
                <Text style={styles.yesButtonText}>Submit rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      
      <SectionList
        sections={orderSections}
        keyExtractor={(item, index) => item._id || item.id || String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
        }
        renderItem={renderOrderItem}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
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


