import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Linking,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import getPusherClient from '../../../utils/pusher';
import { openAttachment } from '../../../utils/attachmentHelper';
import styles from './styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function AdminNotificationsScreen({ route }) {
  const [notifications, setNotifications] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL_TABS'); // 'ALL_TABS', 'ALL', 'SPECIFIC'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  // Sync deletion if passed back through route params
  useEffect(() => {
    if (route?.params?.deletedId) {
      const targetId = route.params.deletedId;
      setNotifications((prev) => {
        const updated = prev.filter((n) => (n.id || n._id) !== targetId);
        filterNotifications(updated, searchQuery, activeTab);
        return updated;
      });
    }
  }, [route?.params?.deletedId]);

  // Delete Confirmation Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigation = useNavigation();

  const fetchNotifications = async () => {
    try {
      const response = await client.get('/admin/notifications');
      const list = response.data?.notifications || [];
      setNotifications(list);
      filterNotifications(list, searchQuery, activeTab);
    } catch (error) {
      console.error('Failed to fetch admin notifications:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  // Real-time synchronization for Admin Broadcast Notifications
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe('admin-channel');

    const handleNotifChange = () => {
      fetchNotifications();
    };

    channel.bind('notification:new', handleNotifChange);
    channel.bind('notification:deleted', handleNotifChange);

    return () => {
      channel.unbind('notification:new', handleNotifChange);
      channel.unbind('notification:deleted', handleNotifChange);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const filterNotifications = (list, query, tab) => {
    let result = list;
    if (tab === 'ALL') {
      result = result.filter((n) => n.targetType === 'ALL');
    } else if (tab === 'SPECIFIC') {
      result = result.filter((n) => n.targetType === 'SPECIFIC');
    }

    if (query.trim()) {
      const lower = query.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(lower) ||
          n.body?.toLowerCase().includes(lower) ||
          n.targetUser?.full_name?.toLowerCase().includes(lower)
      );
    }
    setFilteredList(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(1);
    filterNotifications(notifications, text, activeTab);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    filterNotifications(notifications, searchQuery, tab);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredList.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredList.length, pageSize, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

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

  const renderPagination = () => {
    if (filteredList.length === 0) return null;

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredList.length);

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
            Showing {startIdx} to {endIdx} of {filteredList.length} notifications
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

  const handleOpenPdf = async (attachment) => {
    if (!attachment?.url && typeof attachment !== 'string') return;
    const fileObj = typeof attachment === 'string'
      ? { url: attachment, name: 'document.pdf' }
      : attachment;
    await openAttachment(fileObj);
  };

  const promptDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    const targetId = itemToDelete.id || itemToDelete._id;

    try {
      await client.delete(`/admin/notifications/${targetId}`);
      const updated = notifications.filter((n) => (n.id || n._id) !== targetId);
      setNotifications(updated);
      filterNotifications(updated, searchQuery, activeTab);
      setDeleteModalVisible(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to delete notification.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderItem = ({ item }) => {
    const isAll = item.targetType === 'ALL';
    const hasPdf = Boolean(item.attachment?.url);
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.tableRowCard}
        onPress={() => {
          navigation.navigate('AdminNotificationDetail', {
            notification: item,
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.tableRowLeft}>
          <View
            style={[
              styles.tableIconWrap,
              isAll ? styles.tableIconWrapAll : styles.tableIconWrapSpecific,
            ]}
          >
            <Ionicons
              name={isAll ? 'megaphone' : 'person'}
              size={18}
              color={isAll ? '#007185' : '#7C3AED'}
            />
          </View>
          <View style={styles.tableInfoCol}>
            <View style={styles.tableTopRow}>
              <View
                style={[
                  styles.audienceBadge,
                  isAll ? styles.audienceBadgeAll : styles.audienceBadgeSpecific,
                ]}
              >
                <Ionicons
                  name={isAll ? 'people' : 'person'}
                  size={11}
                  color={isAll ? '#007185' : '#7C3AED'}
                />
                <Text
                  style={isAll ? styles.audienceTextAll : styles.audienceTextSpecific}
                  numberOfLines={1}
                >
                  {isAll
                    ? `All Students (${item.recipientCount || 'All'})`
                    : `Student: ${item.targetUser?.full_name || 'Individual'}`}
                </Text>
              </View>
              {hasPdf && (
                <View style={styles.tablePdfBadge}>
                  <Ionicons name="document-attach" size={11} color="#DC2626" />
                  <Text style={styles.tablePdfBadgeText}>PDF</Text>
                </View>
              )}
              <Text style={styles.cardDate}>{dateStr}</Text>
            </View>

            <Text style={styles.tableTitleText} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        </View>

        <View style={styles.tableRowRight}>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications Hub</Text>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.navigate('AdminCreateNotification')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Overlapping Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications, announcements..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
        {Boolean(searchQuery) && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          data={[
            { id: 'ALL_TABS', label: 'All' },
            { id: 'ALL', label: '📢 Broadcasts' },
            { id: 'SPECIFIC', label: '👤 Specific Students' },
          ]}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === item.id && styles.tabBtnActive]}
              onPress={() => handleTabChange(item.id)}
            >
              <Text
                style={[styles.tabText, activeTab === item.id && styles.tabTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List / Loader */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007185" />
        </View>
      ) : (
        <FlatList
          data={pagedList}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007185']} />
          }
          ListFooterComponent={renderPagination}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={54} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Notifications Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No notifications match your search.'
                  : 'You have not sent any notifications yet. Tap + to create one.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Compose Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminCreateNotification')}
        activeOpacity={0.85}
      >
        <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
        <Text style={styles.fabText}>New Notification</Text>
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteModalVisible(false);
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#DC2626" />
            </View>
            <Text style={styles.confirmModalTitle}>Delete Notification</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to permanently delete "{itemToDelete?.title}"?
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={confirmDelete}
                disabled={deleting}
                activeOpacity={0.7}
              >
                {deleting ? (
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
