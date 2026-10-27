import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
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

  const sellerGroups = useMemo(() => {
    const map = new Map();
    checkoutItems.forEach((item, index) => {
      const sId = String(item.seller_id || `seller_${index}`);
      if (!map.has(sId)) {
        map.set(sId, {
          sellerId: sId,
          sellerName: item.seller_name || 'Campus Seller',
          sellerPhoto: item.seller_photo || null,
          items: [],
          subtotal: 0,
        });
      }
      const group = map.get(sId);
      group.items.push({ item, index });
      group.subtotal += getItemTotal(item, index);
    });
    return Array.from(map.values());
  }, [checkoutItems, rentalDurations]);

  const updateRentalDuration = (item, index, change) => {
    const key = getItemKey(item, index);
    setRentalDurations((current) => ({
      ...current,
      [key]: Math.max(1, Math.min(999, (current[key] || 1) + change)),
    }));
  };

  const handleConfirmOrder = async () => {
    if (checkoutItems.length === 0) return;
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
        ...(paymentMethod === 'Razorpay' ? { checkout_mode: 'standard' } : {}),
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

          let isCaptured = false;
          let verifiedOrders = [];

          // Step 1: If Razorpay credentials were returned, verify signature immediately
          if (checkoutResponse?.razorpay_payment_id) {
            try {
              const verification = await client.post('/payments/verify', {
                payment_id: payment.id,
                razorpay_order_id: checkoutResponse.razorpay_order_id || payment.razorpay_order_id,
                razorpay_payment_id: checkoutResponse.razorpay_payment_id,
                razorpay_signature: checkoutResponse.razorpay_signature,
              });
              if (verification.data?.payment?.status === 'captured') {
                isCaptured = true;
                verifiedOrders = verification.data.orders || [];
              }
            } catch (vErr) {
              // Signature might be missing in redirect, fall through to status check
            }
          }

          // Step 2: Query /payments/status to reconcile directly with Razorpay API
          // This guarantees that if payment succeeded in Razorpay, it captures and confirms
          if (!isCaptured) {
            for (let attempt = 0; attempt < 6; attempt += 1) {
              try {
                const statusRes = await client.get(`/payments/status/${payment.id}`);
                if (statusRes.data?.payment?.status === 'captured') {
                  isCaptured = true;
                  verifiedOrders = statusRes.data.orders || [];
                  break;
                }
                if (['failed', 'expired', 'cancelled'].includes(statusRes.data?.payment?.status)) {
                  break;
                }
              } catch (sErr) {
                // keep checking
              }
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          // Step 3: If payment was captured, proceed to confirm order!
          if (isCaptured) {
            if (verifiedOrders.length > 0) {
              orders = verifiedOrders;
            }
          } else {
            // Step 4: User cancelled without completing payment
            if (currentPaymentId) {
              try {
                await client.post('/payments/cancel', { payment_id: currentPaymentId });
              } catch (cancelErr) {
                // ignore
              }
            }
            setCheckoutRequestKey(createCheckoutRequestKey());
            setLoading(false);
            return;
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
      if (error?.message === 'Payment was cancelled' || error?.message === 'Payment cancelled') {
        if (currentPaymentId) {
          try {
            await client.post('/payments/cancel', { payment_id: currentPaymentId });
          } catch (cancelError) {
            // ignore
          }
        }
        setCheckoutRequestKey(createCheckoutRequestKey());
        setLoading(false);
        return;
      }
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

        {/* Consolidated Order Summary Top Header */}
        <View style={styles.orderSummaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderSummaryTitle}>
              Pay <Text style={styles.orderSummaryPrice}>₹{total}</Text>
            </Text>
            <Text style={styles.orderSummarySubtitle}>
              Total for {checkoutItems.length} item{checkoutItems.length > 1 ? 's' : ''}
              {sellerGroups.length > 1 ? ` · ${sellerGroups.length} Seller Packages` : ''}
            </Text>
          </View>
        </View>

        {/* Multi-Seller Notice Banner */}
        {sellerGroups.length > 1 && (
          <View style={styles.multiSellerNotice}>
            <Ionicons name="layers-outline" size={20} color="#007185" style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.multiSellerTitle}>Multi-Seller Consolidated Order</Text>
              <Text style={styles.multiSellerText}>
                Your cart items are grouped into {sellerGroups.length} separate seller sub-orders. You make 1 single payment, and each seller fulfills their package independently.
              </Text>
            </View>
          </View>
        )}

        {/* Grouped Sub-Orders by Seller */}
        <Text style={styles.sectionHeaderAmazon}>
          {sellerGroups.length > 1 ? 'SELLER PACKAGES & SUB-ORDERS' : 'ITEM DETAILS'}
        </Text>

        {sellerGroups.map((group, groupIndex) => (
          <View key={group.sellerId || groupIndex} style={styles.sellerGroupCard}>
            {/* Seller Header */}
            <View style={styles.sellerGroupHeader}>
              <View style={styles.sellerInfoRow}>
                {group.sellerPhoto ? (
                  <Image source={{ uri: group.sellerPhoto }} style={styles.sellerAvatar} />
                ) : (
                  <View style={styles.sellerAvatarPlaceholder}>
                    <Ionicons name="person" size={14} color="#007185" />
                  </View>
                )}
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.sellerSubOrderTag}>
                    {sellerGroups.length > 1 ? `Package ${groupIndex + 1} of ${sellerGroups.length}` : 'Campus Seller'}
                  </Text>
                  <Text style={styles.sellerNameText} numberOfLines={1}>
                    Sold by {group.sellerName}
                  </Text>
                </View>
              </View>
              <View style={styles.sellerSubtotalBadge}>
                <Text style={styles.sellerSubtotalText}>₹{group.subtotal}</Text>
              </View>
            </View>

            {/* Items inside this seller sub-order */}
            <View style={styles.sellerItemsList}>
              {group.items.map(({ item, index }) => {
                const itemImg = item.images && item.images.length > 0 ? item.images[0] : null;
                const isRent = item.listing_type === 'rent';
                const duration = getRentalDuration(item, index);
                const itemSubtotal = getItemTotal(item, index);

                return (
                  <View key={getItemKey(item, index)} style={styles.sellerItemRow}>
                    {itemImg ? (
                      <Image source={{ uri: itemImg }} style={styles.itemThumb} />
                    ) : (
                      <View style={styles.itemThumbPlaceholder}>
                        <Ionicons name="cube-outline" size={20} color="#94A3B8" />
                      </View>
                    )}
                    <View style={styles.itemInfoCol}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.itemMetaRow}>
                        <Text style={styles.itemMetaText}>
                          Qty: {item.quantity || 1}
                        </Text>
                        <Text style={styles.itemDot}>•</Text>
                        <Text style={styles.itemPriceText}>
                          ₹{item.price}{isRent ? ` / ${item.rental_period || 'day'}` : ''}
                        </Text>
                        {isRent && (
                          <>
                            <Text style={styles.itemDot}>•</Text>
                            <Text style={styles.itemDurationText}>{duration} {item.rental_period || 'day'}{duration > 1 ? 's' : ''}</Text>
                          </>
                        )}
                      </View>

                      {isRent && (
                        <View style={styles.durationSelector}>
                          <Text style={styles.durationLabel}>
                            Duration ({item.rental_period || 'day'}s):
                          </Text>
                          <View style={styles.durationControls}>
                            <TouchableOpacity
                              style={styles.durationBtn}
                              onPress={() => updateRentalDuration(item, index, -1)}
                            >
                              <Ionicons name="remove" size={14} color="#007185" />
                            </TouchableOpacity>
                            <Text style={styles.durationValue}>{duration}</Text>
                            <TouchableOpacity
                              style={styles.durationBtn}
                              onPress={() => updateRentalDuration(item, index, 1)}
                            >
                              <Ionicons name="add" size={14} color="#007185" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={styles.itemTotalCol}>
                      <Text style={styles.itemTotalText}>₹{itemSubtotal}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Hand-off Notice for this sub-order */}
            <View style={styles.sellerHandoffNote}>
              <Ionicons name="chatbubbles-outline" size={15} color="#007185" />
              <Text style={styles.sellerHandoffText} numberOfLines={1}>
                Coordinate campus hand-off with {group.sellerName} via Messages
              </Text>
            </View>
          </View>
        ))}

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
