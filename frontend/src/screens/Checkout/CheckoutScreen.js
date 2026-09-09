import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import styles from './CheckoutScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { useCartWishlist } from '../../context/CartWishlistContext';

export default function CheckoutScreen({ route, navigation }) {
  const { checkoutItems = [], fromCart = false } = route.params || {};
  const { refreshCounts } = useCartWishlist();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Default and only option for now
  const [errorMessage, setErrorMessage] = useState(null);

  const total = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleConfirmOrder = async () => {
    if (checkoutItems.length === 0) return;
    
    console.log("Confirming order with items:", checkoutItems);
    setLoading(true);
    try {
      const res = await client.post('/orders/checkout', {
        items: checkoutItems,
        payment_method: paymentMethod,
        delivery_address: 'Campus Pickup',
        from_cart: fromCart
      });

      if (res.status === 201 || res.status === 200) {
        if (fromCart) {
          refreshCounts();
        }
        navigation.replace('OrderSuccess', { orders: res.data.orders });
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {checkoutItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total to Pay</Text>
            <Text style={styles.totalAmount}>₹{total}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Method</Text>
          <View style={styles.deliveryCard}>
            <Ionicons name="location" size={24} color="#0052CC" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryTitle}>Campus Pickup</Text>
              <Text style={styles.deliverySubtitle}>Meet the seller on campus to receive the item.</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity 
            style={[styles.paymentCard, paymentMethod === 'Cash' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('Cash')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="cash-outline" size={24} color={paymentMethod === 'Cash' ? '#0052CC' : '#697386'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentTitle, paymentMethod === 'Cash' && styles.paymentTitleActive]}>Pay on Pickup (Cash/UPI)</Text>
              <Text style={styles.paymentSubtitle}>Pay the seller directly when you meet.</Text>
            </View>
            <View style={[styles.radioOuter, paymentMethod === 'Cash' && styles.radioOuterActive]}>
              {paymentMethod === 'Cash' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentCard, { opacity: 0.5 }]}
            activeOpacity={1}
            disabled={true}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="card-outline" size={24} color="#697386" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Online Payment</Text>
              <Text style={styles.paymentSubtitle}>Credit Card, Debit Card, Net Banking</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming Soon</Text>
            </View>
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 20 }}>
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalAmount}>₹{total}</Text>
        </View>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
