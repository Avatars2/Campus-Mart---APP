import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';
import getPusherClient from '../../../utils/pusher';
import styles from './styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function AdminReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  // Manage Reasons Modal State
  const [reasonsModalVisible, setReasonsModalVisible] = useState(false);
  const [adminReasons, setAdminReasons] = useState([]);
  const [reasonsLoading, setReasonsLoading] = useState(false);
  const [newReasonTitle, setNewReasonTitle] = useState('');
  const [submittingReason, setSubmittingReason] = useState(false);

  // Custom Delete Confirmation Popup State
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  // Real-time synchronization for new and updated reports
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe('admin-channel');

    const handleReportChange = () => {
      fetchReports();
    };

    channel.bind('report:new', handleReportChange);
    channel.bind('report:updated', handleReportChange);

    return () => {
      channel.unbind('report:new', handleReportChange);
      channel.unbind('report:updated', handleReportChange);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const response = await client.get('/admin/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching admin reports:', error);
      Alert.alert('Error', 'Failed to load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const fetchAdminReasons = async () => {
    setReasonsLoading(true);
    try {
      const response = await client.get('/admin/report-reasons');
      setAdminReasons(response.data || []);
    } catch (error) {
      console.log('Error fetching admin report reasons:', error);
      try {
        const fallbackRes = await client.get('/report-reasons');
        setAdminReasons(fallbackRes.data || []);
      } catch (fallbackErr) {
        if (Platform.OS === 'web') {
          window.alert('Failed to load report reasons.');
        } else {
          Alert.alert('Error', 'Failed to load report reasons.');
        }
      }
    } finally {
      setReasonsLoading(false);
    }
  };

  const openReasonsModal = () => {
    setReasonsModalVisible(true);
    fetchAdminReasons();
  };

  const handleAddReason = async () => {
    if (!newReasonTitle.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a report reason title.');
      } else {
        Alert.alert('Validation Error', 'Please enter a report reason title.');
      }
      return;
    }

    setSubmittingReason(true);
    try {
      const res = await client.post('/admin/report-reasons', {
        title: newReasonTitle.trim(),
      });

      const created = res.data?.reason || res.data;
      setAdminReasons(prev => [created, ...prev]);
      setNewReasonTitle('');
    } catch (error) {
      console.error('Error creating report reason:', error);
      const errMsg = error.response?.data?.error || 'Failed to add report reason.';
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setSubmittingReason(false);
    }
  };

  const onRequestDelete = (item) => {
    setReasonToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteReason = async () => {
    if (!reasonToDelete) return;
    const reasonId = reasonToDelete._id || reasonToDelete.id;

    setIsDeleting(true);
    // Optimistically update list immediately
    setAdminReasons(prev => prev.filter(r => (r._id || r.id) !== reasonId));
    setDeleteConfirmVisible(false);

    try {
      await client.delete(`/admin/report-reasons/${reasonId}`);
      setReasonToDelete(null);
    } catch (error) {
      console.error('Admin delete error, trying fallback:', error);
      try {
        await client.delete(`/report-reasons/${reasonId}`);
        setReasonToDelete(null);
      } catch (err2) {
        console.error('Delete failed:', err2);
        fetchAdminReasons();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset to page 1 whenever filter, search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, pageSize]);

  // Counts
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  // Filtered list
  const filteredReports = useMemo(() => {
    let list = reports;
    if (activeTab !== 'All') {
      list = list.filter(r => r.status === activeTab.toLowerCase());
    }
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.reason?.toLowerCase().includes(lowerQuery) ||
        r.target_info?.name?.toLowerCase().includes(lowerQuery) ||
        r.target_info?.full_name?.toLowerCase().includes(lowerQuery) ||
        r.reporter_id?.full_name?.toLowerCase().includes(lowerQuery)
      );
    }
    return list;
  }, [reports, activeTab, searchQuery]);

  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredReports.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredReports.length, pageSize, currentPage]);

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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return { bg: '#FFF7ED', text: '#D97706', icon: 'time', label: 'PENDING' };
      case 'resolved': return { bg: '#ECFDF5', text: '#059669', icon: 'checkmark-circle', label: 'RESOLVED' };
      case 'dismissed': return { bg: '#F3F4F6', text: '#6B7280', icon: 'link-outline', label: 'DISMISSED' };
      default: return { bg: '#F3F4F6', text: '#6B7280', icon: 'help-circle', label: status.toUpperCase() };
    }
  };

  const getReasonIcon = (reason) => {
    const lower = (reason || '').toLowerCase();
    if (lower.includes('spam')) return 'megaphone';
    if (lower.includes('scam') || lower.includes('fraud')) return 'alert-circle';
    if (lower.includes('inappropriate')) return 'person-remove';
    return 'flag';
  };

  const getReasonIconColor = (reason) => {
    const lower = (reason || '').toLowerCase();
    if (lower.includes('spam')) return '#EF4444';
    if (lower.includes('scam') || lower.includes('fraud')) return '#EF4444';
    if (lower.includes('inappropriate')) return '#F59E0B';
    return '#3B82F6';
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const targetName = item.target_info?.name || item.target_info?.full_name || 'Unknown Target';
    const reporterName = item.reporter_id?.full_name || 'Unknown User';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('AdminReportDetail', { 
          report: item,
          onStatusUpdate: () => fetchReports()
        })}
        activeOpacity={0.7}
      >
        {/* Card Top: Icon + Status + Date */}
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.reasonIconWrapper, { backgroundColor: getReasonIconColor(item.reason) + '15' }]}>
              <Ionicons name={getReasonIcon(item.reason)} size={20} color={getReasonIconColor(item.reason)} />
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
              <Text style={[styles.statusChipText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</Text>
          </View>
        </View>

        {/* Reason Title */}
        <Text style={styles.reasonText}>{item.reason}</Text>

        {/* Reporter Info */}
        <Text style={styles.reporterText}>
          Reported  <Text style={{ fontWeight: '700', color: '#111827' }}>{targetName}</Text>  by  <Text style={{ fontWeight: '600' }}>{reporterName}</Text>
        </Text>

        {/* View Report Link */}
        <TouchableOpacity 
          style={styles.viewReportBtn}
          onPress={() => navigation.navigate('AdminReportDetail', { 
            report: item,
            onStatusUpdate: () => fetchReports()
          })}
        >
          <Text style={styles.viewReportText}>View Report</Text>
          <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (filteredReports.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredReports.length);

    // Basic pagination pages to display
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
            Showing {startIdx} to {endIdx} of {filteredReports.length} reports
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
                style={[styles.pageNumBtn, currentPage === p && styles.pageNumBtnActive]}
                onPress={() => setCurrentPage(p)}
              >
                <Text style={[styles.pageNumText, currentPage === p && styles.pageNumTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007185" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Management</Text>
        <TouchableOpacity 
          style={styles.headerAddBtn} 
          onPress={openReasonsModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>


      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by reason, seller, reporter..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pill Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'All' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('All')}
          >
            {activeTab === 'All' && <Ionicons name="grid" size={14} color="#FFFFFF" />}
            <Text style={[styles.tabText, activeTab === 'All' && styles.tabTextActive]}>
              All ({reports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Pending' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('Pending')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Pending' ? '#FFFFFF' : '#F59E0B' }]} />
            <Text style={[styles.tabText, activeTab === 'Pending' && styles.tabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Resolved' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('Resolved')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Resolved' ? '#FFFFFF' : '#10B981' }]} />
            <Text style={[styles.tabText, activeTab === 'Resolved' && styles.tabTextActive]}>
              Resolved ({resolvedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Dismissed' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('Dismissed')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Dismissed' ? '#FFFFFF' : '#6B7280' }]} />
            <Text style={[styles.tabText, activeTab === 'Dismissed' && styles.tabTextActive]}>
              Dismissed ({dismissedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Reports List */}
      <FlatList
        data={pagedReports}
        renderItem={renderItem}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007185']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No reports found.</Text>
            <Text style={styles.emptySubText}>All clear!</Text>
          </View>
        }
        ListFooterComponent={renderPagination}
      />

      {/* Manage Reasons Modal */}
      <Modal
        visible={reasonsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReasonsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="settings-outline" size={20} color="#007185" />
                <Text style={styles.modalTitle}>Report Reasons</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReasonsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Add New Reason Form */}
              <View style={styles.addSectionCard}>
                <Text style={styles.formLabel}>Add New Report Reason</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Enter reason (e.g. Inappropriate Behavior)..."
                    placeholderTextColor="#94A3B8"
                    value={newReasonTitle}
                    onChangeText={setNewReasonTitle}
                    editable={!submittingReason}
                  />
                  <TouchableOpacity
                    style={[
                      styles.submitReasonBtn,
                      { paddingHorizontal: 16, height: 44 },
                      (!newReasonTitle.trim() || submittingReason) && styles.submitReasonBtnDisabled
                    ]}
                    onPress={handleAddReason}
                    disabled={!newReasonTitle.trim() || submittingReason}
                  >
                    {submittingReason ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.submitReasonBtnText}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Active Reasons List */}
              <View style={styles.listHeaderRow}>
                <Text style={styles.listSectionTitle}>Existing Reasons</Text>
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{adminReasons.length}</Text>
                </View>
              </View>

              {reasonsLoading ? (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color="#007185" />
                </View>
              ) : adminReasons.length === 0 ? (
                <View style={styles.emptyReasonsBox}>
                  <Ionicons name="list-outline" size={32} color="#CBD5E1" />
                  <Text style={styles.emptyReasonsText}>No report reasons configured yet.</Text>
                </View>
              ) : (
                <View style={styles.reasonsScrollList}>
                  {adminReasons.map((item) => {
                    const reasonId = item._id || item.id;
                    return (
                      <View key={reasonId} style={styles.reasonRow}>
                        <View style={styles.reasonLeft}>
                          <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                          <Text style={styles.reasonTitleText} numberOfLines={2}>
                            {item.title}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteReasonBtn}
                          onPress={() => onRequestDelete(item)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Mobile-Style Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!isDeleting) {
            setDeleteConfirmVisible(false);
            setReasonToDelete(null);
          }
        }}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash" size={28} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Delete Report Reason</Text>
            
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete{' '}
              <Text style={styles.confirmReasonHighlight}>
                "{reasonToDelete?.title}"
              </Text>
              ? Students will no longer see this reason option.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setReasonToDelete(null);
                }}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={confirmDeleteReason}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
