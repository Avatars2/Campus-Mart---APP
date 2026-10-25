import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import client from '../../../api/client';
import styles from './styles';

export default function AdminAnalyticsScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState('today');
  const [activeTab, setActiveTab] = useState('items');

  // Custom date modal state
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customMode, setCustomMode] = useState('single'); // 'single' | 'range'
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetched data
  const [analyticsData, setAnalyticsData] = useState({
    timeframe: { startDate: '', endDate: '' },
    summary: {
      totalNewUsers: 0,
      totalItemsAdded: 0,
      totalOrders: 0,
      confirmedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalOrderVolume: 0,
      totalReports: 0,
    },
    items: [],
    orders: [],
    users: [],
    reports: [],
  });

  const fetchAnalytics = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      let query = '';
      if (params.preset) {
        query = `?preset=${params.preset}`;
      } else if (params.date) {
        query = `?date=${params.date}`;
      } else if (params.startDate && params.endDate) {
        query = `?startDate=${params.startDate}&endDate=${params.endDate}`;
      } else {
        query = `?preset=today`;
      }

      const res = await client.get(`/admin/analytics${query}`);
      if (res.data?.success) {
        setAnalyticsData(res.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics({ preset: activePreset });
  }, [activePreset, fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activePreset === 'custom') {
      if (customMode === 'single') {
        fetchAnalytics({ date: customDate });
      } else {
        fetchAnalytics({ startDate: customStartDate, endDate: customEndDate });
      }
    } else {
      fetchAnalytics({ preset: activePreset });
    }
  };

  const handleSelectPreset = (presetKey) => {
    if (presetKey === 'custom') {
      setCustomModalVisible(true);
    } else {
      setActivePreset(presetKey);
    }
  };

  const handleApplyCustomFilter = () => {
    setCustomModalVisible(false);
    setActivePreset('custom');
    if (customMode === 'single') {
      fetchAnalytics({ date: customDate });
    } else {
      fetchAnalytics({ startDate: customStartDate, endDate: customEndDate });
    }
  };

  const formatDisplayDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPeriodLabel = () => {
    const { startDate, endDate } = analyticsData.timeframe;
    if (!startDate) return 'Loading...';
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s.toDateString() === e.toDateString()) {
      return formatDisplayDate(startDate);
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${formatDisplayDate(endDate)}`;
  };

  // Status badge colors
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'rental_active':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Confirmed' };
      case 'pending':
      case 'cancel_requested':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Pending' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#B91C1C', label: 'Cancelled' };
      case 'returned':
      case 'return_requested':
        return { bg: '#EDE9FE', text: '#6D28D9', label: 'Returned' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', label: status || 'Unknown' };
    }
  };

  // PDF Generation
  const handleGeneratePDF = async () => {
    try {
      setPdfGenerating(true);
      const periodLabel = formatPeriodLabel();
      const generatedAt = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const { summary, items, orders, users } = analyticsData;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>CampusMart Activity Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1F2937;
              padding: 28px;
              margin: 0;
              background-color: #FFFFFF;
            }
            .header-banner {
              background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
              color: #FFFFFF;
              padding: 24px;
              border-radius: 12px;
              margin-bottom: 24px;
            }
            .header-banner h1 {
              margin: 0 0 6px 0;
              font-size: 24px;
              letter-spacing: -0.5px;
            }
            .header-banner p {
              margin: 0;
              font-size: 13px;
              color: #DBEAFE;
            }
            .meta-box {
              display: flex;
              justify-content: space-between;
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 12px 18px;
              margin-bottom: 24px;
              font-size: 13px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 28px;
            }
            .kpi-card {
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 12px;
              background-color: #FFFFFF;
            }
            .kpi-title {
              font-size: 11px;
              text-transform: uppercase;
              color: #6B7280;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .kpi-val {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #1E3A8A;
              margin-top: 24px;
              margin-bottom: 12px;
              border-bottom: 2px solid #E2E8F0;
              padding-bottom: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            th {
              background-color: #F1F5F9;
              color: #334155;
              text-align: left;
              padding: 8px 10px;
              font-weight: 600;
              border-bottom: 1px solid #CBD5E1;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #E2E8F0;
              color: #475569;
            }
            tr:nth-child(even) td {
              background-color: #F8FAFC;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            }
            .badge-green { background-color: #DCFCE7; color: #166534; }
            .badge-amber { background-color: #FEF3C7; color: #92400E; }
            .badge-red { background-color: #FEE2E2; color: #991B1B; }
            .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
            .footer {
              margin-top: 36px;
              padding-top: 14px;
              border-top: 1px solid #E2E8F0;
              font-size: 11px;
              color: #94A3B8;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1>CampusMart Platform Activity Report</h1>
            <p>Official Platform Audit & Operational Analytics Document</p>
          </div>

          <div class="meta-box">
            <div><strong>Active Scope:</strong> ${periodLabel}</div>
            <div><strong>Generated At:</strong> ${generatedAt}</div>
            <div><strong>Generated By:</strong> CampusMart Admin</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">New Users</div>
              <div class="kpi-val">${summary.totalNewUsers}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Items Added</div>
              <div class="kpi-val">${summary.totalItemsAdded}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Total Orders</div>
              <div class="kpi-val">${summary.totalOrders}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Confirmed Orders</div>
              <div class="kpi-val" style="color: #16A34A;">${summary.confirmedOrders}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Pending Orders</div>
              <div class="kpi-val" style="color: #D97706;">${summary.pendingOrders}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Cancelled/Returned</div>
              <div class="kpi-val" style="color: #DC2626;">${summary.cancelledOrders + summary.returnedOrders}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Order Volume</div>
              <div class="kpi-val">₹${summary.totalOrderVolume.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Reports Filed</div>
              <div class="kpi-val">${summary.totalReports}</div>
            </div>
          </div>

          <div class="section-title">Items Added During This Period (${items.length})</div>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Type</th>
                <th>Price</th>
                <th>Seller</th>
                <th>Time Added</th>
              </tr>
            </thead>
            <tbody>
              ${items.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:16px; color:#94A3B8;">No items added in this timeframe.</td></tr>' : ''}
              ${items.map(i => `
                <tr>
                  <td><strong>${i.name}</strong></td>
                  <td>${i.category}</td>
                  <td><span class="badge badge-blue">${i.listing_type.toUpperCase()}</span></td>
                  <td>₹${i.price}</td>
                  <td>${i.seller}</td>
                  <td>${new Date(i.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Orders Placed During This Period (${orders.length})</div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Item</th>
                <th>Buyer</th>
                <th>Price</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Order Date</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:16px; color:#94A3B8;">No orders placed in this timeframe.</td></tr>' : ''}
              ${orders.map(o => {
                const badgeClass = ['completed', 'delivered', 'rental_active'].includes(o.status)
                  ? 'badge-green'
                  : ['pending', 'cancel_requested'].includes(o.status)
                  ? 'badge-amber'
                  : 'badge-red';
                return `
                  <tr>
                    <td>#${o._id.slice(-6).toUpperCase()}</td>
                    <td><strong>${o.item_name}</strong></td>
                    <td>${o.buyer_name}</td>
                    <td>₹${o.total_price}</td>
                    <td><span class="badge ${badgeClass}">${o.status.toUpperCase()}</span></td>
                    <td>${o.payment_method}</td>
                    <td>${new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="section-title">Newly Registered Users (${users.length})</div>
          <table>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered At</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:16px; color:#94A3B8;">No new users registered in this timeframe.</td></tr>' : ''}
              ${users.map(u => `
                <tr>
                  <td><strong>${u.full_name}</strong></td>
                  <td>${u.email}</td>
                  <td><span class="badge badge-blue">${u.role.toUpperCase()}</span></td>
                  <td>${new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            CampusMart Automated Operational Audit Report • Generated Confidential Document • BIRLA VISHVAKARMA MAHAVIDYALAYA
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: 'Share CampusMart Report',
          });
        }
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const { summary, items, orders, users, reports } = analyticsData;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Platform Analytics</Text>
            <Text style={styles.headerSubtitle}>Activity breakdown & report</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.pdfButton, pdfGenerating && styles.pdfButtonDisabled]}
          onPress={handleGeneratePDF}
          disabled={pdfGenerating || loading}
          activeOpacity={0.8}
        >
          {pdfGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.pdfButtonText}>{pdfGenerating ? 'Creating...' : 'Export PDF'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        {/* Date Filter Card */}
        <View style={styles.filterCard}>
          <View style={styles.filterCardHeader}>
            <Text style={styles.filterCardTitle}>Select Timeframe</Text>
            <View style={styles.activeDateBadge}>
              <Ionicons name="calendar-outline" size={13} color="#1E3A8A" />
              <Text style={styles.activeDateText}>{formatPeriodLabel()}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: '7d', label: 'Last 7 Days' },
              { key: '30d', label: 'Last 30 Days' },
              { key: 'this_month', label: 'This Month' },
              { key: 'custom', label: 'Custom Date / Range' },
            ].map((p) => {
              const isActive = activePreset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => handleSelectPreset(p.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 13 }}>Fetching activity details...</Text>
          </View>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="people" size={18} color="#2563EB" />
                </View>
                <Text style={styles.kpiTitle}>New Users</Text>
                <Text style={styles.kpiValue}>{summary.totalNewUsers}</Text>
                <Text style={styles.kpiSubtitle}>Registered in period</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="pricetag" size={18} color="#DB2777" />
                </View>
                <Text style={styles.kpiTitle}>Items Added</Text>
                <Text style={styles.kpiValue}>{summary.totalItemsAdded}</Text>
                <Text style={styles.kpiSubtitle}>Listed in period</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="cart" size={18} color="#0284C7" />
                </View>
                <Text style={styles.kpiTitle}>Total Orders</Text>
                <Text style={styles.kpiValue}>{summary.totalOrders}</Text>
                <Text style={styles.kpiSubtitle}>Placed in period</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                </View>
                <Text style={styles.kpiTitle}>Confirmed Orders</Text>
                <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{summary.confirmedOrders}</Text>
                <Text style={styles.kpiSubtitle}>Delivered / Active</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="time" size={18} color="#D97706" />
                </View>
                <Text style={styles.kpiTitle}>Pending Orders</Text>
                <Text style={[styles.kpiValue, { color: '#D97706' }]}>{summary.pendingOrders}</Text>
                <Text style={styles.kpiSubtitle}>Awaiting fulfillment</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                </View>
                <Text style={styles.kpiTitle}>Cancelled / Return</Text>
                <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
                  {summary.cancelledOrders + summary.returnedOrders}
                </Text>
                <Text style={styles.kpiSubtitle}>Refunds & stops</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="cash" size={18} color="#059669" />
                </View>
                <Text style={styles.kpiTitle}>Total Volume</Text>
                <Text style={[styles.kpiValue, { color: '#059669' }]}>
                  ₹{summary.totalOrderVolume.toFixed(2)}
                </Text>
                <Text style={styles.kpiSubtitle}>Gross order value</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="alert-circle" size={18} color="#EA580C" />
                </View>
                <Text style={styles.kpiTitle}>User Reports</Text>
                <Text style={styles.kpiValue}>{summary.totalReports}</Text>
                <Text style={styles.kpiSubtitle}>Report incidents</Text>
              </View>
            </View>

            {/* Tab Navigation for Detailed Data */}
            <View style={styles.tabNav}>
              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === 'items' && styles.tabNavItemActive]}
                onPress={() => setActiveTab('items')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabNavText, activeTab === 'items' && styles.tabNavTextActive]}>
                  Items ({items.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === 'orders' && styles.tabNavItemActive]}
                onPress={() => setActiveTab('orders')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabNavText, activeTab === 'orders' && styles.tabNavTextActive]}>
                  Orders ({orders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === 'users' && styles.tabNavItemActive]}
                onPress={() => setActiveTab('users')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabNavText, activeTab === 'users' && styles.tabNavTextActive]}>
                  Users ({users.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === 'reports' && styles.tabNavItemActive]}
                onPress={() => setActiveTab('reports')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabNavText, activeTab === 'reports' && styles.tabNavTextActive]}>
                  Reports ({reports.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT: Items */}
            {activeTab === 'items' && (
              <View>
                <Text style={styles.sectionTitle}>Items Added In Selected Period</Text>
                {items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="pricetag-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No items were added during this timeframe.</Text>
                  </View>
                ) : (
                  items.map((item) => (
                    <View key={item._id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.listItemPrice}>₹{item.price}</Text>
                      </View>
                      <Text style={styles.listItemSubtitle}>
                        Seller: {item.seller} • Category: {item.category}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                          <Text style={[styles.badgeText, { color: '#2563EB' }]}>
                            {item.listing_type.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB CONTENT: Orders */}
            {activeTab === 'orders' && (
              <View>
                <Text style={styles.sectionTitle}>Orders Placed In Selected Period</Text>
                {orders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cart-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No orders were placed during this timeframe.</Text>
                  </View>
                ) : (
                  orders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    return (
                      <View key={order._id} style={styles.listItemCard}>
                        <View style={styles.listItemRow}>
                          <Text style={styles.listItemTitle} numberOfLines={1}>
                            {order.item_name}
                          </Text>
                          <Text style={styles.listItemPrice}>₹{order.total_price}</Text>
                        </View>
                        <Text style={styles.listItemSubtitle}>
                          Order #{order._id.slice(-6).toUpperCase()} • Buyer: {order.buyer_name}
                        </Text>
                        <View style={styles.badgeRow}>
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>
                              {badge.label}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                            <Text style={[styles.badgeText, { color: '#4B5563' }]}>
                              {order.payment_method}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB CONTENT: Users */}
            {activeTab === 'users' && (
              <View>
                <Text style={styles.sectionTitle}>New Registrations In Selected Period</Text>
                {users.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="person-add-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No users registered during this timeframe.</Text>
                  </View>
                ) : (
                  users.map((u) => (
                    <View key={u._id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        <Text style={styles.listItemTitle}>{u.full_name}</Text>
                        <View style={[styles.badge, { backgroundColor: u.role === 'admin' ? '#FCE7F3' : '#DBEAFE' }]}>
                          <Text style={[styles.badgeText, { color: u.role === 'admin' ? '#DB2777' : '#2563EB' }]}>
                            {u.role.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.listItemSubtitle}>{u.email}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                        Joined: {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB CONTENT: Reports */}
            {activeTab === 'reports' && (
              <View>
                <Text style={styles.sectionTitle}>User Reports Filed In Selected Period</Text>
                {reports.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="shield-checkmark-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No reports filed during this timeframe.</Text>
                  </View>
                ) : (
                  reports.map((r) => (
                    <View key={r._id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        <Text style={styles.listItemTitle}>{r.reason}</Text>
                        <View style={[styles.badge, { backgroundColor: r.status === 'pending' ? '#FEF3C7' : '#DCFCE7' }]}>
                          <Text style={[styles.badgeText, { color: r.status === 'pending' ? '#B45309' : '#15803D' }]}>
                            {r.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.listItemSubtitle}>Reported by: {r.reporter_name}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                        Filed at: {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Custom Date / Range Selection Modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Filter</Text>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Mode Selector */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  { flex: 1, alignItems: 'center' },
                  customMode === 'single' && styles.presetChipActive,
                ]}
                onPress={() => setCustomMode('single')}
              >
                <Text style={[styles.presetChipText, customMode === 'single' && styles.presetChipTextActive]}>
                  Specific Day
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  { flex: 1, alignItems: 'center' },
                  customMode === 'range' && styles.presetChipActive,
                ]}
                onPress={() => setCustomMode('range')}
              >
                <Text style={[styles.presetChipText, customMode === 'range' && styles.presetChipTextActive]}>
                  Date Range
                </Text>
              </TouchableOpacity>
            </View>

            {customMode === 'single' ? (
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            ) : (
              <>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={handleApplyCustomFilter}
              >
                <Text style={styles.modalApplyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

