import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import client from '../../api/client';
import styles from './Payment.styles';

export default function Payment({ navigation }) {
  const [payoutMethod, setPayoutMethod] = useState('bank_account');
  const [accountStatus, setAccountStatus] = useState('not_started');
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [bankDetails, setBankDetails] = useState({
    beneficiary_name: '',
    bank_account_number: '',
    ifsc_code: '',
    bank_name: '',
  });

  const [upiId, setUpiId] = useState('');

  const loadPaymentInfo = useCallback(async () => {
    try {
      const [accountResponse, transfersResponse] = await Promise.all([
        client.get('/users/payment-account'),
        client.get('/payments/seller-transfers'),
      ]);
      const data = accountResponse.data;
      setAccountStatus(data.account_status || 'not_started');
      if (data.bank_account) {
        setBankDetails({
          beneficiary_name: data.bank_account.beneficiary_name || '',
          bank_account_number: data.bank_account.account_number || '',
          ifsc_code: data.bank_account.ifsc_code || '',
          bank_name: data.bank_account.bank_name || '',
        });
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

  const handleSavePayoutDetails = async () => {
    setSaving(true);
    try {
      const payload = {
        payout_method: payoutMethod,
        ...(payoutMethod === 'bank_account' ? bankDetails : { upi_id: upiId }),
      };
      const response = await client.post('/users/payment-account', payload);
      setAccountStatus('activated');
      Alert.alert('Success', response.data.message || 'Payout details saved successfully!');
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

  const totalTransferred = (transfers
    .filter((t) => t.payout_status === 'transferred')
    .reduce((sum, t) => sum + (t.amount || 0), 0) / 100).toFixed(2);

  const pendingTransfers = (transfers
    .filter((t) => ['held', 'processing', 'review'].includes(t.payout_status))
    .reduce((sum, t) => sum + (t.amount || 0), 0) / 100).toFixed(2);

  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case 'transferred':
        return {
          label: 'Transferred',
          color: '#059669',
          bg: '#ECFDF5',
          icon: 'checkmark-circle',
        };
      case 'held':
        return {
          label: 'Held in Escrow',
          color: '#D97706',
          bg: '#FFFBEB',
          icon: 'shield-checkmark',
        };
      case 'processing':
        return {
          label: 'Processing',
          color: '#2563EB',
          bg: '#EFF6FF',
          icon: 'sync-outline',
        };
      case 'review':
        return {
          label: 'Under Review',
          color: '#7C3AED',
          bg: '#F5F3FF',
          icon: 'eye-outline',
        };
      case 'failed':
        return {
          label: 'Failed',
          color: '#DC2626',
          bg: '#FEF2F2',
          icon: 'alert-circle',
        };
      default:
        return {
          label: status.replace(/_/g, ' '),
          color: '#64748B',
          bg: '#F1F5F9',
          icon: 'ellipse',
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

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
        </View>

        {/* Top-Right Button to View / Edit Bank & UPI Details */}
        <TouchableOpacity
          style={styles.headerRightButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="card-outline" size={16} color="#007185" />
          <Text style={styles.headerRightButtonText}>Account</Text>
        </TouchableOpacity>
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
                  <Text style={styles.activeCardValue} numberOfLines={1}>
                    {payoutMethod === 'upi'
                      ? upiId
                      : `${bankDetails.bank_name || 'Bank'} (•••• ${String(bankDetails.bank_account_number || '').slice(-4)})`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardEditBtn}
                onPress={() => setModalVisible(true)}
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
              <Text style={styles.setupBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Earnings Overview Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Received</Text>
            <Text style={[styles.statAmount, { color: '#059669' }]}>₹{totalTransferred}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>In Escrow / Pending</Text>
            <Text style={[styles.statAmount, { color: '#D97706' }]}>₹{pendingTransfers}</Text>
          </View>
        </View>

        {/* ── Transfer / Payment Details History (Full Page) ── */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Payment History</Text>
            <View style={styles.historyCountBadge}>
              <Text style={styles.historyCountText}>{transfers.length} transfers</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#007185" />
            </View>
          ) : transfers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
              </View>
              <Text style={styles.emptyStateTitle}>No Payment History</Text>
              <Text style={styles.emptyStateSubtitle}>
                Payouts from online purchases will appear here once items are delivered and confirmed.
              </Text>
            </View>
          ) : (
            transfers.map((transfer, index) => {
              const statusCfg = getStatusBadgeConfig(transfer.payout_status);
              const isLast = index === transfers.length - 1;

              return (
                <View
                  key={`${transfer.payment_id}-${transfer.transfer_id || transfer.payout_status}-${index}`}
                  style={[styles.transferItem, isLast && styles.transferItemLast]}
                >
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
                    {transfer.transfer_id ? (
                      <Text style={styles.transferRef} numberOfLines={1}>
                        Ref: {transfer.transfer_id}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.payoutBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.payoutBadgeText, { color: statusCfg.color }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

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
                        placeholder="Enter account number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>IFSC Code</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={bankDetails.ifsc_code}
                        onChangeText={(val) => setBankDetails((prev) => ({ ...prev, ifsc_code: val.toUpperCase() }))}
                        placeholder="e.g. SBIN0001234"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        maxLength={11}
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Bank Name (Optional)</Text>
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
                    <Text style={styles.label}>UPI ID / VPA</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                      />
                    </View>
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
    </View>
  );
}
