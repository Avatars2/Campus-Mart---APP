import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import styles from './Notification.styles';
import { useNotifications } from '../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const Notification = () => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const navigation = useNavigation();

  // Delete Confirmation State
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isClearAll, setIsClearAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // 5, 10, 20, 50, 100
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(titleSlideAnim, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  // Reset to page 1 whenever page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Ensure current page does not exceed total pages after deletions
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(notifications.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [notifications.length, pageSize, currentPage]);

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

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id || notification._id);
    }

    // Navigation based on type
    if (notification.type === 'MESSAGE' && notification.relatedId) {
      navigation.navigate('Chat', { conversationId: notification.relatedId });
    } else if (notification.type === 'ORDER' && notification.relatedId) {
      navigation.navigate('NotificationDetail', { notification });
    } else if (notification.type === 'SYSTEM') {
      navigation.navigate('NotificationDetail', { notification });
    }
  };

  const promptDeleteOne = (item) => {
    setIsClearAll(false);
    setItemToDelete(item);
    setConfirmModalVisible(true);
  };

  const promptClearAll = () => {
    setIsClearAll(true);
    setItemToDelete(null);
    setConfirmModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (isClearAll) {
        if (clearAllNotifications) {
          await clearAllNotifications();
        }
      } else if (itemToDelete) {
        const notifId = itemToDelete.id || itemToDelete._id;
        if (deleteNotification) {
          await deleteNotification(notifId);
        }
      }
      setConfirmModalVisible(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Delete notification failed:', error);
      Alert.alert('Error', 'Failed to delete notification.');
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {item.type === 'MESSAGE' && <Ionicons name="chatbubble-outline" size={24} color="#007185" />}
        {item.type === 'ORDER' && <Ionicons name="cart-outline" size={24} color="#007185" />}
        {item.type === 'SYSTEM' && <Ionicons name="megaphone-outline" size={24} color="#2563EB" />}
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        {Boolean(item.attachment?.url) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <Ionicons name="document-text" size={13} color="#2563EB" />
            <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }} numberOfLines={1}>
              {decodeURIComponent(item.attachment.name || 'PDF Document Attached')}
            </Text>
          </View>
        )}
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>

      <View style={styles.actionColumn}>
        {!item.read && <View style={styles.unreadDot} />}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            promptDeleteOne(item);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Sliced notifications based on current page and selected page size
  const pagedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return notifications.slice(start, start + pageSize);
  }, [notifications, currentPage, pageSize]);

  // Pagination controls with Results info & Page Size dropdown on the same row
  const renderPagination = () => {
    if (notifications.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(notifications.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, notifications.length);

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
            Showing {startIdx} to {endIdx} of {notifications.length} notifications
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Animated.Text
          style={[styles.headerTitle, { opacity: titleFadeAnim, transform: [{ translateY: titleSlideAnim }] }]}
        >
          Notifi<Text style={{ color: '#007185' }}>cations</Text>
        </Animated.Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={promptClearAll}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={pagedNotifications}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={renderPagination}
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        transparent
        visible={confirmModalVisible}
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setConfirmModalVisible(false);
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#DC2626" />
            </View>
            <Text style={styles.confirmModalTitle}>
              {isClearAll ? 'Clear All Notifications' : 'Delete Notification'}
            </Text>
            <Text style={styles.confirmModalMessage}>
              {isClearAll
                ? 'Are you sure you want to permanently clear all notifications?'
                : `Are you sure you want to delete "${itemToDelete?.title || 'this notification'}"?`}
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleConfirmDelete}
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
};

export default Notification;
