import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import styles from './OrderSuccessScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function OrderSuccessScreen({ route, navigation }) {
  const { orders = [] } = route.params || {};

  const totalAmount = orders.reduce((sum, order) => sum + order.total_price, 0);

  const generateInvoiceHtml = () => {
    let itemsHtml = orders.map((order, index) => {
      // Safely access the item name depending on if it's populated or raw ID
      const itemName = order.item_id?.name || order.item_name || `Item ${index + 1}`;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${itemName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${order.quantity || 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">₹${order.total_price}</td>
        </tr>
      `;
    }).join('');

    return `
      <html>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1A1F36;">
          <h1 style="color: #0052CC; text-align: center; margin-bottom: 10px;">CampusMart</h1>
          <h2 style="text-align: center; margin-bottom: 40px; font-weight: normal; color: #697386;">Order Invoice</h2>
          
          <table style="width: 100%; margin-bottom: 40px;">
            <tr>
              <td>
                <strong>Order Date:</strong> ${new Date().toLocaleDateString()}<br>
                <strong>Payment Method:</strong> Pay on Pickup (Cash)<br>
                <strong>Delivery Method:</strong> Campus Pickup
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <thead>
              <tr style="background-color: #F7F9FC;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #E2E8F0;">#</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #E2E8F0;">Item</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #E2E8F0;">Qty</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #E2E8F0;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px;">Total Amount:</td>
                <td style="padding: 15px 10px; font-weight: bold; font-size: 18px; color: #0052CC;">₹${totalAmount}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="background-color: #E0E7FF; padding: 20px; border-radius: 8px;">
            <p style="margin: 0; color: #0052CC; font-weight: bold;">Next Step</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Message the seller(s) on CampusMart to coordinate a safe meetup location on campus to receive your items and make payment.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = async () => {
    try {
      const html = generateInvoiceHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
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

        <View style={styles.invoiceCard}>
          <Text style={styles.invoiceTitle}>Order Summary</Text>
          
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Items Ordered</Text>
            <Text style={styles.invoiceValue}>{orders.length}</Text>
          </View>
          
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Payment Method</Text>
            <Text style={styles.invoiceValue}>Pay on Pickup (Cash)</Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Delivery Method</Text>
            <Text style={styles.invoiceValue}>Campus Pickup</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.invoiceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={styles.instructionCard}>
          <Ionicons name="chatbubbles-outline" size={24} color="#0052CC" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.instructionTitle}>Next Step</Text>
            <Text style={styles.instructionText}>
              Message the seller(s) to coordinate a safe meetup location on campus to receive your items.
            </Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {
            navigation.navigate('MainTabs', { screen: 'Buy' });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>View My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleDownloadInvoice}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={18} color="#4B5563" style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Download Invoice</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

