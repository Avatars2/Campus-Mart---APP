import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import getPusherClient from '../../utils/pusher';
import styles from './Payment.styles';

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function Payment({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?._id;
  const [payoutMethod, setPayoutMethod] = useState('bank_account');
  const [accountStatus, setAccountStatus] = useState('not_started');
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmChangeModalVisible, setConfirmChangeModalVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'pending', 'successful'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // 5, 10, 20, 50, 100
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);
  
  const [bankDetails, setBankDetails] = useState({
    beneficiary_name: '',
    bank_account_number: '',
    ifsc_code: '',
    bank_name: '',
    branch_name: '',
  });

  const [upiId, setUpiId] = useState('');

  // IFSC Validation & Dynamic Branch Lookup States
  const [branchInfo, setBranchInfo] = useState(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);
  const [ifscError, setIfscError] = useState('');

  const loadPaymentInfo = useCallback(async () => {
    try {
      const [accountResponse, transfersResponse] = await Promise.all([
        client.get('/users/payment-account'),
        client.get('/payments/seller-transfers'),
      ]);
      const data = accountResponse.data;
      setAccountStatus(data.account_status || 'not_started');
      if (data.bank_account) {
        const ifsc = data.bank_account.ifsc_code || '';
        const bName = data.bank_account.bank_name || '';
        const branch = data.bank_account.branch_name || '';
        setBankDetails({
          beneficiary_name: data.bank_account.beneficiary_name || '',
          bank_account_number: data.bank_account.account_number || '',
          ifsc_code: ifsc,
          bank_name: bName,
          branch_name: branch,
        });
        if (ifsc) {
          setIfscVerified(true);
          setBranchInfo({
            bank: bName || 'Bank',
            branch: branch,
            ifsc: ifsc,
          });
        }
      }
      if (data.upi_id) {
        setUpiId(data.upi_id);
      }
      if (data.payout_method) {
        setPayoutMethod(data.payout_method === 'none' ? 'bank_account' : data.payout_method);
      }
      setTransfers(transfersResponse.data.transfers || []);
    } catch (error) {
      Alert.alert('Unable to load payment details', error.response?.data?.error || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentInfo();
  }, [loadPaymentInfo]);

  // Real-time listener for orders, online payment confirmations, and escrow payout updates
  useEffect(() => {
    if (!userId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channelName = `user-${userId}`;
    const channel = pusher.subscribe(channelName);

    const onPaymentUpdate = () => {
      loadPaymentInfo();
    };

    channel.bind('payment:updated', onPaymentUpdate);
    channel.bind('order:updated', onPaymentUpdate);
    channel.bind('new:notification', onPaymentUpdate);

    return () => {
      channel.unbind('payment:updated', onPaymentUpdate);
      channel.unbind('order:updated', onPaymentUpdate);
      channel.unbind('new:notification', onPaymentUpdate);
    };
  }, [userId, loadPaymentInfo]);

  // Reset to page 1 whenever history filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [historyFilter, pageSize]);

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

  // Dynamic IFSC Code Verification against Public RBI / Razorpay IFSC API
  const verifyIfscCode = async (codeToVerify) => {
    const code = String(codeToVerify || bankDetails.ifsc_code || '').trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      setIfscVerified(false);
      setIfscError('IFSC must be an 11-character code (e.g. SBIN0001234)');
      setBranchInfo(null);
      return false;
    }

    setIfscLoading(true);
    setIfscError('');
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (res.ok) {
        const data = await res.json();
        const branchStr = data.BRANCH ? `${data.BRANCH}${data.CITY ? ', ' + data.CITY : ''}` : '';
        setBranchInfo({
          bank: data.BANK || 'Bank',
          branch: branchStr,
          city: data.CITY || '',
          state: data.STATE || '',
          ifsc: data.IFSC || code,
        });
        setBankDetails((prev) => ({
          ...prev,
          ifsc_code: code,
          bank_name: data.BANK || prev.bank_name,
          branch_name: branchStr,
        }));
        setIfscVerified(true);
        setIfscError('');
        return true;
      } else {
        setIfscVerified(false);
        setIfscError('No bank branch found for this IFSC code in official RBI records.');
        setBranchInfo(null);
        return false;
      }
    } catch (err) {
      setIfscVerified(false);
      setIfscError('Unable to connect to IFSC registry. Check your connection.');
      setBranchInfo(null);
      return false;
    } finally {
      setIfscLoading(false);
    }
  };

  const handleIfscChange = (val) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setBankDetails((prev) => ({ ...prev, ifsc_code: cleaned }));
    setIfscError('');
    if (cleaned.length === 11) {
      verifyIfscCode(cleaned);
    } else {
      setIfscVerified(false);
      setBranchInfo(null);
    }
  };

  const handleSavePayoutDetails = async () => {
    if (payoutMethod === 'upi') {
      const trimmed = upiId.trim();
      if (!trimmed) {
        Alert.alert('Missing UPI ID', 'Please enter your UPI ID (VPA).');
        return;
      }
      if (!UPI_REGEX.test(trimmed)) {
        Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).');
        return;
      }
    } else {
      if (!bankDetails.beneficiary_name.trim()) {
        Alert.alert('Missing Name', 'Please enter the account holder name as in your bank passbook.');
        return;
      }
      if (!/^\d{9,18}$/.test(bankDetails.bank_account_number.trim())) {
        Alert.alert('Invalid Account Number', 'Bank account number must be between 9 and 18 digits.');
        return;
      }
      if (!ifscVerified) {
        const verified = await verifyIfscCode(bankDetails.ifsc_code);
        if (!verified) {
          Alert.alert('Invalid IFSC Code', 'Please verify your 11-character bank IFSC code before saving.');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        payout_method: payoutMethod,
        ...(payoutMethod === 'bank_account' ? bankDetails : { upi_id: upiId.trim() }),
      };
      await client.post('/users/payment-account', payload);
      setAccountStatus('activated');
      setModalVisible(false);
      loadPaymentInfo();
    } catch (error) {
      Alert.alert(
        'Unable to save payout details',
        error.response?.data?.error || error.message || 'Please check your inputs and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const hasPayoutDetails = Boolean(
    upiId || (bankDetails.bank_account_number && bankDetails.ifsc_code)
  );

  const trimmedUpi = upiId.trim();
  const isUpiValid = trimmedUpi.length > 0 && UPI_REGEX.test(trimmedUpi);
  const isUpiInvalid = trimmedUpi.length > 0 && !UPI_REGEX.test(trimmedUpi);

  const totalTransferred = (transfers
    .filter((t) => t.payout_status === 'transferred')
    .reduce((sum, t) => sum + (t.amount || 0), 0) / 100).toFixed(2);

  const pendingTransfers = (transfers
    .filter((t) => ['held', 'processing', 'review'].includes(t.payout_status))
    .reduce((sum, t) => sum + (t.amount || 0), 0) / 100).toFixed(2);

  const pendingCount = transfers.filter((t) =>
    ['held', 'processing', 'review', 'pending'].includes(t.payout_status)
  ).length;

  const successfulCount = transfers.filter((t) =>
    ['transferred', 'processed', 'completed', 'success'].includes(t.payout_status)
  ).length;

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (historyFilter === 'pending') {
        return ['held', 'processing', 'review', 'pending'].includes(t.payout_status);
      }
      if (historyFilter === 'successful') {
        return ['transferred', 'processed', 'completed', 'success'].includes(t.payout_status);
      }
      return true;
    });
  }, [transfers, historyFilter]);

  // Sliced transfers based on current page and selected page size
  const pagedTransfers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, currentPage, pageSize]);

  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case 'transferred':
        return {
          label: 'Completed',
          bg: '#ECFDF5',
          color: '#059669',
          icon: 'checkmark-circle',
        };
      case 'processing':
        return {
          label: 'Processing',
          bg: '#EFF6FF',
          color: '#2563EB',
          icon: 'time',
        };
      case 'held':
        return {
          label: 'In Escrow',
          bg: '#FFFBEB',
          color: '#D97706',
          icon: 'lock-closed',
        };
      case 'reversed':
      case 'failed':
        return {
          label: 'Failed',
          bg: '#FEF2F2',
          color: '#DC2626',
          icon: 'alert-circle',
        };
      default:
        return {
          label: 'Pending',
          bg: '#F1F5F9',
          color: '#64748B',
          icon: 'help-circle',
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination controls with Results info & Page Size dropdown on the same row
  const renderPagination = () => {
    if (filteredTransfers.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredTransfers.length);

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
            Showing {startIdx} to {endIdx} of {filteredTransfers.length} {filteredTransfers.length === 1 ? 'transfer' : 'transfers'}
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

  const handleBack = useCallback(() => {
    if (route?.params?.from === 'Sell') {
      navigation.navigate('ProfileMain');
      navigation.navigate('MainTabs', { screen: 'Sell' });
      return;
    }
    if (navigation.canGoBack() && navigation.getState()?.routes?.length > 1) {
      navigation.goBack();
    } else {
      navigation.navigate('ProfileMain');
    }
  }, [navigation, route?.params?.from]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [handleBack])
  );

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay<Text style={{ color: '#007185' }}>ment</Text></Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPaymentInfo();
            }}
          />
        )}
      >
        {/* ── Active Payout Destination Summary ── */}
        {hasPayoutDetails ? (
          <View style={styles.activeCard}>
            <View style={styles.activeCardTop}>
              <View style={styles.activeCardLeft}>
                <View style={styles.activeCardIconWrap}>
                  <Ionicons
                    name={payoutMethod === 'upi' ? 'flash' : 'business'}
                    size={22}
                    color="#007185"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeCardLabel}>
                    {payoutMethod === 'upi' ? 'Active UPI ID' : 'Active Bank Account'}
                  </Text>
                  <Text style={styles.activeCardValue} numberOfLines={2}>
                    {payoutMethod === 'upi'
                      ? upiId
                      : `${bankDetails.bank_name || 'Bank'} (•••• ${String(bankDetails.bank_account_number || '').slice(-4)})`}
                  </Text>
                  {payoutMethod === 'bank_account' && (bankDetails.branch_name || bankDetails.ifsc_code) ? (
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {bankDetails.branch_name ? `${bankDetails.branch_name} • ` : ''}IFSC: {bankDetails.ifsc_code}
                    </Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardEditBtn}
                onPress={() => setConfirmChangeModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color="#007185" />
                <Text style={styles.cardEditBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activeCardDivider} />

            <View style={styles.activeCardBottom}>
              <View style={styles.activeStatusBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeStatusText}>Payout Destination Active</Text>
              </View>
              {payoutMethod === 'bank_account' && bankDetails.beneficiary_name ? (
                <Text style={styles.beneficiaryText} numberOfLines={1}>
                  {bankDetails.beneficiary_name}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.setupCard}>
            <View style={styles.setupIconWrap}>
              <Ionicons name="wallet-outline" size={24} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.setupTitle}>Setup Payout Destination</Text>
              <Text style={styles.setupSubtitle}>Add Bank Account or UPI ID to receive online sales earnings.</Text>
            </View>
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.setupBtnText}>Setup</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Small Earnings Summary Table ── */}
        <View style={styles.summaryTable}>
          {/* Completed Earnings Row */}
          <View style={styles.summaryTableRow}>
            <View style={styles.summaryTableCellLeft}>
              <View style={[styles.summaryTableIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
              </View>
              <Text style={styles.summaryTableTitle}>Completed Earnings</Text>
            </View>
            <Text style={styles.summaryTableAmountCompleted}>₹{totalTransferred}</Text>
          </View>

          <View style={styles.summaryTableDivider} />

          {/* In Escrow Holding Row */}
          <View style={styles.summaryTableRow}>
            <View style={styles.summaryTableCellLeft}>
              <View style={[styles.summaryTableIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="lock-closed" size={16} color="#D97706" />
              </View>
              <Text style={styles.summaryTableTitle}>In Escrow Holding</Text>
            </View>
            <Text style={styles.summaryTableAmountEscrow}>₹{pendingTransfers}</Text>
          </View>
        </View>

        {/* ── History Header ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>History</Text>
          <Text style={styles.sectionHeaderCount}>
            {filteredTransfers.length} {filteredTransfers.length === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>

        {/* ── History Filter Tabs: All, Pending, Successful ── */}
        <View style={styles.historyFilterContainer}>
          <TouchableOpacity
            style={[styles.historyFilterBtn, historyFilter === 'all' && styles.historyFilterBtnActive]}
            onPress={() => setHistoryFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.historyFilterText, historyFilter === 'all' && styles.historyFilterTextActive]}>
              All ({transfers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historyFilterBtn, historyFilter === 'pending' && styles.historyFilterBtnActive]}
            onPress={() => setHistoryFilter('pending')}
            activeOpacity={0.8}
          >
            <View style={[styles.filterDot, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.historyFilterText, historyFilter === 'pending' && styles.historyFilterTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historyFilterBtn, historyFilter === 'successful' && styles.historyFilterBtnActive]}
            onPress={() => setHistoryFilter('successful')}
            activeOpacity={0.8}
          >
            <View style={[styles.filterDot, { backgroundColor: '#059669' }]} />
            <Text style={[styles.historyFilterText, historyFilter === 'successful' && styles.historyFilterTextActive]}>
              Successful ({successfulCount})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transfersCard}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#007185" size="large" />
              <Text style={styles.loadingText}>Loading settlements...</Text>
            </View>
          ) : filteredTransfers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {transfers.length === 0
                  ? 'No settlements yet'
                  : `No ${historyFilter} settlements`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {transfers.length === 0
                  ? 'When buyers purchase or rent your items, your earnings and payout confirmations will appear here.'
                  : `There are currently no ${historyFilter} transaction records.`}
              </Text>
            </View>
          ) : (
            pagedTransfers.map((transfer, index) => {
              const statusCfg = getStatusBadgeConfig(transfer.payout_status);
              const isLast = index === pagedTransfers.length - 1;

              return (
                <View
                  key={`${transfer.payment_id}-${transfer.transfer_id || transfer.payout_status}-${index}`}
                  style={[styles.transferItem, isLast && styles.transferItemLast]}
                >
                  {/* Top Row: Icon, Amount, Date & Payout Status Badge */}
                  <View style={styles.transferTopRow}>
                    <View style={styles.transferTopLeft}>
                      <View style={[styles.transferIconWrap, { backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon} size={20} color={statusCfg.color} />
                      </View>
                      <View style={styles.transferDetails}>
                        <Text style={styles.transferAmount}>
                          ₹{(transfer.amount / 100).toFixed(2)}
                        </Text>
                        <Text style={styles.transferDate}>
                          {formatDate(transfer.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.payoutBadge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.payoutBadgeText, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  {/* Items Details Section */}
                  {transfer.items && transfer.items.length > 0 ? (
                    <View style={styles.transferItemsContainer}>
                      {transfer.items.map((item, itemIdx) => (
                        <View key={item.order_id || itemIdx} style={styles.transferItemRow}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.transferItemImage} />
                          ) : (
                            <View style={styles.transferItemImagePlaceholder}>
                              <Ionicons name="cube-outline" size={20} color="#64748B" />
                            </View>
                          )}

                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.transferItemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <View style={[
                                styles.transferTypeBadge,
                                item.listing_type === 'rent' && { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1 }
                              ]}>
                                <Text style={[
                                  styles.transferTypeBadgeText,
                                  item.listing_type === 'rent' && { color: '#4F46E5', fontWeight: '700' }
                                ]}>
                                  {item.is_extension
                                    ? '⏱️ Rental Extension'
                                    : item.listing_type === 'rent'
                                      ? `⏱️ Rental (${item.rental_duration || 1} ${item.rental_period || 'day'})`
                                      : 'Sale'} • Qty: {item.quantity || 1}
                                </Text>
                              </View>
                              {item.order_status ? (
                                <Text style={styles.transferOrderStatusText}>
                                  {item.order_status.replace(/_/g, ' ')}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          {item.price ? (
                            <Text style={styles.transferItemPrice}>
                              ₹{item.price}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Buyer Details Section */}
                  {transfer.buyer && transfer.buyer.name ? (
                    <View style={styles.transferBuyerCard}>
                      <View style={styles.transferBuyerAvatar}>
                        <Text style={styles.transferBuyerAvatarText}>
                          {transfer.buyer.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.transferBuyerName} numberOfLines={1}>
                          Buyer: {transfer.buyer.name}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Transfer Reference & Delivery Info Footer */}
                  {transfer.transfer_id ? (
                    <View style={styles.transferFooter}>
                      <Ionicons name="receipt-outline" size={12} color="#94A3B8" />
                      <Text style={styles.transferRef} numberOfLines={1}>
                        Payout Ref: {transfer.transfer_id}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* ── Pagination Controls ── */}
        {renderPagination()}
      </ScrollView>

      {/* ── Change Confirmation Pop-up Modal ── */}
      <Modal
        visible={confirmChangeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmChangeModalVisible(false)}
      >
        <View style={styles.confirmModalBackdrop}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmModalIconWrap}>
              <Ionicons name="create-outline" size={30} color="#007185" />
            </View>
            <Text style={styles.confirmModalTitle}>Change Payout Details?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Are you sure you want to change your payout details?
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmChangeModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmActionBtn}
                onPress={() => {
                  setConfirmChangeModalVisible(false);
                  setModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmActionText}>Yes, Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Bank & UPI Payout Details Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Destination</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tab selector between Bank and UPI */}
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  onPress={() => setPayoutMethod('bank_account')}
                  style={[styles.tabBtn, payoutMethod === 'bank_account' && styles.tabBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnText, payoutMethod === 'bank_account' && styles.tabBtnTextActive]}>
                    Bank Account
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPayoutMethod('upi')}
                  style={[styles.tabBtn, payoutMethod === 'upi' && styles.tabBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnText, payoutMethod === 'upi' && styles.tabBtnTextActive]}>
                    UPI ID (Fast)
                  </Text>
                </TouchableOpacity>
              </View>

              {payoutMethod === 'bank_account' ? (
                <View>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Account Holder Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={bankDetails.beneficiary_name}
                        onChangeText={(val) => setBankDetails((prev) => ({ ...prev, beneficiary_name: val }))}
                        placeholder="Full name as in bank passbook"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Bank Account Number</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={bankDetails.bank_account_number}
                        onChangeText={(val) => setBankDetails((prev) => ({ ...prev, bank_account_number: val }))}
                        placeholder="Enter account number (9 to 18 digits)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.label}>IFSC Code</Text>
                      {ifscVerified && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="shield-checkmark" size={14} color="#059669" />
                          <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>Branch Verified</Text>
                        </View>
                      )}
                    </View>

                    <View style={[
                      styles.inputWrapper,
                      ifscVerified && styles.inputWrapperValid,
                      Boolean(ifscError) && styles.inputWrapperError
                    ]}>
                      <TextInput
                        style={styles.input}
                        value={bankDetails.ifsc_code}
                        onChangeText={handleIfscChange}
                        placeholder="e.g. SBIN0001234"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        maxLength={11}
                      />
                      {ifscLoading ? (
                        <ActivityIndicator size="small" color="#007185" style={{ marginLeft: 8 }} />
                      ) : bankDetails.ifsc_code.length === 11 && !ifscVerified ? (
                        <TouchableOpacity
                          style={styles.ifscVerifyBtn}
                          onPress={() => verifyIfscCode(bankDetails.ifsc_code)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.ifscVerifyBtnText}>Verify</Text>
                        </TouchableOpacity>
                      ) : ifscVerified ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      ) : null}
                    </View>

                    {ifscLoading && (
                      <View style={styles.inputFeedbackRow}>
                        <ActivityIndicator size="small" color="#007185" />
                        <Text style={{ fontSize: 12, color: '#007185' }}>Verifying branch with RBI registry...</Text>
                      </View>
                    )}

                    {Boolean(ifscError) && (
                      <View style={styles.inputFeedbackRow}>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.inputFeedbackError}>{ifscError}</Text>
                      </View>
                    )}

                    {ifscVerified && branchInfo && (
                      <View style={styles.verifiedBranchCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="business" size={16} color="#15803D" />
                          <Text style={styles.verifiedBranchTitle}>Verified Bank Branch</Text>
                        </View>
                        <Text style={styles.verifiedBranchBank}>{branchInfo.bank}</Text>
                        <Text style={styles.verifiedBranchText}>
                          {branchInfo.branch} {branchInfo.state ? `(${branchInfo.state})` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Bank Name (Auto-filled / Optional)</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={bankDetails.bank_name}
                        onChangeText={(val) => setBankDetails((prev) => ({ ...prev, bank_name: val }))}
                        placeholder="e.g. State Bank of India"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.label}>UPI ID / VPA</Text>
                      {isUpiValid && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="checkmark-circle" size={14} color="#059669" />
                          <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>Valid UPI Format</Text>
                        </View>
                      )}
                    </View>

                    <View style={[
                      styles.inputWrapper,
                      isUpiValid && styles.inputWrapperValid,
                      isUpiInvalid && styles.inputWrapperError
                    ]}>
                      <TextInput
                        style={styles.input}
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                      />
                      {isUpiValid ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      ) : isUpiInvalid ? (
                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                      ) : null}
                    </View>

                    {isUpiValid ? (
                      <View style={styles.inputFeedbackRow}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={styles.inputFeedbackValid}>Valid UPI ID format</Text>
                      </View>
                    ) : isUpiInvalid ? (
                      <View style={styles.inputFeedbackRow}>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.inputFeedbackError}>
                          Invalid UPI format. Format must be username@bank (e.g. name@okhdfcbank).
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        Supports GPay, PhonePe, Paytm, BHIM, Cred, or any Indian banking UPI handle.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.verifiedMessage}>
                <Ionicons
                  name={accountStatus === 'activated' ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={accountStatus === 'activated' ? '#059669' : '#B45309'}
                />
                <Text style={styles.verifiedMessageText}>
                  {accountStatus === 'activated' ? 'Payout Destination Active' : 'Setup Required to Receive Payments'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, saving && { opacity: 0.65 }]}
                onPress={handleSavePayoutDetails}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>
                    {accountStatus === 'activated' ? 'Update Payout Details' : 'Save Payout Details'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    </View>
  );
}
