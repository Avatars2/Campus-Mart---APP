import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Platform, Alert, Modal, Linking, ScrollView } from 'react-native';
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
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
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
        body { margin: 0; padding: 36px; color: #0F1111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 14px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E5E7EB; padding-bottom: 24px; }
        .brand { color: #0F1111; font-size: 32px; font-weight: 900; margin: 0 0 4px; letter-spacing: -0.5px; }
        .brand span { color: #007185; }
        .muted { color: #565959; }
        .meta { text-align: right; line-height: 1.7; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 32px 0; }
        .party { border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; min-height: 120px; background: #FAFAFA; }
        .party h3 { color: #565959; font-size: 12px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .party strong { font-size: 16px; margin-bottom: 8px; display: block; color: #0F1111; }
        .party span { display: block; line-height: 1.6; color: #565959; }
        .summary { background: #E6F7F9; border-radius: 12px; padding: 16px 20px; margin-bottom: 32px; display: flex; gap: 32px; border: 1px solid #B4E4EA; }
        .summary div { display: flex; flex-direction: column; }
        .summary div span:first-child { color: #565959; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
        .summary div span:last-child { font-weight: 700; color: #007185; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #F3F4F6; color: #565959; text-align: left; padding: 14px 16px; font-weight: 600; text-transform: uppercase; font-size: 12px; border-bottom: 2px solid #E5E7EB; }
        td { border-bottom: 1px solid #E5E7EB; padding: 16px; vertical-align: middle; }
        .amount { font-weight: 700; text-align: right; white-space: nowrap; color: #0F1111; }
        .total-row { border-top: 2px solid #E5E7EB; margin-top: 16px; padding-top: 24px; display: flex; justify-content: flex-end; align-items: center; }
        .total-label { font-size: 16px; color: #565959; margin-right: 16px; }
        .total-amount { font-size: 24px; font-weight: 900; color: #007185; }
        .details-box { background: #F9FAFB; padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB; }
        .details-box p { margin: 0 0 12px 0; }
        .details-box p:last-child { margin: 0; }
        .invoice-actions { margin-top: 40px; text-align: center; }
        .invoice-actions button { border: 0; border-radius: 8px; background: #007185; color: #FFFFFF; cursor: pointer; font-size: 15px; font-weight: 700; padding: 14px 24px; box-shadow: 0 2px 4px rgba(0,113,133,0.2); }
        @media print { .invoice-actions { display: none; } body { padding: 0; } }
      </style></head><body>
        <div class="header"><div><p class="brand">Campus<span>Mart</span></p><span class="muted">Student Marketplace Invoice</span></div><div class="meta"><strong>ORDER INVOICE</strong><br><span class="muted">Issued ${escapeHtml(new Date().toLocaleDateString('en-IN'))}</span></div></div>
        <div class="parties">
          <div class="party"><h3>Buyer Details</h3><strong>${escapeHtml(buyer.full_name || 'Buyer')}</strong><span>Mobile: ${escapeHtml(buyer.phone)}</span><span>Student ID: ${escapeHtml(buyer.student_id)}</span></div>
          <div class="party"><h3>Seller Details</h3><strong>${escapeHtml(seller.full_name || 'Seller')}</strong><span>Mobile: ${escapeHtml(seller.phone)}</span><span>Student ID: ${escapeHtml(seller.student_id)}</span></div>
        </div>
        <div class="summary">
          <div><span>Order Number</span><span>#${escapeHtml(orderNumber)}</span></div>
          <div><span>Order Date</span><span>${escapeHtml(orderDate)}</span></div>
          <div><span>Status</span><span>${status}</span></div>
        </div>
        <table>
          <thead><tr><th>Item Description</th><th style="text-align:center">Quantity</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody><tr>
            <td><strong style="color: #0F1111; font-size: 15px;">${escapeHtml(item.name || 'Item')}</strong></td>
            <td style="text-align:center; color: #565959;">${order.quantity || 1}</td>
            <td class="amount">₹${escapeHtml(order.total_price)}</td>
          </tr></tbody>
        </table>
        <div class="details-box">
          <p><strong>Delivery Details:</strong> ${escapeHtml(order.delivery_address || 'Discuss with seller via Messages')}</p>
          <p><strong>Payment Method:</strong> ${escapeHtml(payment)}</p>
        </div>
        <div class="total-row">
          <span class="total-label">Total Amount:</span>
          <span class="total-amount">₹${escapeHtml(order.total_price)}</span>
        </div>
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

    const renderOrderDetailsModal = () => {
    if (!selectedOrderDetails) return null;
    const item = selectedOrderDetails;
    const orderItem = item.item_id || {};
    const seller = item.seller_id || {};
    const otherUser = activeTab === 'purchases' ? item.seller_id : item.buyer_id;
    const date = new Date(item.createdAt);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };
    const orderDateString = formatDateTime(item.createdAt);
    const updatedDateString = formatDateTime(item.updatedAt);

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed': case 'delivered': case 'rental_active': return { bg: '#E8F5E9', text: '#2E7D32' };
        case 'return_requested': case 'pending': return { bg: '#FFF8E1', text: '#F59E0B' };
        default: return { bg: '#F3F4F6', text: '#565959' };
      }
    };
    const statusColors = getStatusColor(item.status);

    return (
      <Modal visible={true} transparent animationType="slide" onRequestClose={() => setSelectedOrderDetails(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelectedOrderDetails(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Placed: {orderDateString}</Text>
                  {item.status === 'completed' && (
                    <Text style={{ fontSize: 13, color: '#059669', fontWeight: '500' }}>Confirmed: {updatedDateString}</Text>
                  )}
                  {item.status === 'delivered' && (
                    <Text style={{ fontSize: 13, color: '#059669', fontWeight: '500' }}>Delivered: {updatedDateString}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, marginRight: 12 }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {item.status === 'completed' ? 'Completed' : item.status === 'return_requested' ? 'Return requested' : item.status === 'rental_active' ? 'Rental active' : item.status === 'delivered' ? 'Delivered' : 'Pending'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.invoiceIconButton}
                    onPress={() => handleInvoice(item)}
                    disabled={invoiceLoading === (item._id || item.id)}
                    activeOpacity={0.8}
                  >
                    {invoiceLoading === (item._id || item.id) ? (
                      <ActivityIndicator size="small" color="#007185" />
                    ) : (
                      <Ionicons name="receipt-outline" size={19} color="#007185" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.orderContent, { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 16, marginBottom: 16 }]}>
                <Image source={{ uri: orderItem.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.itemImage} />
                <View style={styles.orderDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>{orderItem.name || 'Unknown Item'}</Text>
                  <Text style={styles.sellerName}>{activeTab === 'purchases' ? 'Seller' : 'Buyer'}: {otherUser?.full_name || 'Unknown'}</Text>
                  <Text style={styles.itemPrice}>₹{item.total_price}{orderItem.listing_type === 'rent' ? ` / ${orderItem.rental_period || 'day'}` : ''}</Text>
                  {orderItem.listing_type === 'rent' && item.rental_due_at && item.status === 'rental_active' && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.sellerName}>
                        {activeTab === 'sales' ? 'Buyer time remaining' : 'Time remaining'}: {formatRentalTimeRemaining(item.rental_due_at)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#111827' }}>Actions</Text>
              
              <View style={{ gap: 12 }}>
                {activeTab === 'sales' && item.status === 'pending' && (
                  <TouchableOpacity style={styles.completeButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'delivered', 'Mark item as delivered?', 'Confirm that you delivered this item to the buyer.'); }}>
                    <Ionicons name="cube-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.completeButtonText}>Mark delivered</Text>
                  </TouchableOpacity>
                )}
                {activeTab === 'purchases' && item.status === 'delivered' && orderItem.listing_type !== 'rent' && (
                  <TouchableOpacity style={styles.confirmReceivedButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'completed', 'Confirm item received?', 'Tap Yes to confirm that the item was successfully received.'); }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmReceivedText}>Confirm Receipt</Text>
                  </TouchableOpacity>
                )}
                {activeTab === 'purchases' && item.status === 'delivered' && orderItem.listing_type === 'rent' && (
                  <TouchableOpacity style={styles.confirmReceivedButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'rental_active', 'Start rental period?', 'Confirm that you received the item. The rental period starts now.'); }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmReceivedText}>Start Rental</Text>
                  </TouchableOpacity>
                )}
                {activeTab === 'purchases' && item.status === 'rental_active' && (
                  item.rental_due_at && new Date(item.rental_due_at) <= new Date() ? (
                    <TouchableOpacity style={styles.confirmReceivedButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'return_requested', 'Request item return?', 'Confirm that you are returning the item to the seller.'); }}>
                      <Ionicons name="return-down-back-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmReceivedText}>Return item</Text>
                    </TouchableOpacity>
                  ) : null
                )}
                {activeTab === 'sales' && item.status === 'return_requested' && (
                  <TouchableOpacity style={styles.completeButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'completed', 'Confirm item returned?', 'Confirm that you received the returned rental item from the buyer.'); }}>
                    <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.completeButtonText}>Confirm return</Text>
                  </TouchableOpacity>
                )}

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity style={[styles.messageButton, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => {
                    if (otherUser?.phone) { Linking.openURL(`tel:${otherUser.phone}`); } else { Alert.alert('Phone Number Unavailable', 'This user has not provided a phone number.'); }
                  }}>
                    <Ionicons name="call-outline" size={18} color="#0F1111" style={{ marginRight: 8 }} />
                    <Text style={[styles.messageButtonText, { color: '#0F1111' }]}>Call</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.messageButton, { flex: 1 }]} onPress={() => { setSelectedOrderDetails(null); handleMessageUser(otherUser, orderItem); }}>
                    <Ionicons name="chatbubble-outline" size={18} color="#007185" style={{ marginRight: 8 }} />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderOrderItem = ({ item }) => {
    const orderItem = item.item_id || {};
    const date = new Date(item.createdAt);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const otherUser = activeTab === 'purchases' ? item.seller_id : item.buyer_id;

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed': case 'delivered': case 'rental_active': return { bg: '#E8F5E9', text: '#2E7D32' };
        case 'return_requested': case 'pending': return { bg: '#FFF8E1', text: '#F59E0B' };
        default: return { bg: '#F3F4F6', text: '#565959' };
      }
    };
    const statusColors = getStatusColor(item.status);

    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => setSelectedOrderDetails(item)} activeOpacity={0.7}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderDate}>{dateString}</Text>
          <View style={styles.orderHeaderActions}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {item.status === 'completed' ? 'Completed' : item.status === 'return_requested' ? 'Return requested' : item.status === 'rental_active' ? 'Rental active' : item.status === 'delivered' ? 'Delivered' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderContent}>
          <Image source={{ uri: orderItem.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.itemImage} />
          <View style={styles.orderDetails}>
            <Text style={styles.itemName} numberOfLines={2}>{orderItem.name || 'Unknown Item'}</Text>
            <Text style={styles.sellerName}>{activeTab === 'purchases' ? 'Seller' : 'Buyer'}: {otherUser?.full_name || 'Unknown'}</Text>
            <Text style={styles.itemPrice}>₹{item.total_price}{orderItem.listing_type === 'rent' ? ` / ${orderItem.rental_period || 'day'}` : ''}</Text>
            {orderItem.listing_type === 'rent' && item.rental_due_at && item.status === 'rental_active' && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.sellerName}>
                  {activeTab === 'sales' ? 'Buyer time remaining' : 'Time remaining'}: {formatRentalTimeRemaining(item.rental_due_at)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
      {renderOrderDetailsModal()}
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
        <Text style={styles.headerTitle}>My<Text style={{ color: '#007185' }}>Orders</Text></Text>
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





