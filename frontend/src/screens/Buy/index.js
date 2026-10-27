import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Platform, Alert, Modal, Linking, ScrollView, TextInput } from 'react-native';
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
import openRazorpayCheckout from '../../payments/razorpayCheckout';

const PAGE_SIZE = 10;

export default function BuyScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' or 'sales'
  const [confirmation, setConfirmation] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [ratingPrompt, setRatingPrompt] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [extensionModalOrder, setExtensionModalOrder] = useState(null);
  const [extensionDuration, setExtensionDuration] = useState(1);
  const [isExtending, setIsExtending] = useState(false);

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await client.get(`/orders?type=${activeTab}`);
      setOrders(res.data.orders);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error('Fetch Orders Error:', err);
      }
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

  const handleExtendRental = async () => {
    if (!extensionModalOrder || isExtending) return;

    setIsExtending(true);
    try {
      // Step 1: Request Razorpay Order from backend
      const orderRes = await client.post('/orders/extend-rental', {
        order_id: extensionModalOrder._id || extensionModalOrder.id,
        extension_duration: extensionDuration,
        action: 'create_order',
      });

      const { razorpay_order_id, hosted_checkout_url, amount, currency, key_id, duration, period } = orderRes.data;
      const unitLabel = period === 'hour' ? 'Hour' : period === 'month' ? 'Month' : 'Day';
      const unitLabelPlural = period === 'hour' ? 'Hours' : period === 'month' ? 'Months' : 'Days';
      const label = duration === 1 ? unitLabel : unitLabelPlural;

      // Step 2: Open Razorpay Checkout payment gateway
      let checkoutResponse = null;
      try {
        checkoutResponse = await openRazorpayCheckout({
          key: key_id,
          order_id: razorpay_order_id,
          amount: amount,
          currency: currency || 'INR',
          name: 'Campus Mart',
          description: `Extend rental by +${duration} ${label}`,
          hosted_checkout_url: hosted_checkout_url,
          theme: { color: '#007185' },
          modal: { confirm_close: true },
        });
      } catch (payErr) {
        if (payErr.message === 'Payment was cancelled' || payErr.message === 'Payment cancelled') {
          setIsExtending(false);
          return;
        }
        throw payErr;
      }

      // Step 3: Confirm payment & extend rental with backend
      try {
        const confirmRes = await client.post('/orders/extend-rental', {
          order_id: extensionModalOrder._id || extensionModalOrder.id,
          extension_duration: extensionDuration,
          action: 'confirm',
          razorpay_order_id: checkoutResponse?.razorpay_order_id || razorpay_order_id,
          razorpay_payment_id: checkoutResponse?.razorpay_payment_id || null,
          razorpay_signature: checkoutResponse?.razorpay_signature || null,
        });

        // Immediately update local order state
        if (confirmRes.data?.order) {
          const updated = confirmRes.data.order;
          setOrders(prev => prev.map(o =>
            String(o._id || o.id) === String(updated._id || updated.id)
              ? { ...o, ...updated, item_id: o.item_id }
              : o
          ));
        }

        // Seamlessly close modal and refresh active purchases without blocking Alert dialog
        setExtensionModalOrder(null);
        setExtensionDuration(1);
        setSelectedOrderDetails(null);
        await fetchOrders();
        return;
      } catch (confirmErr) {
        const errMsg = confirmErr.response?.data?.error || confirmErr.message || '';
        if (checkoutResponse?.type === 'cancel' || checkoutResponse?.type === 'dismiss') {
          if (errMsg.includes('not been completed') || errMsg.includes('was not completed')) {
            setIsExtending(false);
            return;
          }
        }
        throw confirmErr;
      }
    } catch (err) {
      if (err?.message === 'Payment was cancelled' || err?.message === 'Payment cancelled') {
        setIsExtending(false);
        return;
      }
      console.error('Extend rental error:', err);
      Alert.alert('Extension Failed', err.response?.data?.error || err.message || 'Could not extend rental. Please try again.');
    } finally {
      setIsExtending(false);
    }
  };

  const calculateNewDueDate = (currentDueStr, duration, period) => {
    const now = new Date();
    const currentDue = currentDueStr ? new Date(currentDueStr) : now;
    const base = currentDue.getTime() > now.getTime() ? currentDue : now;
    const next = new Date(base);
    const p = period || 'day';
    if (p === 'hour') next.setHours(next.getHours() + duration);
    else if (p === 'month') next.setMonth(next.getMonth() + duration);
    else next.setDate(next.getDate() + duration);
    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + next.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const updateOrderStatus = (order, nextStatus, title, message) => {
    setConfirmation({ order, nextStatus, title, message });
  };

  const confirmOrderStatus = async () => {
    if (!confirmation || isUpdating) return;

    setIsUpdating(true);
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
    } finally {
      setIsUpdating(false);
    }
  };

  const submitRating = async () => {
    if (!ratingPrompt || !selectedRating || isRatingSubmitting) return;

    setIsRatingSubmitting(true);
    try {
      await client.patch('/orders', {
        order_id: ratingPrompt._id || ratingPrompt.id,
        rating: selectedRating,
      });
      setRatingPrompt(null);
      setSelectedRating(0);
      await fetchOrders();
      Alert.alert('Rating Submitted', 'Thank you for your rating!');
    } catch (error) {
      Alert.alert('Unable to save rating', error.response?.data?.error || 'Please try again.');
    } finally {
      setIsRatingSubmitting(false);
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
    const payment = ['UPI', 'Razorpay'].includes(order.payment_method)
      ? 'Paid securely with Razorpay'
      : 'Pay when you receive the item';

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

  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset filter when switching between Purchases and Sales
  useEffect(() => {
    setActiveFilter('All');
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const activeCount = orders.filter(o => !['completed', 'cancelled', 'returned'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const returnedCount = orders.filter(o => o.status === 'returned').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Active') return !['completed', 'cancelled', 'returned'].includes(order.status);
      if (activeFilter === 'Completed') return order.status === 'completed';
      if (activeFilter === 'Returned') return order.status === 'returned';
      if (activeFilter === 'Cancelled') return order.status === 'cancelled';
      return true;
    });
  }, [orders, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const renderDashboardCards = () => (
    <View style={{ flex: 1, flexDirection: 'column', gap: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setActiveFilter('Active')} 
        style={{ flex: 1, backgroundColor: '#EFF6FF', paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#1D4ED8', fontWeight: '600' }}>Active Orders</Text>
        <Text style={{ fontSize: 32, color: '#1E3A8A', fontWeight: '800' }}>{activeCount}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setActiveFilter('Completed')} 
        style={{ flex: 1, backgroundColor: '#F0FDF4', paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#15803D', fontWeight: '600' }}>Completed Orders</Text>
        <Text style={{ fontSize: 32, color: '#14532D', fontWeight: '800' }}>{completedCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setActiveFilter('Returned')} 
        style={{ flex: 1, backgroundColor: '#FDF4FF', paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#A21CAF', fontWeight: '600' }}>Returned Orders</Text>
        <Text style={{ fontSize: 32, color: '#701A75', fontWeight: '800' }}>{returnedCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setActiveFilter('Cancelled')} 
        style={{ flex: 1, backgroundColor: '#FEF2F2', paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#B91C1C', fontWeight: '600' }}>Cancelled Orders</Text>
        <Text style={{ fontSize: 32, color: '#7F1D1D', fontWeight: '800' }}>{cancelledCount}</Text>
      </TouchableOpacity>
    </View>
  );

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
        case 'return_requested': case 'pending': case 'cancel_requested': return { bg: '#FFF8E1', text: '#F59E0B' };
        case 'cancelled': case 'returned': return { bg: '#FEE2E2', text: '#DC2626' };
        default: return { bg: '#F3F4F6', text: '#565959' };
      }
    };
    const statusColors = getStatusColor(item.status);

    const getStatusText = (status) => {
      if (status === 'cancel_requested') return 'Cancel requested';
      if (status === 'return_requested') return 'Return requested';
      if (status === 'rental_active') return 'Rental active';
      return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const canCancel = activeTab === 'purchases' && (item.status === 'pending' || item.status === 'cancel_requested');
    const canReturn = activeTab === 'purchases' && (
      (item.status === 'completed' && orderItem.listing_type !== 'rent' && (Date.now() - new Date(item.completed_at || item.updatedAt).getTime() <= 7 * 24 * 60 * 60 * 1000))
      || (item.status === 'rental_active' && item.rental_due_at && new Date(item.rental_due_at) <= new Date())
    );

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
                  {item.status === 'cancelled' && (
                    <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '500' }}>Cancelled: {updatedDateString}</Text>
                  )}
                  {item.status === 'returned' && (
                    <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '500' }}>Returned: {updatedDateString}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, marginRight: 12 }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {getStatusText(item.status)}
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
                  {item.payment_status === 'refunded' && (
                    <Text style={{ color: '#059669', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                      Refunded to original payment method
                    </Text>
                  )}
                  {item.payment_status === 'pending_approval' && (
                    <Text style={{ color: '#B45309', fontSize: 12, marginTop: 4 }}>
                      Payment received late; order is not confirmed. Contact Campus Mart support.
                    </Text>
                  )}
                  {activeTab === 'sales'
                    && ['UPI', 'Razorpay'].includes(item.payment_method)
                    && item.seller_payout_status && (
                      <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                        Seller payout: {item.seller_payout_status.replace(/_/g, ' ')}
                      </Text>
                    )}
                  {orderItem.listing_type === 'rent' && item.rental_due_at && item.status === 'rental_active' && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.sellerName}>
                        {activeTab === 'sales' ? 'Buyer time remaining' : 'Time remaining'}: {formatRentalTimeRemaining(item.rental_due_at)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Rental Extension History */}
              {item.rental_extensions && item.rental_extensions.length > 0 && (
                <View style={styles.extensionHistoryBox}>
                  <Text style={styles.extensionHistoryTitle}>
                    {activeTab === 'purchases' ? 'Rental Extension History' : 'Buyer Rental Extensions'}
                  </Text>
                  {item.rental_extensions.map((ext, idx) => (
                    <Text key={idx} style={styles.extensionHistoryItem}>
                      • +{ext.extension_duration} {ext.extension_period}(s) (₹{ext.cost}) — New Due: {new Date(ext.new_due_at).toLocaleDateString()}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#111827' }}>Actions</Text>
              
              <View style={{ gap: 12 }}>
                {activeTab === 'purchases' && ['rental_active', 'return_requested'].includes(item.status) && orderItem.listing_type === 'rent' && (
                  <TouchableOpacity
                    style={[styles.extendRentalBtn, { paddingVertical: 12 }]}
                    onPress={() => {
                      setExtensionModalOrder(item);
                      setExtensionDuration(1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="timer-outline" size={18} color="#FFFFFF" />
                    <Text style={[styles.extendRentalBtnText, { fontSize: 15 }]}>⏱️ Extend Rental Period</Text>
                  </TouchableOpacity>
                )}
                {activeTab === 'sales' && item.status === 'pending' && (
                  <TouchableOpacity style={styles.completeButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'delivered', 'Mark item as delivered?', 'Confirm that you delivered this item to the buyer.'); }}>
                    <Ionicons name="cube-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.completeButtonText}>Mark delivered</Text>
                  </TouchableOpacity>
                )}
                {activeTab === 'sales' && item.status === 'cancel_requested' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.completeButton, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'pending', 'Reject Cancellation?', 'The order will remain pending and you should deliver the item.'); }}>
                      <Ionicons name="close-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                      <Text style={[styles.completeButtonText, { color: '#DC2626' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.completeButton, { flex: 1, backgroundColor: '#DC2626' }]} onPress={() => {
                      const isOnline = ['UPI', 'Razorpay'].includes(item.payment_method);
                      const msg = isOnline
                        ? 'The order will be cancelled and a refund will be initiated to the buyer.'
                        : 'The order will be permanently cancelled.';
                      setSelectedOrderDetails(null);
                      updateOrderStatus(item, 'cancelled', 'Approve Cancellation?', msg);
                    }}>
                      <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.completeButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
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
                {activeTab === 'purchases' && item.status === 'return_requested' && orderItem.listing_type !== 'rent' && (
                  <View style={{ backgroundColor: '#FFF8E1', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FEF3C7' }}>
                    <Text style={{ color: '#B45309', fontSize: 13, textAlign: 'center' }}>
                      Waiting for the seller to approve your return request.
                    </Text>
                  </View>
                )}
                {activeTab === 'sales' && item.status === 'return_requested' && orderItem.listing_type !== 'rent' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.completeButton, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'completed', 'Reject Return?', 'The return request will be rejected and the order will remain completed.'); }}>
                      <Ionicons name="close-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                      <Text style={[styles.completeButtonText, { color: '#DC2626' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.completeButton, { flex: 1, backgroundColor: '#DC2626' }]} onPress={() => {
                      const isOnline = ['UPI', 'Razorpay'].includes(item.payment_method);
                      const msg = isOnline
                        ? 'Confirm that you accept the return and have received the item? This will automatically initiate the refund to the buyer.'
                        : 'Confirm that you accept the return and have received the item.';
                      setSelectedOrderDetails(null);
                      updateOrderStatus(item, 'returned', 'Approve Return?', msg);
                    }}>
                      <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.completeButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeTab === 'sales' && item.status === 'return_requested' && orderItem.listing_type === 'rent' && (
                  <TouchableOpacity style={styles.completeButton} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'completed', 'Confirm item returned?', 'Confirm that you received the returned item from the buyer.'); }}>
                    <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.completeButtonText}>Confirm return</Text>
                  </TouchableOpacity>
                )}

                {canCancel ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 6 }]}
                      onPress={() => {
                        const isOnline = ['UPI', 'Razorpay'].includes(item.payment_method);
                        const title = 'Cancel Order?';
                        const message = isOnline
                          ? 'Are you sure you want to cancel this order? It will be cancelled immediately and a full refund will be initiated to your original payment method.'
                          : 'Are you sure you want to cancel this order? It will be cancelled immediately.';
                        setSelectedOrderDetails(null);
                        updateOrderStatus(item, 'cancelled', title, message);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={17} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={[styles.messageButtonText, { color: '#DC2626', fontSize: 13 }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 6 }]}
                      onPress={() => {
                        if (otherUser?.phone) { Linking.openURL(`tel:${otherUser.phone}`); } else { Alert.alert('Phone Number Unavailable', 'This user has not provided a phone number.'); }
                      }}
                    >
                      <Ionicons name="call-outline" size={17} color="#0F1111" style={{ marginRight: 4 }} />
                      <Text style={[styles.messageButtonText, { color: '#0F1111', fontSize: 13 }]}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, borderWidth: 1, borderColor: '#BCE3EB', paddingHorizontal: 6 }]}
                      onPress={() => { setSelectedOrderDetails(null); handleMessageUser(otherUser, orderItem); }}
                    >
                      <Ionicons name="chatbubble-outline" size={17} color="#007185" style={{ marginRight: 4 }} />
                      <Text style={[styles.messageButtonText, { fontSize: 13 }]}>Message</Text>
                    </TouchableOpacity>
                  </View>
                ) : canReturn ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 6 }]}
                      onPress={() => {
                        const isOnline = ['UPI', 'Razorpay'].includes(item.payment_method);
                        const message = isOnline
                          ? 'Are you sure you want to return this item? Once the seller confirms receiving the returned item, a full refund will be automatically sent back to your payment account.'
                          : 'Are you sure you want to return this item? This will notify the seller to arrange the return.';
                        setSelectedOrderDetails(null);
                        updateOrderStatus(item, 'return_requested', 'Return Item?', message);
                      }}
                    >
                      <Ionicons name="return-down-back-outline" size={17} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={[styles.messageButtonText, { color: '#D97706', fontSize: 13 }]}>Return</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 6 }]}
                      onPress={() => {
                        if (otherUser?.phone) { Linking.openURL(`tel:${otherUser.phone}`); } else { Alert.alert('Phone Number Unavailable', 'This user has not provided a phone number.'); }
                      }}
                    >
                      <Ionicons name="call-outline" size={17} color="#0F1111" style={{ marginRight: 4 }} />
                      <Text style={[styles.messageButtonText, { color: '#0F1111', fontSize: 13 }]}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, borderWidth: 1, borderColor: '#BCE3EB', paddingHorizontal: 6 }]}
                      onPress={() => { setSelectedOrderDetails(null); handleMessageUser(otherUser, orderItem); }}
                    >
                      <Ionicons name="chatbubble-outline" size={17} color="#007185" style={{ marginRight: 4 }} />
                      <Text style={[styles.messageButtonText, { fontSize: 13 }]}>Message</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]}
                      onPress={() => {
                        if (otherUser?.phone) { Linking.openURL(`tel:${otherUser.phone}`); } else { Alert.alert('Phone Number Unavailable', 'This user has not provided a phone number.'); }
                      }}
                    >
                      <Ionicons name="call-outline" size={18} color="#0F1111" style={{ marginRight: 8 }} />
                      <Text style={[styles.messageButtonText, { color: '#0F1111' }]}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, borderWidth: 1, borderColor: '#BCE3EB' }]}
                      onPress={() => { setSelectedOrderDetails(null); handleMessageUser(otherUser, orderItem); }}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="#007185" style={{ marginRight: 8 }} />
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
        case 'return_requested': case 'pending': case 'cancel_requested': return { bg: '#FFF8E1', text: '#F59E0B' };
        case 'cancelled': case 'returned': return { bg: '#FEE2E2', text: '#DC2626' };
        default: return { bg: '#F3F4F6', text: '#565959' };
      }
    };
    const statusColors = getStatusColor(item.status);

    const getStatusText = (status) => {
      if (status === 'cancel_requested') return 'Cancel requested';
      if (status === 'return_requested') return 'Return requested';
      if (status === 'rental_active') return 'Rental active';
      return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => setSelectedOrderDetails(item)} activeOpacity={0.7}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderDate}>{dateString}</Text>
          <View style={styles.orderHeaderActions}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {getStatusText(item.status)}
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
            {item.status === 'completed' && item.buyer_rating != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>
                  Rated {item.buyer_rating} / 5
                </Text>
              </View>
            )}
            {item.payment_status === 'refunded' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="refresh-circle-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                  Refunded
                </Text>
              </View>
            )}
            {/* Buyer Extend Rental Quick Button */}
            {activeTab === 'purchases' && ['rental_active', 'return_requested'].includes(item.status) && orderItem.listing_type === 'rent' && (
              <TouchableOpacity
                style={styles.extendRentalBtn}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setExtensionModalOrder(item);
                  setExtensionDuration(1);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="timer-outline" size={13} color="#FFFFFF" />
                <Text style={styles.extendRentalBtnText}>Extend Rental</Text>
              </TouchableOpacity>
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

  const renderPagination = () => {
    if (filteredOrders.length <= PAGE_SIZE) return null;

    const pageButtons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(p);
    }

    const startEntry = (currentPage - 1) * PAGE_SIZE + 1;
    const endEntry = Math.min(currentPage * PAGE_SIZE, filteredOrders.length);

    return (
      <View style={styles.pagination}>
        <Text style={styles.pageInfo}>
          {startEntry}–{endEntry} of {filteredOrders.length} orders
        </Text>

        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#CBD5E1' : '#007185'} />
          </TouchableOpacity>

          {startPage > 1 && (
            <>
              <TouchableOpacity style={styles.pageNumBtn} onPress={() => setCurrentPage(1)} activeOpacity={0.7}>
                <Text style={styles.pageNumText}>1</Text>
              </TouchableOpacity>
              {startPage > 2 && <Text style={styles.pageDots}>…</Text>}
            </>
          )}

          {pageButtons.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.pageNumBtn, p === currentPage && styles.pageNumBtnActive]}
              onPress={() => setCurrentPage(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageNumText, p === currentPage && styles.pageNumTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <Text style={styles.pageDots}>…</Text>}
              <TouchableOpacity style={styles.pageNumBtn} onPress={() => setCurrentPage(totalPages)} activeOpacity={0.7}>
                <Text style={styles.pageNumText}>{totalPages}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#CBD5E1' : '#007185'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderOrderDetailsModal()}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Or<Text style={{ color: '#007185' }}>ders</Text></Text>
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
      
      {/* Full-Screen List Modal */}
      <Modal visible={activeFilter !== 'All'} animationType="slide" onRequestClose={() => setActiveFilter('All')}>
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          <View style={{
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: '#FFF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TouchableOpacity 
              style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 10, padding: 8 }} 
              onPress={() => setActiveFilter('All')} 
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#0F1111" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F1111', letterSpacing: -0.5 }}>
              {activeFilter} <Text style={{ color: '#007185' }}>{activeTab === 'purchases' ? 'Purchases' : 'Sales'}</Text>
            </Text>
          </View>
          
          <FlatList
            data={pagedOrders}
            keyExtractor={(item, index) => item._id || item.id || String(index)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />}
            renderItem={renderOrderItem}
            ListFooterComponent={renderPagination}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { marginTop: 40 }]}>
                <View style={styles.iconBg}>
                  <Ionicons name="bag-handle-outline" size={52} color="#0052CC" />
                </View>
                <Text style={styles.emptyTitle}>No {activeFilter} Orders</Text>
                <Text style={styles.emptySubtitle}>You don't have any {activeFilter.toLowerCase()} {activeTab === 'purchases' ? 'purchases' : 'sales'}.</Text>
              </View>
            }
          />
        </View>
      </Modal>
      {/* Buyer Rental Extension Modal */}
      {extensionModalOrder && (() => {
        const item = extensionModalOrder.item_id || {};
        const period = ['hour', 'day', 'month'].includes(item.rental_period) ? item.rental_period : 'day';
        const unitLabel = period === 'hour' ? 'Hour' : period === 'month' ? 'Month' : 'Day';
        const unitLabelPlural = period === 'hour' ? 'Hours' : period === 'month' ? 'Months' : 'Days';
        const unitPrice = Number(item.price) || 0;
        const totalCost = unitPrice * extensionDuration;
        const newDue = calculateNewDueDate(extensionModalOrder.rental_due_at, extensionDuration, period);

        const maxDuration = period === 'hour' ? 72 : period === 'month' ? 12 : 30;

        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setExtensionModalOrder(null)}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.confirmationModal, { maxWidth: 420 }]}>
                <View style={[styles.confirmationIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="timer-outline" size={28} color="#4F46E5" />
                </View>
                <Text style={styles.confirmationTitle}>Extend Rental</Text>
                <Text style={styles.confirmationMessage}>
                  Extend rental duration for <Text style={{ fontWeight: '700', color: '#0F172A' }}>{item.name || 'this item'}</Text>.
                </Text>

                {/* Duration Stepper based on Item's Rental Period */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setExtensionDuration(d => Math.max(1, d - 1))}
                    disabled={extensionDuration <= 1 || isExtending}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={22} color={extensionDuration <= 1 ? '#CBD5E1' : '#0F172A'} />
                  </TouchableOpacity>

                  <Text style={styles.stepperValueText}>
                    +{extensionDuration} <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '600' }}>{extensionDuration === 1 ? unitLabel : unitLabelPlural}</Text>
                  </Text>

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setExtensionDuration(d => Math.min(maxDuration, d + 1))}
                    disabled={extensionDuration >= maxDuration || isExtending}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={22} color={extensionDuration >= maxDuration ? '#CBD5E1' : '#0F172A'} />
                  </TouchableOpacity>
                </View>

                {/* Cost & Projected Due Date Breakdown */}
                <View style={styles.extensionCostSummary}>
                  <View style={styles.extensionCostRow}>
                    <Text style={styles.extensionCostLabel}>Item Rate</Text>
                    <Text style={styles.extensionCostValue}>₹{unitPrice} / {unitLabel.toLowerCase()}</Text>
                  </View>
                  <View style={styles.extensionCostRow}>
                    <Text style={styles.extensionCostLabel}>New Return Due</Text>
                    <Text style={[styles.extensionCostValue, { color: '#059669', fontSize: 13 }]}>{newDue}</Text>
                  </View>
                  <View style={[styles.extensionCostRow, styles.extensionTotalRow]}>
                    <Text style={styles.extensionTotalLabel}>Total to Pay</Text>
                    <Text style={styles.extensionTotalValue}>₹{totalCost}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                    Secured by Razorpay Escrow
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.confirmationActions}>
                  <TouchableOpacity
                    style={[styles.noButton, isExtending && { opacity: 0.5 }]}
                    onPress={() => setExtensionModalOrder(null)}
                    disabled={isExtending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.noButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.yesButton,
                      { backgroundColor: '#007185' },
                      isExtending && styles.disabledButton,
                    ]}
                    onPress={handleExtendRental}
                    disabled={isExtending}
                    activeOpacity={0.8}
                  >
                    {isExtending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.yesButtonText}>Pay</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      {confirmation && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmation(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmationModal}>
              <View style={styles.confirmationIcon}>
                <Ionicons name="cube-outline" size={28} color="#0052CC" />
              </View>
              <Text style={styles.confirmationTitle}>{confirmation.title}</Text>
              <Text style={styles.confirmationMessage}>{confirmation.message}</Text>
              <View style={styles.confirmationActions}>
                <TouchableOpacity
                  style={[styles.noButton, isUpdating && { opacity: 0.5 }]}
                  onPress={() => setConfirmation(null)}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                >
                  <Text style={styles.noButtonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.yesButton, isUpdating && { opacity: 0.7 }]}
                  onPress={confirmOrderStatus}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.yesButtonText}>Yes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {ratingPrompt && (
        <Modal
          visible
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
              <Text style={styles.confirmationMessage}>How would you rate your purchase of {ratingPrompt.item_id?.name || 'this item'}?</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFullFilled = selectedRating >= star;
                  const isHalfFilled = !isFullFilled && selectedRating >= star - 0.5;
                  const iconName = isFullFilled ? 'star' : isHalfFilled ? 'star-half' : 'star-outline';
                  return (
                    // Single container — icon renders normally, two invisible zones overlay it
                    <View key={star} style={{ width: 38, height: 38, marginHorizontal: 3, justifyContent: 'center', alignItems: 'center' }}>
                      {/* Fully rendered, un-clipped star icon */}
                      <Ionicons name={iconName} size={34} color="#F59E0B" />
                      {/* Invisible left-half zone → half star (e.g. star=3 → 2.5) */}
                      <TouchableOpacity
                        onPress={() => setSelectedRating(star - 0.5)}
                        activeOpacity={0}
                        style={{ position: 'absolute', left: 0, top: 0, width: 19, height: 38 }}
                      />
                      {/* Invisible right-half zone → full star */}
                      <TouchableOpacity
                        onPress={() => setSelectedRating(star)}
                        activeOpacity={0}
                        style={{ position: 'absolute', right: 0, top: 0, width: 19, height: 38 }}
                      />
                    </View>
                  );
                })}
              </View>
              {/* Score label — only shown after user has tapped */}
              <Text style={{ color: selectedRating > 0 ? '#F59E0B' : '#9CA3AF', fontWeight: '700', fontSize: 15, marginTop: 2, marginBottom: 18 }}>
                {selectedRating > 0
                  ? `${selectedRating % 1 === 0 ? `${selectedRating}.0` : selectedRating} / 5`
                  : 'Tap to rate'}
              </Text>

              <View style={styles.confirmationActions}>
                <TouchableOpacity style={styles.noButton} onPress={() => setRatingPrompt(null)} activeOpacity={0.8}>
                  <Text style={styles.noButtonText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.yesButton, (!selectedRating || isRatingSubmitting) && styles.disabledButton]}
                  onPress={submitRating}
                  disabled={!selectedRating || isRatingSubmitting}
                  activeOpacity={0.8}
                >
                  {isRatingSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.yesButtonText}>Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />}>
        {renderDashboardCards()}
      </ScrollView>
    </SafeAreaView>
  );
}
