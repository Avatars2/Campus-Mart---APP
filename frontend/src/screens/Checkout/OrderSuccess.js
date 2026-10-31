import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image, Platform } from 'react-native';
import styles from './OrderSuccess.styles';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

export default function OrderSuccess({ route, navigation }) {
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
  const paymentLabel = ['UPI', 'Razorpay'].includes(paymentMethod)
    ? 'Paid with Razorpay'
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
  const escapeHtml = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const generateInvoiceHtml = () => {
    const isOnlinePayment = ['UPI', 'Razorpay'].includes(paymentMethod);
    const orderRawId = String(orders[0]?.id || orders[0]?._id || 'CAMPUSMART');
    const orderNum = orderRawId.slice(-10).toUpperCase();
    const invoiceNumber = `CM-INV-${orderRawId.slice(-8).toUpperCase()}`;
    const orderFormattedDate = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const itemsHtml = orders.map((order, index) => {
      const item = order.item_id && typeof order.item_id === 'object' ? order.item_id : {};
      const seller = order.seller_id && typeof order.seller_id === 'object' ? order.seller_id : {};
      const itemName = item.name || order.item_name || `Item ${index + 1}`;
      const sellerName = seller.full_name || 'Campus Student';
      const isRental = item.listing_type === 'rent' || Boolean(order.rental_duration);
      const condition = item.condition_rating ? `Condition: ${item.condition_rating}/10` : 'Condition: Good / Verified';
      const qty = Number(order.quantity || 1);
      const rowTotal = Number(order.total_price || 0).toFixed(2);
      const unitPrice = (Number(order.total_price || 0) / (qty || 1)).toFixed(2);

      return `
        <tr>
          <td style="text-align: center; color: #64748B;">${index + 1}</td>
          <td>
            <div class="item-name">${escapeHtml(itemName)}</div>
            <div class="item-subtext">
              <span class="spec-pill condition">${escapeHtml(condition)}</span>
              <span class="spec-pill ${isRental ? 'rental' : ''}">${escapeHtml(isRental ? 'Campus Rental' : 'Direct Buy')}</span>
              <span class="spec-pill" style="background:#F3F4F6;">Seller: ${escapeHtml(sellerName)}</span>
            </div>
          </td>
          <td style="text-align: center; font-weight: 600;">${qty}</td>
          <td style="text-align: right; color: #475569;">₹${escapeHtml(unitPrice)}</td>
          <td class="amount">₹${escapeHtml(rowTotal)}</td>
        </tr>
      `;
    }).join('');

    const buyerDept = [buyer?.department, buyer?.year_semester].filter(Boolean).join(' • ') || 'Campus Student';

    const sellerHtml = sellers.length > 0
      ? sellers.map((seller) => {
          const sDept = [seller.department, seller.year_semester].filter(Boolean).join(' • ') || 'Campus Student';
          return `
            <div class="party-card">
              <div class="party-card-header">
                <span class="party-role-tag">Seller Details</span>
                <span class="party-id-badge">${escapeHtml(seller.student_id ? 'ID: ' + seller.student_id : 'Seller')}</span>
              </div>
              <div class="party-name">${escapeHtml(seller.full_name || 'Seller')}</div>
              <div class="party-detail">🏷️ ${escapeHtml(sDept)}</div>
              <div class="party-detail">📞 Mobile: ${escapeHtml(seller.phone || 'In messages')}</div>
              ${seller.email ? `<div class="party-detail">✉️ Email: ${escapeHtml(seller.email)}</div>` : ''}
            </div>
          `;
        }).join('')
      : `
        <div class="party-card">
          <div class="party-card-header">
            <span class="party-role-tag">Seller Details</span>
          </div>
          <div class="party-name">CampusMart Verified Seller</div>
          <div class="party-detail">Seller contact is accessible directly in Messages</div>
        </div>
      `;

    const formattedTotal = Number(totalAmount || 0).toFixed(2);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CampusMart Invoice - #${escapeHtml(orderNum)}</title>
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
      border: 1px solid #FDE68A;
      background: #FFFBEB;
    }
    .status-pill {
      font-size: 13px;
      font-weight: 700;
      color: #92400E;
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
        <strong>#${escapeHtml(orderNum)}</strong>
      </div>
      <div class="meta-box">
        <label>Order Date</label>
        <strong>${escapeHtml(orderFormattedDate)}</strong>
      </div>
      <div class="meta-box">
        <label>Payment Method</label>
        <strong>${isOnlinePayment ? 'Razorpay Online' : 'Cash on Meetup'}</strong>
      </div>
      <div class="meta-box">
        <label>Payment Status</label>
        <strong>${orders[0]?.payment_status === 'paid' ? 'Paid (Escrow)' : 'Due at Handover'}</strong>
      </div>
    </div>

    <div class="status-banner">
      <div class="status-pill">⏳ Pending Handover & Inspection</div>
      <div class="listing-badge">${orders.length > 1 ? `${orders.length} Campus Items` : 'Campus Marketplace Order'}</div>
    </div>

    <div class="parties">
      <div class="party-card">
        <div class="party-card-header">
          <span class="party-role-tag">Buyer Details</span>
          <span class="party-id-badge">${escapeHtml(buyer?.student_id ? 'ID: ' + buyer.student_id : 'Student')}</span>
        </div>
        <div class="party-name">${escapeHtml(buyer?.full_name || 'Buyer')}</div>
        <div class="party-detail">🎓 ${escapeHtml(buyerDept)}</div>
        <div class="party-detail">📞 Mobile: ${escapeHtml(buyer?.phone || 'In messages')}</div>
        ${buyer?.email ? `<div class="party-detail">✉️ Email: ${escapeHtml(buyer.email)}</div>` : ''}
      </div>

      ${sellerHtml}
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
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="info-summary-grid">
      <div class="handover-escrow-card">
        <div class="card-subtitle">Campus Delivery / Handover</div>
        <div class="card-body-text">
          <strong>Meetup Location:</strong> ${escapeHtml(deliveryLabel)}
        </div>

        <div class="card-subtitle" style="margin-top: 10px;">Payment Security</div>
        <div class="card-body-text" style="margin-bottom: 8px;">
          <strong>Mode:</strong> ${escapeHtml(paymentLabel)}<br>
          <strong>Status:</strong> ${escapeHtml(orders[0]?.payment_status === 'paid' ? 'Paid & Protected in Escrow' : 'Due upon item handover')}
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
          <span>Items Subtotal:</span>
          <span>₹${escapeHtml(formattedTotal)}</span>
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
          <span class="grand-total-amount">₹${escapeHtml(formattedTotal)}</span>
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

  const handleDownloadInvoice = async () => {
    if (Platform.OS === 'web') {
      const html = generateInvoiceHtml();
      const invoiceWindow = window.open('', '_blank');
      if (invoiceWindow) {
        invoiceWindow.document.open();
        invoiceWindow.document.write(html);
        invoiceWindow.document.close();
        invoiceWindow.document.title = `CampusMart_Invoice_${String(orderNumber)}`;
      } else {
        setIsPrinting(true);
      }
      return;
    }

    try {
      const html = generateInvoiceHtml();
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      
      const fileName = `CampusMart_Invoice_${String(orderNumber)}.pdf`;
      const cacheUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(cacheUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(cacheUri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (shareErr) {
          if (Platform.OS === 'android') {
            const contentUri = await FileSystem.getContentUriAsync(cacheUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1,
              type: 'application/pdf',
            });
          } else {
            throw shareErr;
          }
        }
      } else if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(cacheUri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate invoice PDF.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })} 
          style={{ position: 'absolute', left: 16, bottom: 15, zIndex: 10, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={26} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.amazonLogoText}>
          Con<Text style={{ color: '#007185' }}>firm</Text>
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.topSection}>
          <View style={styles.successRow}>
            <Ionicons name="checkmark-circle" size={32} color="#067D62" />
            <Text style={styles.successText}>Order placed, thank you!</Text>
          </View>
          
          <View style={styles.shippingSection}>
            <Text style={styles.shippingLabel}>Shipping to {displayValue(buyer?.full_name)},</Text>
            <Text style={styles.shippingValue}>Discuss delivery with seller via Messages.</Text>
          </View>
        </View>

        <View style={styles.amazonCard}>
          <Text style={styles.sectionTitle}>Order details</Text>

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
                  <Text style={styles.itemSeller}>Sold by: {seller.full_name || 'CampusMart seller'}</Text>
                  <Text style={styles.itemQuantity}>Quantity: {order.quantity || 1}</Text>
                  <Text style={styles.itemAmount}>₹{order.total_price}</Text>
                </View>
              </View>
            );
          })}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items subtotal:</Text>
            <Text style={styles.summaryValue}>₹{totalAmount}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment:</Text>
            <Text style={styles.summaryValue}>{paymentMethod === 'Cash' ? 'Pay on delivery' : 'Paid with Razorpay'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment status:</Text>
            <Text style={styles.summaryValue}>
              {orders[0]?.payment_status === 'paid' ? 'Paid' : 'Due on delivery'}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Price:</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={styles.amazonCard}>
          <Text style={styles.detailsTitle}>Buyer Details</Text>
          <Text style={styles.detailsValue}>{displayValue(buyer?.full_name)}</Text>
          <Text style={styles.detailsMeta}>Phone: {displayValue(buyer?.phone)}</Text>
          <Text style={styles.detailsMeta}>Student ID: {displayValue(buyer?.student_id)}</Text>
          
          {sellers.map((seller, index) => (
            <View key={seller.id || seller._id || index} style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F2F2F2' }}>
              <Text style={styles.detailsTitle}>Seller Details</Text>
              <Text style={styles.detailsValue}>{displayValue(seller.full_name)}</Text>
              <Text style={styles.detailsMeta}>Phone: {displayValue(seller.phone)}</Text>
              <Text style={styles.detailsMeta}>Student ID: {displayValue(seller.student_id)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {!isPrinting && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.buttonAmazonYellow}
            onPress={() => {
              navigation.navigate('MainTabs', { screen: 'Buy' });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonAmazonYellowText}>View Order</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.buttonAmazonWhite}
            onPress={handleDownloadInvoice}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonAmazonWhiteText}>Invoice</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

