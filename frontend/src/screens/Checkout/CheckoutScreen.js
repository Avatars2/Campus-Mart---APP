import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import styles from './CheckoutScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { useCartWishlist } from '../../context/CartWishlistContext';

export default function CheckoutScreen({ route, navigation }) {
  const { checkoutItems = [], fromCart = false, offerPayload = null } = route.params || {};
  const { refreshCounts } = useCartWishlist();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [errorMessage, setErrorMessage] = useState(null);
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
    
    console.log("Confirming order with items:", checkoutItems);
    setLoading(true);
    try {
      const res = await client.post('/orders/checkout', {
        items: checkoutItems.map((item, index) => ({
          ...item,
          ...(item.listing_type === 'rent' ? { rental_duration: getRentalDuration(item, index) } : {}),
        })),
        payment_method: paymentMethod,
        delivery_address: deliveryMessage,
        from_cart: fromCart
      });

      if (res.status === 201 || res.status === 200) {
        if (fromCart) {
          refreshCounts();
        }
        if (offerPayload) {
          try {
            await client.post('/messages', { action: 'accept_offer', ...offerPayload });
          } catch (e) { console.log('Failed to accept offer status', e); }
        }
        navigation.replace('OrderSuccess', {
          orders: res.data.orders,
          deliveryMethod: 'Discuss',
          paymentMethod,
        });
      } else {
        setErrorMessage(`Unexpected response status: ${res.status}`);
      }
    } catch (error) {
      console.error("Checkout Error: ", error);
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
          <Ionicons name="arrow-back" size={26} color="#0F1111" />
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
            style={[styles.paymentCardRow, paymentMethod === 'UPI' && styles.paymentCardRowActive]}
            onPress={() => setPaymentMethod('UPI')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.radioOuter, paymentMethod === 'UPI' && styles.radioOuterActive]}>
                {paymentMethod === 'UPI' && <View style={styles.radioInner} />}
              </View>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <View style={styles.badge}><Text style={styles.badgeText}>Best choice</Text></View>
                <Text style={[styles.paymentTitle, paymentMethod === 'UPI' && styles.paymentTitleActive]}>Pay now with UPI</Text>
                <Text style={styles.paymentSubtitle}>Send payment securely before receiving.</Text>
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
                <Text style={styles.paymentSubtitle}>Cash or UPI after agreeing in Messages.</Text>
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
