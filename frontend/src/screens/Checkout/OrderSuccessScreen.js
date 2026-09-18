import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image, Platform } from 'react-native';
import styles from './OrderSuccessScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function OrderSuccessScreen({ route, navigation }) {
  const {
    orders = [],
    deliveryMethod = 'Discuss',
    paymentMethod = 'Cash',
  } = route.params || {};
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!isPrinting || Platform.OS !== 'web') return undefined;

    const printTimer = setTimeout(() => window.print(), 100);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      clearTimeout(printTimer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrinting]);

  const deliveryLabel = deliveryMethod === 'Discuss'
    ? 'Discuss with seller via Messages'
    : deliveryMethod === 'Delivery' ? 'Campus Delivery' : 'Campus Pickup';
  const paymentLabel = paymentMethod === 'UPI'
    ? 'Pay now with UPI'
    : 'Pay when you receive the item';

  const totalAmount = orders.reduce((sum, order) => sum + order.total_price, 0);
  const orderDate = orders[0]?.createdAt ? new Date(orders[0].createdAt) : new Date();
  const orderNumber = String(orders[0]?.id || orders[0]?._id || 'CAMPUSMART').slice(-10).toUpperCase();
  const buyer = orders[0]?.buyer_id && typeof orders[0].buyer_id === 'object' ? orders[0].buyer_id : null;
  const sellers = orders
    .map((order) => order.seller_id)
    .filter((seller) => seller && typeof seller === 'object')
    .filter((seller, index, list) => index === list.findIndex((item) => (item.id || item._id) === (seller.id || seller._id)));

  const displayValue = (value) => value || 'Not provided';
  const escapeHtml = (value) => String(value || 'Not provided')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const generateInvoiceHtml = () => {
    const itemsHtml = orders.map((order, index) => {
      const item = order.item_id && typeof order.item_id === 'object' ? order.item_id : {};
      const seller = order.seller_id && typeof order.seller_id === 'object' ? order.seller_id : {};
      const itemName = item.name || order.item_name || `Item ${index + 1}`;
      const sellerName = seller.full_name || 'Seller';
      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(itemName)}</strong><small>Order #${escapeHtml(String(order.id || order._id || '').slice(-8))}</small></td>
          <td>${escapeHtml(sellerName)}<small>${escapeHtml(seller.phone || seller.email || 'Contact through Messages')}</small></td>
          <td>${order.quantity || 1}</td>
          <td class="amount">₹${order.total_price}</td>
        </tr>
      `;
    }).join('');

    const sellerHtml = sellers.length > 0
      ? sellers.map((seller) => `
          <div class="party">
            <h3>Seller</h3>
            <strong>${escapeHtml(seller.full_name)}</strong>
            <span>${escapeHtml(seller.email)}</span>
            <span>${escapeHtml(seller.phone)}</span>
            <span>Student ID: ${escapeHtml(seller.student_id)}</span>
          </div>
        `).join('')
      : '<div class="party"><h3>Seller</h3><span>Seller details available in Messages</span></div>';

    return `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 36px; color: #1A1F36; font-family: Arial, sans-serif; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0052CC; padding-bottom: 20px; }
        .brand { color: #0052CC; font-size: 28px; font-weight: 800; margin: 0 0 5px; }
        .muted { color: #697386; }
        .invoice-meta { text-align: right; line-height: 1.7; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 26px 0; }
        .party { border: 1px solid #D9E2F2; border-radius: 8px; padding: 16px; min-height: 120px; }
        .party h3 { color: #0052CC; font-size: 12px; margin: 0 0 10px; text-transform: uppercase; }
        .party strong, .party span { display: block; line-height: 1.6; }
        .summary { background: #F0F5FF; border-radius: 8px; padding: 14px 16px; margin-bottom: 26px; }
        .summary span { display: inline-block; margin-right: 28px; line-height: 1.8; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        th { background: #0052CC; color: white; font-size: 12px; text-align: left; padding: 11px 10px; }
        td { border-bottom: 1px solid #E2E8F0; padding: 12px 10px; vertical-align: top; }
        td small { display: block; color: #697386; margin-top: 4px; }
        .amount { font-weight: 700; text-align: right; white-space: nowrap; }
        .total { text-align: right; font-size: 18px; font-weight: 800; color: #0052CC; padding-top: 10px; }
        .note { background: #F7F9FC; border-left: 4px solid #0052CC; padding: 14px 16px; margin-top: 26px; line-height: 1.6; }
      </style></head><body>
        <div class="header"><div><p class="brand">CampusMart</p><span class="muted">Student marketplace invoice</span></div><div class="invoice-meta"><strong>ORDER INVOICE</strong><br><span class="muted">Issued ${escapeHtml(new Date().toLocaleDateString())}</span></div></div>
        <div class="parties">
          <div class="party"><h3>Buyer</h3><strong>${escapeHtml(buyer?.full_name || 'Buyer')}</strong><span>${escapeHtml(buyer?.email)}</span><span>${escapeHtml(buyer?.phone)}</span><span>Student ID: ${escapeHtml(buyer?.student_id)}</span></div>
          ${sellerHtml}
        </div>
        <div class="summary"><span><strong>Delivery:</strong> ${escapeHtml(deliveryLabel)}</span><span><strong>Payment:</strong> ${escapeHtml(paymentLabel)}</span><span><strong>Status:</strong> Pending seller confirmation</span></div>
        <table><thead><tr><th>#</th><th>Item</th><th>Seller</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <div class="total">Total amount: ₹${totalAmount}</div>
      </body>
      </html>
    `;
  };

  const handleDownloadInvoice = async () => {
    if (Platform.OS === 'web') {
      setIsPrinting(true);
      return;
    }

    try {
      const html = generateInvoiceHtml();
      const { uri: tempUri } = await Print.printToFileAsync({ html });
      
      const fileName = `CampusMart_Invoice_${String(orderNumber)}.pdf`;
      const cacheUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.copyAsync({ from: tempUri, to: cacheUri });

      await Sharing.shareAsync(cacheUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate invoice PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.successHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={48} color="#FFF" />
          </View>
          <Text style={styles.title}>Order Confirmed!</Text>
          <Text style={styles.subtitle}>Your order has been placed successfully.</Text>
        </View>

        <View style={styles.orderMeta}>
          <View>
            <Text style={styles.orderMetaLabel}>Order placed</Text>
            <Text style={styles.orderMetaValue}>{orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
          <View style={styles.orderMetaRight}>
            <Text style={styles.orderMetaLabel}>Order number</Text>
            <Text style={styles.orderMetaValue}>#{orderNumber}</Text>
          </View>
        </View>

        <View style={styles.invoiceCard}>
          <Text style={styles.invoiceTitle}>Order details</Text>

          {orders.map((order, index) => {
            const item = order.item_id && typeof order.item_id === 'object' ? order.item_id : {};
            const seller = order.seller_id && typeof order.seller_id === 'object' ? order.seller_id : {};
            const itemName = item.name || order.item_name || `Item ${index + 1}`;

            return (
              <View key={order._id || order.id || index} style={styles.itemCard}>
                <Image
                  source={{ uri: item.images?.[0] || 'https://via.placeholder.com/120' }}
                  style={styles.itemImage}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>{itemName}</Text>
                  <Text style={styles.itemSeller}>Sold by {seller.full_name || 'CampusMart seller'}</Text>
                  <Text style={styles.itemQuantity}>Quantity: {order.quantity || 1}</Text>
                </View>
                <Text style={styles.itemAmount}>₹{order.total_price}</Text>
              </View>
            );
          })}

          <View style={styles.divider} />
          
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Items subtotal</Text>
            <Text style={styles.invoiceValue}>₹{totalAmount}</Text>
          </View>
          
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Payment</Text>
            <Text style={styles.invoiceValue}>{paymentLabel}</Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Delivery</Text>
            <Text style={styles.invoiceValue}>{deliveryLabel}</Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Buyer Details</Text>
          <Text style={styles.detailsValue}>{displayValue(buyer?.full_name)}</Text>
          <Text style={styles.detailsMeta}>{displayValue(buyer?.email)} · {displayValue(buyer?.phone)}</Text>
          <Text style={styles.detailsMeta}>Student ID: {displayValue(buyer?.student_id)}</Text>
          {sellers.map((seller, index) => (
            <View key={seller.id || seller._id || index} style={styles.sellerDetails}>
              <Text style={styles.detailsTitle}>Seller Details</Text>
              <Text style={styles.detailsValue}>{displayValue(seller.full_name)}</Text>
              <Text style={styles.detailsMeta}>{displayValue(seller.email)} · {displayValue(seller.phone)}</Text>
              <Text style={styles.detailsMeta}>Student ID: {displayValue(seller.student_id)}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {!isPrinting && <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {
            navigation.navigate('MainTabs', { screen: 'Buy' });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>View order history</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleDownloadInvoice}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={18} color="#4B5563" style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Download Invoice</Text>
        </TouchableOpacity>
      </View>}
    </SafeAreaView>
  );
}

