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
      const reportRef = `CMR-AUD-${Date.now().toString().slice(-6)}`;
      const { summary, items = [], orders = [], users = [], reports = [] } = analyticsData;

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>CampusMart Operational Audit Report - ${reportRef}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 14mm 16mm 14mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0F172A;
              background-color: #F8FAFC;
              margin: 0;
              padding: 24px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Preview action bar (only visible in web tab preview, hidden during print / PDF) */
            .no-print {
              display: block;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              body {
                background-color: #FFFFFF !important;
                padding: 0 !important;
              }
              .page-break {
                page-break-before: always;
              }
            }

            .action-bar {
              background-color: #1E293B;
              color: #FFFFFF;
              padding: 12px 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            }
            .action-bar-info {
              font-size: 13px;
              color: #E2E8F0;
            }
            .action-bar-info strong {
              color: #60A5FA;
            }
            .action-bar-btns {
              display: flex;
              gap: 10px;
            }
            .btn {
              cursor: pointer;
              border: none;
              border-radius: 6px;
              padding: 7px 14px;
              font-size: 12px;
              font-weight: 700;
              transition: all 0.2s;
            }
            .btn-primary {
              background-color: #2563EB;
              color: #FFFFFF;
            }
            .btn-secondary {
              background-color: #475569;
              color: #FFFFFF;
            }

            .document-container {
              background-color: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 12px;
              padding: 28px 32px;
              max-width: 900px;
              margin: 0 auto;
            }
            @media print {
              .document-container {
                border: none;
                border-radius: 0;
                padding: 0;
                max-width: 100%;
              }
            }

            /* ── Official Institutional Header ── */
            .doc-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #1E3A8A;
              padding-bottom: 18px;
              margin-bottom: 20px;
            }
            .brand-section {
              flex: 1;
            }
            .org-name {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: 0.5px;
              color: #1E3A8A;
              margin: 0 0 2px 0;
            }
            .org-sub {
              font-size: 12px;
              color: #64748B;
              font-weight: 600;
              margin: 0 0 8px 0;
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }
            .doc-title-badge {
              display: inline-block;
              background-color: #EFF6FF;
              border: 1px solid #BFDBFE;
              color: #1E40AF;
              font-size: 11px;
              font-weight: 800;
              padding: 3px 8px;
              border-radius: 4px;
              letter-spacing: 0.5px;
            }

            .meta-section {
              text-align: right;
            }
            .meta-table {
              font-size: 11.5px;
              color: #475569;
            }
            .meta-table tr td:first-child {
              font-weight: 700;
              color: #1E293B;
              padding-right: 10px;
              text-align: right;
            }
            .meta-table tr td:last-child {
              text-align: right;
              color: #334155;
            }
            .confidential-tag {
              display: inline-block;
              margin-top: 6px;
              background-color: #FEE2E2;
              border: 1px solid #FECACA;
              color: #991B1B;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              letter-spacing: 0.4px;
            }

            /* ── Scope Box ── */
            .scope-banner {
              background-color: #F1F5F9;
              border-left: 4px solid #2563EB;
              border-radius: 0 6px 6px 0;
              padding: 10px 14px;
              margin-bottom: 22px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12.5px;
            }
            .scope-banner strong {
              color: #0F172A;
            }

            /* ── KPI Matrix ── */
            .kpi-title-heading {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              letter-spacing: 0.6px;
              margin-bottom: 10px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 26px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .kpi-card {
              background-color: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 10px 12px;
              border-top: 3px solid #64748B;
            }
            .kpi-card.blue { border-top-color: #2563EB; }
            .kpi-card.green { border-top-color: #16A34A; }
            .kpi-card.amber { border-top-color: #D97706; }
            .kpi-card.red { border-top-color: #DC2626; }
            .kpi-card.purple { border-top-color: #7C3AED; }

            .kpi-label {
              font-size: 10.5px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748B;
              margin-bottom: 3px;
              letter-spacing: 0.3px;
            }
            .kpi-value {
              font-size: 19px;
              font-weight: 800;
              color: #0F172A;
            }
            .kpi-value.green { color: #15803D; }
            .kpi-value.amber { color: #B45309; }
            .kpi-value.red { color: #B91C1C; }
            .kpi-value.blue { color: #1D4ED8; }
            .kpi-sub {
              font-size: 9.5px;
              color: #94A3B8;
              margin-top: 2px;
            }

            /* ── Tables ── */
            .section-block {
              margin-bottom: 24px;
              page-break-inside: auto;
            }
            .section-header-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1.5px solid #CBD5E1;
              padding-bottom: 6px;
              margin-bottom: 10px;
              page-break-after: avoid;
            }
            .section-title {
              font-size: 13.5px;
              font-weight: 800;
              color: #1E3A8A;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-count {
              background-color: #F1F5F9;
              color: #475569;
              font-size: 11px;
              font-weight: 700;
              padding: 2px 7px;
              border-radius: 10px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11.5px;
              margin-bottom: 6px;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background-color: #F8FAFC;
              color: #334155;
              text-align: left;
              padding: 7px 9px;
              font-weight: 700;
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              border-top: 1px solid #E2E8F0;
              border-bottom: 2px solid #CBD5E1;
            }
            td {
              padding: 7px 9px;
              border-bottom: 1px solid #E2E8F0;
              color: #334155;
              vertical-align: middle;
            }
            tr:nth-child(even) td {
              background-color: #FAFAFA;
            }

            /* Badges */
            .badge {
              display: inline-block;
              padding: 2px 7px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .badge-green { background-color: #DCFCE7; color: #166534; }
            .badge-amber { background-color: #FEF3C7; color: #92400E; }
            .badge-red { background-color: #FEE2E2; color: #991B1B; }
            .badge-blue { background-color: #EFF6FF; color: #1D4ED8; }
            .badge-purple { background-color: #FAF5FF; color: #6D28D9; }

            /* Empty state in table */
            .empty-row td {
              text-align: center;
              padding: 16px;
              color: #94A3B8;
              font-style: italic;
            }

            /* ── Sign-off Block ── */
            .signoff-section {
              margin-top: 36px;
              padding-top: 18px;
              border-top: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sign-box {
              width: 44%;
            }
            .sign-line {
              border-bottom: 1px dashed #94A3B8;
              height: 36px;
              margin-bottom: 6px;
            }
            .sign-name {
              font-size: 11px;
              font-weight: 800;
              color: #1E293B;
              text-transform: uppercase;
            }
            .sign-title {
              font-size: 10px;
              color: #64748B;
            }

            /* ── Document Footer ── */
            .doc-footer {
              margin-top: 24px;
              padding-top: 10px;
              border-top: 1px solid #F1F5F9;
              font-size: 10px;
              color: #94A3B8;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
          </style>
        </head>
        <body>
          <div class="no-print action-bar">
            <div class="action-bar-info">
              <strong>Campus Mart</strong> • Executive Platform Audit Report Preview
            </div>
            <div class="action-bar-btns">
              <button class="btn btn-primary" onclick="window.print()">
                Print / Save as PDF
              </button>
              <button class="btn btn-secondary" onclick="window.close()">Close Preview</button>
            </div>
          </div>

          <div class="document-container">
            <!-- Header -->
            <div class="doc-header">
              <div class="brand-section">
                <div class="org-name">CAMPUS MART</div>
                <div class="org-sub">Birla Vishvakarma Mahavidyalaya • Engineering College</div>
                <div class="doc-title-badge">Platform Operations & Analytics Audit Report</div>
              </div>
              <div class="meta-section">
                <table class="meta-table">
                  <tr><td>Report ID:</td><td>${reportRef}</td></tr>
                  <tr><td>Generated:</td><td>${generatedAt}</td></tr>
                  <tr><td>Auditor:</td><td>Campus Administration</td></tr>
                </table>
                <div class="confidential-tag">CONFIDENTIAL AUDIT</div>
              </div>
            </div>

            <!-- Scope Banner -->
            <div class="scope-banner">
              <div><strong>Reporting Timeframe Scope:</strong> ${periodLabel}</div>
              <div style="font-size: 11px; color: #475569;">Birla Vishvakarma Mahavidyalaya Platform Node</div>
            </div>

            <!-- Executive Performance Matrix -->
            <div class="kpi-title-heading">Executive KPI Summary</div>
            <div class="kpi-grid">
              <div class="kpi-card blue">
                <div class="kpi-label">Total Orders</div>
                <div class="kpi-value blue">${summary.totalOrders}</div>
                <div class="kpi-sub">Placed in period</div>
              </div>
              <div class="kpi-card green">
                <div class="kpi-label">Confirmed Orders</div>
                <div class="kpi-value green">${summary.confirmedOrders}</div>
                <div class="kpi-sub">Fulfilled / active</div>
              </div>
              <div class="kpi-card amber">
                <div class="kpi-label">Pending Orders</div>
                <div class="kpi-value amber">${summary.pendingOrders}</div>
                <div class="kpi-sub">Awaiting action</div>
              </div>
              <div class="kpi-card red">
                <div class="kpi-label">Cancelled / Returned</div>
                <div class="kpi-value red">${(summary.cancelledOrders || 0) + (summary.returnedOrders || 0)}</div>
                <div class="kpi-sub">Refunded / stopped</div>
              </div>
              <div class="kpi-card blue">
                <div class="kpi-label">Gross Order Volume</div>
                <div class="kpi-value">₹${Number(summary.totalOrderVolume || 0).toFixed(2)}</div>
                <div class="kpi-sub">Transaction value</div>
              </div>
              <div class="kpi-card purple">
                <div class="kpi-label">New Users</div>
                <div class="kpi-value">${summary.totalNewUsers}</div>
                <div class="kpi-sub">Registered accounts</div>
              </div>
              <div class="kpi-card blue">
                <div class="kpi-label">Items Listed</div>
                <div class="kpi-value">${summary.totalItemsAdded}</div>
                <div class="kpi-sub">Products added</div>
              </div>
              <div class="kpi-card amber">
                <div class="kpi-label">Reports Filed</div>
                <div class="kpi-value">${summary.totalReports}</div>
                <div class="kpi-sub">Moderation tickets</div>
              </div>
            </div>

            <!-- 1. Orders Table -->
            <div class="section-block">
              <div class="section-header-row">
                <div class="section-title">1. Order Transactions Log</div>
                <div class="section-count">${orders.length} Records</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 14%;">Order Ref</th>
                    <th style="width: 24%;">Item Name</th>
                    <th style="width: 18%;">Buyer</th>
                    <th style="width: 12%;">Amount</th>
                    <th style="width: 12%;">Status</th>
                    <th style="width: 10%;">Payment</th>
                    <th style="width: 10%;">Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.length === 0 ? '<tr class="empty-row"><td colspan="7">No order transactions recorded in this period.</td></tr>' : ''}
                  ${orders.map(o => {
                    const badgeClass = ['completed', 'delivered', 'rental_active'].includes(o.status)
                      ? 'badge-green'
                      : ['pending', 'cancel_requested'].includes(o.status)
                      ? 'badge-amber'
                      : 'badge-red';
                    const orderId = String(o._id || o.id || '').slice(-6).toUpperCase();
                    const dateFormatted = o.createdAt
                      ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A';
                    return `
                      <tr>
                        <td><strong>#${orderId}</strong></td>
                        <td><strong>${o.item_name || 'Item'}</strong></td>
                        <td>${o.buyer_name || 'Buyer'}</td>
                        <td><strong>₹${Number(o.total_price || 0).toFixed(2)}</strong></td>
                        <td><span class="badge ${badgeClass}">${String(o.status || '').toUpperCase()}</span></td>
                        <td>${String(o.payment_method || 'Online').toUpperCase()}</td>
                        <td>${dateFormatted}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- 2. Products / Inventory Table -->
            <div class="section-block">
              <div class="section-header-row">
                <div class="section-title">2. Product Inventory Added</div>
                <div class="section-count">${items.length} Records</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 26%;">Product Name</th>
                    <th style="width: 18%;">Category</th>
                    <th style="width: 12%;">Listing Type</th>
                    <th style="width: 12%;">Price</th>
                    <th style="width: 18%;">Seller</th>
                    <th style="width: 14%;">Listed Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.length === 0 ? '<tr class="empty-row"><td colspan="6">No inventory items added in this period.</td></tr>' : ''}
                  ${items.map(i => {
                    const typeBadge = (i.listing_type || 'sell').toLowerCase() === 'rent' ? 'badge-purple' : 'badge-blue';
                    const dateFormatted = i.createdAt
                      ? new Date(i.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A';
                    return `
                      <tr>
                        <td><strong>${i.name || 'Product'}</strong></td>
                        <td>${i.category || 'General'}</td>
                        <td><span class="badge ${typeBadge}">${String(i.listing_type || 'SELL').toUpperCase()}</span></td>
                        <td><strong>₹${Number(i.price || 0).toFixed(2)}</strong></td>
                        <td>${i.seller || 'Student Seller'}</td>
                        <td>${dateFormatted}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- 3. Registered Users Table -->
            <div class="section-block">
              <div class="section-header-row">
                <div class="section-title">3. Newly Registered User Accounts</div>
                <div class="section-count">${users.length} Records</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 28%;">Full Name</th>
                    <th style="width: 36%;">Email Address</th>
                    <th style="width: 16%;">Account Role</th>
                    <th style="width: 20%;">Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.length === 0 ? '<tr class="empty-row"><td colspan="4">No new user registrations recorded in this period.</td></tr>' : ''}
                  ${users.map(u => {
                    const dateFormatted = u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A';
                    return `
                      <tr>
                        <td><strong>${u.full_name || 'User'}</strong></td>
                        <td>${u.email || 'N/A'}</td>
                        <td><span class="badge badge-blue">${String(u.role || 'STUDENT').toUpperCase()}</span></td>
                        <td>${dateFormatted}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- 4. Reports & Incidents Table -->
            <div class="section-block">
              <div class="section-header-row">
                <div class="section-title">4. Safety & Incident Reports</div>
                <div class="section-count">${reports.length} Records</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 14%;">Report ID</th>
                    <th style="width: 36%;">Reason / Incident Description</th>
                    <th style="width: 22%;">Reported By</th>
                    <th style="width: 14%;">Status</th>
                    <th style="width: 14%;">Logged At</th>
                  </tr>
                </thead>
                <tbody>
                  ${reports.length === 0 ? '<tr class="empty-row"><td colspan="5">No safety or incident reports filed in this period.</td></tr>' : ''}
                  ${reports.map(r => {
                    const statusClass = (r.status || 'pending').toLowerCase() === 'pending' ? 'badge-amber' : 'badge-green';
                    const repId = String(r._id || r.id || '').slice(-6).toUpperCase();
                    const dateFormatted = r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A';
                    return `
                      <tr>
                        <td><strong>#${repId}</strong></td>
                        <td>${r.reason || 'Report incident'}</td>
                        <td>${r.reporter_name || 'Student'}</td>
                        <td><span class="badge ${statusClass}">${String(r.status || 'PENDING').toUpperCase()}</span></td>
                        <td>${dateFormatted}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Official Sign-off -->
            <div class="signoff-section">
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-name">Platform Administrator</div>
                <div class="sign-title">Campus Mart Operations Desk</div>
              </div>
              <div class="sign-box" style="text-align: right;">
                <div class="sign-line"></div>
                <div class="sign-name">Birla Vishvakarma Mahavidyalaya</div>
                <div class="sign-title">Campus Resale & Rental Ecosystem Node</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="doc-footer">
              <span>Campus Mart Official Audit System • Ref: ${reportRef}</span>
              <span>Birla Vishvakarma Mahavidyalaya • Confidential Operational Document</span>
            </div>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        // Method: Open in a clean new tab and trigger print/save as PDF.
        // This isolates the document completely from the app UI, avoiding printing the website.
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (e) {
              console.error('Print window error:', e);
            }
          }, 600);
        } else {
          // Fallback if popup blocker is active: Use an isolated offscreen iframe
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.left = '-9999px';
          iframe.style.top = '-9999px';
          iframe.style.width = '1024px';
          iframe.style.height = '768px';
          iframe.style.border = '0';
          document.body.appendChild(iframe);
          const doc = iframe.contentWindow.document;
          doc.open();
          doc.write(html);
          doc.close();
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            } catch (e) {
              console.error('Print iframe error:', e);
            } finally {
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 3000);
            }
          }, 600);
        }
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
      Alert.alert('Error', 'Failed to generate PDF report.');
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

