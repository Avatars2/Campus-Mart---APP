import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Platform, Alert, Modal, Linking, ScrollView, TextInput, Dimensions } from 'react-native';
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
import { AuthContext } from '../../context/AuthContext';
import { getPusherClient } from '../../utils/pusher';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const FILTER_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'Active', label: 'Active', dotColor: '#1D4ED8' },
  { id: 'Completed', label: 'Completed', dotColor: '#10B981' },
  { id: 'Returned', label: 'Returned', dotColor: '#8B5CF6' },
  { id: 'Cancelled', label: 'Cancelled', dotColor: '#DC2626' },
];

export default function BuyScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id || user?._id;
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

  // Real-time WebSocket synchronization via Pusher
  useEffect(() => {
    if (!currentUserId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `user-${currentUserId}`;
    const channel = pusher.subscribe(channelName);

    const handleOrderUpdated = (data) => {
      const { order: updatedOrder, status: newStatus, title, message, updatedBy } = data || {};
      if (!updatedOrder) {
        fetchOrders();
        return;
      }

      const updatedOrderId = (updatedOrder._id || updatedOrder.id)?.toString();

      // 1. Update order in state immediately without requiring manual refresh
      setOrders((prevOrders) => {
        const index = prevOrders.findIndex((o) => (o._id || o.id)?.toString() === updatedOrderId);
        if (index !== -1) {
          const next = [...prevOrders];
          next[index] = { ...next[index], ...updatedOrder, status: newStatus || updatedOrder.status };
          return next;
        }
        return prevOrders;
      });

      // 2. Refresh orders in background to ensure tab counters and pagination stay accurate
      fetchOrders();

      // 3. If order details modal is open for this order, update it live
      setSelectedOrderDetails((prevModal) => {
        if (!prevModal) return null;
        const currentModalId = (prevModal._id || prevModal.id)?.toString();
        if (currentModalId === updatedOrderId) {
          return { ...prevModal, ...updatedOrder, status: newStatus || updatedOrder.status };
        }
        return prevModal;
      });
    };

    const handleOrderCreated = () => {
      fetchOrders();
    };

    const handleNewNotification = (data) => {
      if (data?.type === 'ORDER') {
        fetchOrders();
      }
    };

    channel.bind('order:updated', handleOrderUpdated);
    channel.bind('order:created', handleOrderCreated);
    channel.bind('new:notification', handleNewNotification);

    return () => {
      channel.unbind('order:updated', handleOrderUpdated);
      channel.unbind('order:created', handleOrderCreated);
      channel.unbind('new:notification', handleNewNotification);
    };
  }, [currentUserId, activeTab]);

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
      // Prompt for rating only when the BUYER confirms receipt of a delivered purchase
      if (
        activeTab === 'purchases' &&
        order.status === 'delivered' &&
        nextStatus === 'completed' &&
        order.item_id?.listing_type !== 'rent'
      ) {
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

  const escapeHtml = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const generateInvoiceHtml = (order) => {
    const item = order.item_id && typeof order.item_id === 'object' ? order.item_id : {};
    const buyer = order.buyer_id && typeof order.buyer_id === 'object' ? order.buyer_id : {};
    const seller = order.seller_id && typeof order.seller_id === 'object' ? order.seller_id : {};

    const statusMap = {
      completed: { label: 'Order Completed & Confirmed', bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', icon: '✓' },
      delivered: { label: 'Item Delivered (Awaiting Buyer Confirmation)', bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', icon: '📦' },
      rental_active: { label: 'Active Campus Rental Period', bg: '#F0FDFA', border: '#99F6E4', color: '#0F766E', icon: '⏱️' },
      return_requested: { label: 'Return Requested by Buyer', bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', icon: '↩️' },
      cancelled: { label: 'Order Cancelled', bg: '#F8FAFC', border: '#E2E8F0', color: '#64748B', icon: '✕' },
    };
    const currentStatus = statusMap[order.status] || { label: 'Pending Handover & Inspection', bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '⏳' };

    const orderRawId = String(order._id || order.id || 'CAMPUSMART');
    const orderNumber = orderRawId.slice(-10).toUpperCase();
    const invoiceNumber = `CM-INV-${orderRawId.slice(-8).toUpperCase()}`;

    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const isRental = item.listing_type === 'rent' || Boolean(order.rental_duration);
    const listingTypeLabel = isRental
      ? `⏱️ Campus Rental (${order.rental_duration || item.rental_period || 'Rental'})`
      : '🛒 Campus Purchase (Buy)';

    const conditionText = item.condition_rating
      ? `Condition: ${item.condition_rating}/10`
      : 'Condition: Good / Verified';

    const quantity = Number(order.quantity || 1);
    const totalAmount = Number(order.total_price || 0).toFixed(2);
    const unitPrice = (Number(order.total_price || 0) / (quantity || 1)).toFixed(2);

    const isOnlinePayment = ['UPI', 'Razorpay'].includes(order.payment_method);
    const paymentMethodText = isOnlinePayment
      ? 'Paid Online via Razorpay / UPI'
      : 'Pay Cash on Handover / Delivery';

    const paymentStatusText = order.payment_status === 'paid'
      ? 'Paid & Protected in Escrow'
      : order.payment_status === 'refunded'
        ? 'Refunded to Source'
        : 'Payment Due on Handover';

    const buyerDept = [buyer.department, buyer.year_semester].filter(Boolean).join(' • ') || 'Campus Student';
    const sellerDept = [seller.department, seller.year_semester].filter(Boolean).join(' • ') || 'Campus Student';

    const deliveryAddress = order.delivery_address || 'In-Campus Meetup (Discuss with seller via Messages)';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CampusMart Invoice - #${escapeHtml(orderNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      margin: 0;
      padding: 36px 16px;
      background-color: #F8FAFC;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13.5px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      padding: 36px 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #F1F5F9;
      padding-bottom: 24px;
    }
    .brand-title {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: -0.6px;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .brand-title span { color: #007185; }
    .brand-subtitle {
      font-size: 12.5px;
      color: #64748B;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-tag {
      font-size: 18px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .meta-sub {
      font-size: 12px;
      color: #64748B;
      line-height: 1.6;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 18px;
      margin: 24px 0 20px;
    }
    .meta-box label {
      display: block;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 4px;
    }
    .meta-box strong {
      font-size: 13.5px;
      font-weight: 700;
      color: #0F172A;
    }
    .status-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 24px;
      border: 1px solid ${currentStatus.border};
      background: ${currentStatus.bg};
    }
    .status-pill {
      font-size: 13px;
      font-weight: 700;
      color: ${currentStatus.color};
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .listing-badge {
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #334155;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }
    .party-card {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 18px;
      background: #FFFFFF;
    }
    .party-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .party-role-tag {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #007185;
    }
    .party-id-badge {
      font-size: 10.5px;
      font-weight: 700;
      background: #F1F5F9;
      color: #475569;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid #E2E8F0;
    }
    .party-name {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .party-detail {
      font-size: 12.5px;
      color: #475569;
      line-height: 1.6;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .table-container {
      margin-bottom: 24px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #F8FAFC;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      border-bottom: 1px solid #E2E8F0;
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
      font-size: 13.5px;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .item-name {
      font-size: 14.5px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .item-subtext {
      font-size: 11.5px;
      color: #64748B;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .spec-pill {
      background: #F1F5F9;
      color: #334155;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10.5px;
    }
    .spec-pill.condition {
      background: #EFF6FF;
      color: #1D4ED8;
    }
    .spec-pill.rental {
      background: #F0FDFA;
      color: #0F766E;
    }
    .amount {
      font-weight: 800;
      color: #0F172A;
      text-align: right;
      white-space: nowrap;
    }
    .info-summary-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
      align-items: start;
    }
    .handover-escrow-card {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 18px;
      background: #F8FAFC;
    }
    .card-subtitle {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 4px;
    }
    .card-body-text {
      font-size: 12.5px;
      color: #1E293B;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .escrow-alert {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11.5px;
      color: #065F46;
      line-height: 1.45;
      font-weight: 500;
    }
    .financial-card {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 18px;
      background: #FFFFFF;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-size: 12.5px;
      color: #475569;
    }
    .free-pill {
      background: #DCFCE7;
      color: #15803D;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      letter-spacing: 0.3px;
    }
    .grand-total-row {
      border-top: 2px solid #E2E8F0;
      margin-top: 10px;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .grand-total-label {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
    }
    .grand-total-amount {
      font-size: 22px;
      font-weight: 900;
      color: #007185;
    }
    .footer {
      border-top: 1px dashed #CBD5E1;
      padding-top: 20px;
      text-align: center;
      font-size: 11.5px;
      color: #64748B;
      line-height: 1.6;
    }
    .footer-support {
      margin-top: 4px;
      font-weight: 600;
      color: #334155;
    }
    .invoice-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 28px;
    }
    .btn-action {
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      padding: 12px 24px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s ease;
    }
    .btn-primary {
      background: #007185;
      color: #FFFFFF;
      box-shadow: 0 4px 6px -1px rgba(0, 113, 133, 0.2);
    }
    .btn-primary:hover {
      background: #005A6A;
    }
    .btn-secondary {
      background: #E2E8F0;
      color: #334155;
    }
    .btn-secondary:hover {
      background: #CBD5E1;
    }
    @media print {
      body {
        background: #FFFFFF !important;
        padding: 0 !important;
      }
      .invoice-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .invoice-actions, .no-print {
        display: none !important;
      }
      @page {
        margin: 12mm;
        size: auto;
      }
    }
    @media (max-width: 640px) {
      .parties { grid-template-columns: 1fr; }
      .meta-grid { grid-template-columns: 1fr 1fr; }
      .info-summary-grid { grid-template-columns: 1fr; }
      .invoice-card { padding: 20px 16px; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <p class="brand-title">Campus<span>Mart</span></p>
        <div class="brand-subtitle">Student Peer-to-Peer Marketplace Receipt</div>
        <div class="badge-verified">&#10003; Verified Campus Order</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-tag">Order Invoice</div>
        <div class="meta-sub">
          <strong>${escapeHtml(invoiceNumber)}</strong><br>
          Issued ${escapeHtml(invoiceDate)}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <label>Order ID</label>
        <strong>#${escapeHtml(orderNumber)}</strong>
      </div>
      <div class="meta-box">
        <label>Order Date</label>
        <strong>${escapeHtml(orderDate)}</strong>
      </div>
      <div class="meta-box">
        <label>Payment Method</label>
        <strong>${isOnlinePayment ? 'Razorpay Online' : 'Cash on Meetup'}</strong>
      </div>
      <div class="meta-box">
        <label>Payment Status</label>
        <strong>${order.payment_status === 'paid' ? 'Paid (Escrow)' : 'Due at Handover'}</strong>
      </div>
    </div>

    <div class="status-banner">
      <div class="status-pill">${currentStatus.icon} ${escapeHtml(currentStatus.label)}</div>
      <div class="listing-badge">${escapeHtml(listingTypeLabel)}</div>
    </div>

    <div class="parties">
      <div class="party-card">
        <div class="party-card-header">
          <span class="party-role-tag">Buyer Details</span>
          <span class="party-id-badge">${escapeHtml(buyer.student_id ? 'ID: ' + buyer.student_id : 'Student')}</span>
        </div>
        <div class="party-name">${escapeHtml(buyer.full_name || 'Buyer')}</div>
        <div class="party-detail">🎓 ${escapeHtml(buyerDept)}</div>
        <div class="party-detail">📞 Mobile: ${escapeHtml(buyer.phone || 'In messages')}</div>
        ${buyer.email ? `<div class="party-detail">✉️ Email: ${escapeHtml(buyer.email)}</div>` : ''}
      </div>

      <div class="party-card">
        <div class="party-card-header">
          <span class="party-role-tag">Seller Details</span>
          <span class="party-id-badge">${escapeHtml(seller.student_id ? 'ID: ' + seller.student_id : 'Seller')}</span>
        </div>
        <div class="party-name">${escapeHtml(seller.full_name || 'Seller')}</div>
        <div class="party-detail">🏷️ ${escapeHtml(sellerDept)}</div>
        <div class="party-detail">📞 Mobile: ${escapeHtml(seller.phone || 'In messages')}</div>
        ${seller.email ? `<div class="party-detail">✉️ Email: ${escapeHtml(seller.email)}</div>` : ''}
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">#</th>
            <th>Item Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; color: #64748B;">1</td>
            <td>
              <div class="item-name">${escapeHtml(item.name || 'Campus Marketplace Item')}</div>
              <div class="item-subtext">
                <span class="spec-pill condition">${escapeHtml(conditionText)}</span>
                <span class="spec-pill ${isRental ? 'rental' : ''}">${escapeHtml(isRental ? 'Campus Rental' : 'Direct Buy')}</span>
              </div>
            </td>
            <td style="text-align: center; font-weight: 600;">${quantity}</td>
            <td style="text-align: right; color: #475569;">₹${escapeHtml(unitPrice)}</td>
            <td class="amount">₹${escapeHtml(totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="info-summary-grid">
      <div class="handover-escrow-card">
        <div class="card-subtitle">Campus Delivery / Handover</div>
        <div class="card-body-text">
          <strong>Meetup Location:</strong> ${escapeHtml(deliveryAddress)}
        </div>

        <div class="card-subtitle" style="margin-top: 10px;">Payment Security</div>
        <div class="card-body-text" style="margin-bottom: 8px;">
          <strong>Mode:</strong> ${escapeHtml(paymentMethodText)}<br>
          <strong>Status:</strong> ${escapeHtml(paymentStatusText)}
        </div>

        <div class="escrow-alert">
          <span>🛡️</span>
          <div>
            <strong>CampusMart SafePay Escrow Guarantee:</strong> Payment is safely held until the buyer receives and verifies the item in person.
          </div>
        </div>
      </div>

      <div class="financial-card">
        <div class="card-subtitle" style="margin-bottom: 8px;">Price Summary</div>
        <div class="calc-row">
          <span>Item Subtotal:</span>
          <span>₹${escapeHtml(totalAmount)}</span>
        </div>
        <div class="calc-row">
          <span>Campus Platform Fee:</span>
          <span>₹0.00 <span class="free-pill">FREE</span></span>
        </div>
        <div class="calc-row">
          <span>Campus Handover:</span>
          <span>₹0.00 <span class="free-pill">FREE</span></span>
        </div>
        <div class="calc-row">
          <span>Tax / GST:</span>
          <span>₹0.00</span>
        </div>
        <div class="grand-total-row">
          <span class="grand-total-label">Total Amount:</span>
          <span class="grand-total-amount">₹${escapeHtml(totalAmount)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>Issued by CampusMart Student Peer-to-Peer Marketplace &bull; Computer-Generated Tax & Order Invoice &bull; No signature required</div>
      <div class="footer-support">Need help or dispute resolution? Contact support@campusmart.in or file a report from your order dashboard.</div>
    </div>

    <div class="invoice-actions no-print">
      <button class="btn-action btn-primary" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print / Save PDF
      </button>
      <button class="btn-action btn-secondary" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
</body>
</html>`;
  };

  const handleInvoice = async (order) => {
    const orderId = order._id || order.id;
    setInvoiceLoading(orderId);
    try {
      const html = generateInvoiceHtml(order);
      if (Platform.OS === 'web') {
        const invoiceWindow = window.open('', '_blank');
        if (!invoiceWindow) {
          throw new Error('Invoice window could not be opened. Please enable popups for this site.');
        }

        invoiceWindow.document.open();
        invoiceWindow.document.write(html);
        invoiceWindow.document.close();
        invoiceWindow.document.title = `CampusMart_Invoice_${String(orderId).slice(-8).toUpperCase()}`;
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
  const [pageSize, setPageSize] = useState(5); // 5, 10, 20, 50, 100
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  const activeCount = orders.filter(o => !['completed', 'cancelled', 'returned'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const returnedCount = orders.filter(o => o.status === 'returned').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  const getFilterCount = (id) => {
    switch (id) {
      case 'Active':
        return activeCount;
      case 'Completed':
        return completedCount;
      case 'Returned':
        return returnedCount;
      case 'Cancelled':
        return cancelledCount;
      default:
        return orders.length;
    }
  };

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

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Reset filter when switching between Purchases and Sales
  useEffect(() => {
    setActiveFilter('All');
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, pageSize]);

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
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <View style={{ width: 44, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
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
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => {
                      setSelectedOrderDetails(null);
                      const orderItemName = item.item_id?.name || 'this item';
                      const buyerName = item.buyer_id?.full_name || 'the buyer';
                      updateOrderStatus(
                        item,
                        'delivered',
                        'Mark item as delivered?',
                        `Confirm that you delivered ${orderItemName} to ${buyerName}.`
                      );
                    }}
                  >
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
                  <TouchableOpacity
                    style={styles.confirmReceivedButton}
                    onPress={() => {
                      setSelectedOrderDetails(null);
                      const name = orderItem.name || 'this item';
                      updateOrderStatus(
                        item,
                        'completed',
                        'Confirm item received?',
                        `Tap Yes to confirm that you have received ${name}.`
                      );
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmReceivedText}>Confirm Receipt</Text>
                  </TouchableOpacity>
                )}
                {activeTab === 'purchases' && item.status === 'delivered' && orderItem.listing_type === 'rent' && (
                  <TouchableOpacity
                    style={styles.confirmReceivedButton}
                    onPress={() => {
                      setSelectedOrderDetails(null);
                      const name = orderItem.name || 'this item';
                      updateOrderStatus(
                        item,
                        'rental_active',
                        'Start rental period?',
                        `Confirm that you received ${name}. The rental period starts now.`
                      );
                    }}
                  >
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
                    <TouchableOpacity style={[styles.completeButton, { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]} onPress={() => { setSelectedOrderDetails(null); updateOrderStatus(item, 'completed', 'Reject Return?', 'The return request will be rejected.'); }}>
                      <Ionicons name="close-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                      <Text style={[styles.completeButtonText, { color: '#DC2626' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.completeButton, { flex: 1, backgroundColor: '#DC2626' }]}
                      onPress={() => {
                        setSelectedOrderDetails(null);
                        const name = orderItem.name || 'this item';
                        updateOrderStatus(
                          item,
                          'returned',
                          'Approve Return?',
                          `Confirm that you accept the return and have received ${name}.`
                        );
                      }}
                    >
                      <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.completeButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeTab === 'sales' && item.status === 'return_requested' && orderItem.listing_type === 'rent' && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => {
                      setSelectedOrderDetails(null);
                      const name = orderItem.name || 'this item';
                      updateOrderStatus(
                        item,
                        'completed',
                        'Confirm item returned?',
                        `Confirm that you received the returned ${name} from the buyer.`
                      );
                    }}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.completeButtonText}>Confirm return</Text>
                  </TouchableOpacity>
                )}

                {canCancel ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.messageButton, { flex: 1, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 6 }]}
                      onPress={() => {
                        setSelectedOrderDetails(null);
                        updateOrderStatus(
                          item,
                          'cancelled',
                          'Cancel Order?',
                          'Are you sure you want to cancel this order?'
                        );
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
                        setSelectedOrderDetails(null);
                        const name = orderItem.name || 'this item';
                        updateOrderStatus(
                          item,
                          'return_requested',
                          'Return Item?',
                          `Are you sure you want to return ${name}?`
                        );
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

  // Pagination controls with Results info & Page Size dropdown on the same row
  const renderPagination = () => {
    if (filteredOrders.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredOrders.length);

    // Build pages array with ellipsis support
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
              color="#007185"
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
              color={currentPage === 1 ? '#94A3B8' : '#007185'}
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
                style={[
                  styles.pageNumBtn,
                  currentPage === p && styles.pageNumBtnActive,
                ]}
                onPress={() => setCurrentPage(p)}
              >
                <Text
                  style={[
                    styles.pageNumText,
                    currentPage === p && styles.pageNumTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[
              styles.pageBtn,
              currentPage === totalPages && styles.pageBtnDisabled,
            ]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={currentPage === totalPages ? '#94A3B8' : '#007185'}
            />
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
      
      {/* Filter Horizontal Scroll (Same as MyReports) */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter.id;
            const count = getFilterCount(filter.id);
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  setActiveFilter(filter.id);
                  setCurrentPage(1);
                }}
                activeOpacity={0.8}
              >
                {filter.dotColor && (
                  <View
                    style={[styles.filterDot, { backgroundColor: filter.dotColor }]}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List directly on screen */}
      <FlatList
        data={pagedOrders}
        keyExtractor={(item, index) => item._id || item.id || String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007185']}
          />
        }
        renderItem={renderOrderItem}
        ListFooterComponent={renderPagination}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { marginTop: 40 }]}>
            <View style={styles.iconBg}>
              <Ionicons name="bag-handle-outline" size={52} color="#007185" />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeFilter === 'All' ? '' : activeFilter} Orders
            </Text>
            <Text style={styles.emptySubtitle}>
              You don't have any {activeFilter === 'All' ? '' : activeFilter.toLowerCase()} {activeTab === 'purchases' ? 'purchases' : 'sales'}.
            </Text>
          </View>
        }
      />

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

      {confirmation && (() => {
        const order = confirmation.order || {};
        const orderItem = (typeof order.item_id === 'object' && order.item_id !== null) ? order.item_id : {};
        const buyer = (typeof order.buyer_id === 'object' && order.buyer_id !== null) ? order.buyer_id : {};
        const seller = (typeof order.seller_id === 'object' && order.seller_id !== null) ? order.seller_id : {};

        const itemName = orderItem.name || 'this item';
        const buyerName = buyer.full_name || 'Buyer';
        const sellerName = seller.full_name || 'Seller';
        const itemImg = orderItem.images?.[0] || 'https://via.placeholder.com/100';
        const isRent = orderItem.listing_type === 'rent';
        const price = order.total_price != null ? order.total_price : orderItem.price;

        const isDeliveredAction = confirmation.nextStatus === 'delivered';
        const isConfirmReceiptAction = confirmation.nextStatus === 'completed' && (activeTab === 'purchases' || confirmation.title?.toLowerCase().includes('received'));
        const isRentalStartAction = confirmation.nextStatus === 'rental_active';
        const isCancelAction = confirmation.nextStatus === 'cancelled';
        const isReturnRequestAction = confirmation.nextStatus === 'return_requested';
        const isApproveReturnAction = confirmation.nextStatus === 'returned' || confirmation.title?.toLowerCase().includes('approve return');
        const isRejectReturnAction = confirmation.title?.toLowerCase().includes('reject return');

        let iconBg = '#E6F7F9';
        let iconName = 'cube-outline';
        let iconColor = '#007185';
        let actionBtnText = 'Yes';

        if (isDeliveredAction) {
          iconBg = '#E6F7F9';
          iconName = 'cube-outline';
          iconColor = '#007185';
          actionBtnText = 'Yes';
        } else if (isConfirmReceiptAction) {
          iconBg = '#DCFCE7';
          iconName = 'checkmark-circle-outline';
          iconColor = '#15803D';
          actionBtnText = 'Yes';
        } else if (isRentalStartAction) {
          iconBg = '#EEF2FF';
          iconName = 'timer-outline';
          iconColor = '#4F46E5';
          actionBtnText = 'Yes';
        } else if (isCancelAction) {
          iconBg = '#FEE2E2';
          iconName = 'close-circle-outline';
          iconColor = '#DC2626';
          actionBtnText = 'Yes';
        } else if (isReturnRequestAction || isApproveReturnAction) {
          iconBg = '#FEF3C7';
          iconName = 'return-down-back-outline';
          iconColor = '#D97706';
          actionBtnText = 'Yes';
        } else if (confirmation.title?.toLowerCase().includes('reject')) {
          iconBg = '#FEE2E2';
          iconName = 'close-outline';
          iconColor = '#DC2626';
          actionBtnText = 'Yes';
        }

        const isSellerView = activeTab === 'sales' || isDeliveredAction;
        const otherPersonLabel = isSellerView ? 'Buyer' : 'Seller';
        const otherPersonName = isSellerView ? buyerName : sellerName;

        return (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setConfirmation(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.confirmationModal, { maxWidth: 390, paddingHorizontal: 20 }]}>
                {/* Header Icon */}
                <View style={[styles.confirmationIcon, { backgroundColor: iconBg }]}>
                  <Ionicons name={iconName} size={30} color={iconColor} />
                </View>

                {/* Title */}
                <Text style={styles.confirmationTitle}>{confirmation.title}</Text>

                {/* Message */}
                <Text style={styles.confirmationMessage}>
                  {isDeliveredAction ? (
                    <>
                      Confirm that you delivered{' '}
                      <Text style={{ fontWeight: '700', color: '#0F1111' }}>{itemName}</Text>
                      {' to '}
                      <Text style={{ fontWeight: '700', color: '#0F1111' }}>{buyerName}</Text>.
                    </>
                  ) : isConfirmReceiptAction ? (
                    <>
                      Tap Yes to confirm that you have received{' '}
                      <Text style={{ fontWeight: '700', color: '#0F1111' }}>{itemName}</Text>.
                    </>
                  ) : isCancelAction ? (
                    'Are you sure you want to cancel this order?'
                  ) : isReturnRequestAction ? (
                    <>
                      Are you sure you want to return{' '}
                      <Text style={{ fontWeight: '700', color: '#0F1111' }}>{itemName}</Text>?
                    </>
                  ) : isApproveReturnAction ? (
                    <>
                      Confirm that you accept the return and have received{' '}
                      <Text style={{ fontWeight: '700', color: '#0F1111' }}>{itemName}</Text>.
                    </>
                  ) : isRejectReturnAction ? (
                    'The return request will be rejected.'
                  ) : isRentalStartAction ? (
                    <>
                      Confirm that you received{' '}
                      <Text style={{ fontWeight: '700', color: '#0F1111' }}>{itemName}</Text>. The rental period starts now.
                    </>
                  ) : (
                    confirmation.message
                  )}
                </Text>

                {/* Actions */}
                <View style={styles.confirmationActions}>
                  <TouchableOpacity
                    style={[styles.noButton, isUpdating && { opacity: 0.5 }]}
                    onPress={() => setConfirmation(null)}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.noButtonText}>Cancel</Text>
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
                      <Text style={styles.yesButtonText}>
                        {isDeliveredAction
                          ? 'Mark Delivered'
                          : isConfirmReceiptAction
                            ? 'Confirm Received'
                            : isCancelAction
                              ? 'Cancel Order'
                              : isReturnRequestAction
                                ? 'Request Return'
                                : isApproveReturnAction
                                  ? 'Approve Return'
                                  : isRejectReturnAction
                                    ? 'Reject Return'
                                    : isRentalStartAction
                                      ? 'Start Rental'
                                      : 'Confirm'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
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
                    <Ionicons name="checkmark" size={15} color="#007185" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
