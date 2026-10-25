import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import styles from './Checkout.styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { useCartWishlist } from '../../context/CartWishlistContext';
import openRazorpayCheckout from '../../payments/razorpayCheckout';

const createCheckoutRequestKey = () => `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;

export default function Checkout({ route, navigation }) {
  const { checkoutItems = [], fromCart = false, offerPayload = null } = route.params || {};
  const { refreshCounts } = useCartWishlist();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [errorMessage, setErrorMessage] = useState(null);
  const [checkoutRequestKey, setCheckoutRequestKey] = useState(createCheckoutRequestKey);
  const [rentalDurations, setRentalDurations] = useState(() => (
    checkoutItems.reduce((durations, item, index) => {
      if (item.listing_type === 'rent') durations[item.id || item._id || index] = 1;
      return durations;
    }, {})
  ));

  const getItemKey = (item, index) => item.id || item._id || index;
  const getRentalDuration = (item, index) => rentalDurations[getItemKey(item, index)] || 1;
  const getItemTotal = (item, index) => item.price * item.quantity * (item.listing_type === 'rent' ? getRentalDuration(item, index) : 1);
  const total = checkoutItems.reduce((sum, item, index) => sum + getItemTotal(item, index), 0);
  const deliveryMessage = 'Discuss with seller via Messages';

  const updateRentalDuration = (item, index, change) => {
    const key = getItemKey(item, index);
    setRentalDurations((current) => ({
      ...current,
      [key]: Math.max(1, Math.min(999, (current[key] || 1) + change)),
    }));
  };

  const handleConfirmOrder = async () => {
    if (checkoutItems.length === 0) return;
    const useHostedCheckout = paymentMethod === 'Razorpay'
      && Platform.OS !== 'web'
      && isRunningInExpoGo();
    setLoading(true);
    setErrorMessage(null);
    let currentPaymentId = null;
    try {
      const res = await client.post('/orders/checkout', {
        items: checkoutItems.map((item, index) => ({
          id: item.id || item._id,
          quantity: item.quantity || 1,
          ...(item.listing_type === 'rent' ? { rental_duration: getRentalDuration(item, index) } : {}),
        })),
        payment_method: paymentMethod,
        delivery_address: deliveryMessage,
        from_cart: fromCart,
        ...(paymentMethod === 'Razorpay' ? { checkout_mode: useHostedCheckout ? 'hosted' : 'standard' } : {}),
        ...(paymentMethod === 'Razorpay' ? { idempotency_key: checkoutRequestKey } : {}),
      });

      if (res.status === 201 || res.status === 200) {
        let orders = res.data.orders;
        if (paymentMethod === 'Razorpay') {
          const payment = res.data.payment;
          if (!payment?.id) throw new Error('Payment session was not created. Please try again.');
          currentPaymentId = payment.id;
          const checkoutResponse = await openRazorpayCheckout({
            key: payment.key_id,
            order_id: payment.razorpay_order_id,
            amount: payment.amount,
            currency: payment.currency,
            name: 'Campus Mart',
            description: 'Campus Mart order',
            hosted_checkout_url: payment.hosted_checkout_url,
            theme: { color: '#007185' },
            modal: { confirm_close: true },
          });

          if (checkoutResponse?.hosted) {
            let statusResponse = null;
            let isCaptured = false;

            // Step 1: Quick check if already captured
            try {
              statusResponse = await client.get(`/payments/status/${payment.id}`);
              if (statusResponse?.data?.payment?.status === 'captured') {
                isCaptured = true;
              }
            } catch (e) {
              // ignore
            }

            // Step 2: If browser was closed/cancelled by user (e.g. clicked X cross button) without paying:
            if (!isCaptured && (checkoutResponse?.type === 'cancel' || checkoutResponse?.type === 'dismiss')) {
              // User cancelled checkout. Clean up pending payment session in background.
              try {
                await client.post('/payments/cancel', { payment_id: payment.id });
              } catch (cancelErr) {
                // ignore
              }
              setCheckoutRequestKey(createCheckoutRequestKey());
              setLoading(false);
              // Stay directly on the Checkout / Payment screen!
              return;
            }

            // Step 3: If not yet captured, poll for a few seconds to allow payment webhook/gateway confirmation
            if (!isCaptured) {
              for (let attempt = 0; attempt < 8; attempt += 1) {
                try {
                  statusResponse = await client.get(`/payments/status/${payment.id}`);
                  if (statusResponse?.data?.payment?.status === 'captured') {
                    isCaptured = true;
                    break;
                  }
                  if (['failed', 'expired'].includes(statusResponse?.data?.payment?.status)) break;
                } catch (e) {
                  // Keep polling
                }
                await new Promise((resolve) => setTimeout(resolve, 1200));
              }
            }

            if (isCaptured && statusResponse?.data?.orders?.length > 0) {
              orders = statusResponse.data.orders;
            } else {
              if (statusResponse?.data?.payment?.status === 'needs_review') {
                Alert.alert(
                  'Payment Under Review',
                  'Your payment was received and is under review. Please check your Purchases tab.'
                );
                setCheckoutRequestKey(createCheckoutRequestKey());
                navigation.navigate('MainTabs', { screen: 'Buy', params: { tab: 'purchases' } });
                return;
              }

              // Otherwise user cancelled or payment did not go through. Clean up and stay on checkout.
              try {
                await client.post('/payments/cancel', { payment_id: payment.id });
              } catch (cancelErr) {
                // ignore
              }
              setCheckoutRequestKey(createCheckoutRequestKey());
              setLoading(false);
              return;
            }
          } else {
            const verification = await client.post('/payments/verify', {
              payment_id: payment.id,
              razorpay_order_id: checkoutResponse.razorpay_order_id,
              razorpay_payment_id: checkoutResponse.razorpay_payment_id,
              razorpay_signature: checkoutResponse.razorpay_signature,
            });
            if (verification.data.payment.status !== 'captured') {
              Alert.alert(
                'Payment processing',
                'Razorpay is still confirming your payment. Check Purchases shortly; the order is not confirmed until capture succeeds.'
              );
              setCheckoutRequestKey(createCheckoutRequestKey());
              return;
            }
            orders = verification.data.orders;
          }
        }

        if (fromCart) refreshCounts();
        if (offerPayload) {
          try {
            await client.post('/messages', { action: 'accept_offer', ...offerPayload });
          } catch (offerError) {
            console.error('Failed to update accepted offer status:', offerError);
          }
        }
        navigation.replace('OrderSuccess', {
          orders,
          deliveryMethod: 'Discuss',
          paymentMethod,
        });
      } else {
        setErrorMessage(`Unexpected response status: ${res.status}`);
      }
    } catch (error) {
      console.error('Checkout error:', error.response?.data || error);
      if (paymentMethod === 'Razorpay') {
        if (currentPaymentId) {
          try {
            await client.post('/payments/cancel', { payment_id: currentPaymentId });
          } catch (cancelError) {
            console.error('Could not reconcile cancelled Razorpay checkout:', cancelError.response?.data || cancelError);
          }
        }
        setCheckoutRequestKey(createCheckoutRequestKey());
      }
      if (error.response?.data?.code === 'IDEMPOTENCY_KEY_USED') {
        setCheckoutRequestKey(createCheckoutRequestKey());
      }
      let msg = error.response?.data?.error || error.message || 'Failed to place order';
      if (msg === 'Network Error') {
        msg = `Network Error while connecting to ${client.defaults.baseURL}/orders/checkout. Please check your backend terminal.`;
      }
      setErrorMessage(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ position: 'absolute', left: 16, bottom: 15, zIndex: 10, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={26} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Pay<Text style={{ color: '#007185' }}>ment</Text>
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.orderSummaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderSummaryTitle}>
              Pay <Text style={styles.orderSummaryPrice}>₹{total}</Text>
            </Text>
            <Text style={styles.orderSummarySubtitle}>
              for {checkoutItems.length} item{checkoutItems.length > 1 ? 's' : ''}
            </Text>
            {checkoutItems.map((item, index) => (
              <View key={index} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: '#0F1111', fontWeight: '500' }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: '#555' }}>Qty: {item.quantity}{item.listing_type === 'rent' ? ` · ₹${item.price} / ${item.rental_period || 'day'}` : ''}</Text>
                
                {item.listing_type === 'rent' && (
                  <View style={{ backgroundColor: '#F0F8FA', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#D5D9D9' }}>
                    <Text style={{ color: '#0F1111', fontSize: 12, fontWeight: '500', marginBottom: 6 }}>
                      Duration ({item.rental_period || 'day'}s):
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D5D9D9' }}
                        onPress={() => updateRentalDuration(item, index, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#007185" />
                      </TouchableOpacity>
                      <Text style={{ minWidth: 40, textAlign: 'center', color: '#0F1111', fontSize: 14, fontWeight: '700' }}>
                        {getRentalDuration(item, index)}
                      </Text>
                      <TouchableOpacity
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D5D9D9' }}
                        onPress={() => updateRentalDuration(item, index, 1)}
                      >
                        <Ionicons name="add" size={16} color="#007185" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: '#E4F4EC', marginHorizontal: 16, padding: 12, borderRadius: 4, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="information-circle-outline" size={18} color="#0F1111" style={{ marginRight: 8 }} />
          <Text style={{ color: '#007185', fontSize: 13 }}>Contact seller via Messages to arrange delivery.</Text>
        </View>

        <Text style={styles.sectionHeaderAmazon}>RECOMMENDED</Text>
        <View style={styles.paymentCardGroup}>
          <TouchableOpacity 
            style={[styles.paymentCardRow, paymentMethod === 'Razorpay' && styles.paymentCardRowActive]}
            onPress={() => setPaymentMethod('Razorpay')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.radioOuter, paymentMethod === 'Razorpay' && styles.radioOuterActive]}>
                {paymentMethod === 'Razorpay' && <View style={styles.radioInner} />}
              </View>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <View style={styles.badge}><Text style={styles.badgeText}>Best choice</Text></View>
                <Text style={[styles.paymentTitle, paymentMethod === 'Razorpay' && styles.paymentTitleActive]}>Pay securely with Razorpay</Text>
                <Text style={styles.paymentSubtitle}>UPI, cards, net banking, and other available methods. Complete payment within 5 minutes.</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeaderAmazon}>PAY ON DELIVERY</Text>
        <View style={[styles.paymentCardGroup, { marginBottom: 24 }]}>
          <TouchableOpacity 
            style={[styles.paymentCardRow, paymentMethod === 'Cash' && styles.paymentCardRowActive]}
            onPress={() => setPaymentMethod('Cash')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.radioOuter, paymentMethod === 'Cash' && styles.radioOuterActive]}>
                {paymentMethod === 'Cash' && <View style={styles.radioInner} />}
              </View>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={[styles.paymentTitle, paymentMethod === 'Cash' && styles.paymentTitleActive]}>Pay when you receive the item</Text>
                <Text style={styles.paymentSubtitle}>Pay on delivery; coordinate with the seller in Messages.</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={{ backgroundColor: '#FEE2E2', marginHorizontal: 16, padding: 12, borderRadius: 8, marginBottom: 20 }}>
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.confirmButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
