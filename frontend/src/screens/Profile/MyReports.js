import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import ReportModal from '../../components/ReportModal';
import styles from './MyReports.styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending', dotColor: '#F59E0B' },
  { id: 'resolved', label: 'Resolved', dotColor: '#10B981' },
  { id: 'dismissed', label: 'Dismissed', dotColor: '#6B7280' },
];

export default function MyReports({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'resolved', 'dismissed'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // 5, 10, 20, 50, 100
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  useEffect(() => {
    fetchReports();
  }, []);

  // Reset to page 1 whenever active filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, pageSize]);

  const fetchReports = async () => {
    try {
      const res = await client.get('/reports/my-reports');
      setReports(res.data || []);
    } catch (error) {
      console.error('Error fetching my reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return '#10B981'; // Green
      case 'dismissed':
        return '#6B7280'; // Gray
      case 'pending':
      case 'reviewed':
      default:
        return '#F59E0B'; // Orange
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return 'checkmark-circle';
      case 'dismissed':
        return 'close-circle';
      case 'pending':
      case 'reviewed':
      default:
        return 'time';
    }
  };

  // Status counts for filter chips
  const pendingCount = useMemo(
    () => reports.filter((r) => r.status === 'pending' || r.status === 'reviewed').length,
    [reports]
  );
  const resolvedCount = useMemo(
    () => reports.filter((r) => r.status === 'resolved').length,
    [reports]
  );
  const dismissedCount = useMemo(
    () => reports.filter((r) => r.status === 'dismissed').length,
    [reports]
  );

  const getFilterCount = (id) => {
    switch (id) {
      case 'pending':
        return pendingCount;
      case 'resolved':
        return resolvedCount;
      case 'dismissed':
        return dismissedCount;
      default:
        return reports.length;
    }
  };

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (activeFilter === 'pending') {
        return r.status === 'pending' || r.status === 'reviewed';
      }
      if (activeFilter === 'resolved') {
        return r.status === 'resolved';
      }
      if (activeFilter === 'dismissed') {
        return r.status === 'dismissed';
      }
      return true;
    });
  }, [reports, activeFilter]);

  // Paged reports based on current page and selected page size
  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const renderItem = ({ item }) => {
    const targetName =
      item.target_info?.full_name ||
      item.target_info?.name ||
      (item.target_type === 'item' ? 'Deleted Listing' : 'Deleted User');

    const statusLabel =
      item.status === 'reviewed'
        ? 'Under Review'
        : item.status.charAt(0).toUpperCase() + item.status.slice(1);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ReportDetails', { report: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeRow}>
            <Ionicons
              name={item.target_type === 'item' ? 'cube' : 'person'}
              size={16}
              color={item.target_type === 'item' ? '#8B5CF6' : '#EC4899'}
            />
            <Text style={[styles.typeText, { color: '#4B5563', fontWeight: '600' }]}>
              Reported {item.target_type === 'item' ? 'Listing' : 'User'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '18' },
            ]}
          >
            <Ionicons
              name={getStatusIcon(item.status)}
              size={12}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: '#111827',
            marginTop: 2,
            marginBottom: 8,
          }}
        >
          {targetName}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 3,
              height: 14,
              backgroundColor: '#DC2626',
              borderRadius: 2,
              marginRight: 8,
            }}
          />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626' }}>
            {item.reason}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  // Pagination controls with Results info & Page Size dropdown on the same row
  const renderPagination = () => {
    if (filteredReports.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredReports.length);

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
            Showing {startIdx} to {endIdx} of {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
          </Text>

          <TouchableOpacity
            ref={dropdownBtnRef}
            style={[styles.pageSizeDropdownBtn, dropdownVisible && styles.pageSizeDropdownBtnActive]}
            onPress={toggleDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.pageSizeDropdownText}>Page: {pageSize}</Text>
            <Ionicons
              name={dropdownVisible ? "chevron-up" : "chevron-down"}
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007185" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Re<Text style={{ color: '#007185' }}>ports</Text>
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setReportModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={24} color="#007185" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter.id;
            const count = getFilterCount(filter.id);
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.id)}
                activeOpacity={0.8}
              >
                {filter.dotColor && (
                  <View
                    style={[styles.filterDot, { backgroundColor: filter.dotColor }]}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Reports List */}
      <FlatList
        data={pagedReports}
        renderItem={renderItem}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchReports();
            }}
            colors={['#007185']}
          />
        }
        ListFooterComponent={renderPagination}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>
              {reports.length === 0
                ? "You haven't submitted any reports."
                : `No ${activeFilter} reports.`}
            </Text>
            <Text style={styles.emptySubText}>
              {reports.length === 0
                ? 'Help keep Campus Mart safe by reporting suspicious activity.'
                : `There are currently no reports with status "${activeFilter}".`}
            </Text>
            {reports.length === 0 && (
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#007185',
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  gap: 6,
                }}
                onPress={() => setReportModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Submit a Report
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* ── Anchored Page Size Dropdown Modal (Opens right at the Page button) ── */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="none"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
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

      {/* ── Submit Report Modal ── */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType="user"
        allowSelectUser={true}
        onReportSubmitted={fetchReports}
      />
    </View>
  );
}
