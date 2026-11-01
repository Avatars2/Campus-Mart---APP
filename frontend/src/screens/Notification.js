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
  Image,
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

  const isSalesNotification = (notification) => {
    if (!notification) return false;
    if (notification.actionUrl?.params?.tab === 'sales') return true;
    if (notification.actionUrl?.params?.tab === 'purchases') return false;

    const subType = (notification.subType || '').toUpperCase();
    if (
      subType === 'NEW_ORDER_RECEIVED' ||
      subType === 'PAID_ORDER_RECEIVED' ||
      subType === 'RENTAL_EXTENDED' ||
      subType === 'PAYOUT_DISBURSED' ||
      subType.includes('SELLER')
    ) {
      return true;
    }

    const titleLower = (notification.title || '').toLowerCase();
    const bodyLower = (notification.body || '').toLowerCase();
    const text = `${titleLower} ${bodyLower}`;

    // Buyer-specific signals (always purchases tab)
    if (
      subType === 'PAYMENT_CONFIRMED' ||
      subType === 'PAYMENT_REVIEW' ||
      subType === 'ORDER_DELIVERED' ||
      subType === 'ORDER_CANCELLED' ||
      subType === 'ORDER_RETURNED' ||
      subType === 'ORDER_PENDING' ||
      titleLower.includes('payment confirmed') ||
      titleLower.includes('item delivered') ||
      titleLower.includes('rental started') ||
      titleLower.includes('cancellation rejected') ||
      titleLower.includes('return request declined') ||
      text.includes('seller has been notified to arrange delivery') ||
      text.includes('marked as delivered. please confirm receipt')
    ) {
      return false;
    }

    // Seller-specific signals (sales tab)
    if (
      titleLower.includes('new order') ||
      titleLower.includes('new rental request') ||
      titleLower.includes('new paid order') ||
      titleLower.includes('payout initiated') ||
      titleLower.includes('cancellation requested') ||
      titleLower.includes('return requested') ||
      titleLower.includes('rental return') ||
      text.includes('bought your item') ||
      text.includes('bought "') ||
      text.includes('requested to rent') ||
      text.includes('arrange delivery with the buyer') ||
      text.includes('arrange delivery') ||
      text.includes('arrange handover') ||
      text.includes('confirmed receipt of') ||
      text.includes('ready to return') ||
      text.includes('requested to return') ||
      text.includes('requested to cancel')
    ) {
      return true;
    }

    return false;
  };

  const isOrderNotification = (notification) => {
    if (!notification) return false;
    if (notification.type === 'ORDER') return true;
    const subType = (notification.subType || '').toUpperCase();
    if (
      subType.includes('ORDER') ||
      subType === 'RENTAL_EXTENDED' ||
      subType === 'PAYOUT_DISBURSED' ||
      subType === 'PAYMENT_CONFIRMED' ||
      subType === 'PAYMENT_REVIEW'
    ) {
      return true;
    }
    const targetScreen = notification.actionUrl?.targetScreen;
    if (
      targetScreen === 'Buy' ||
      targetScreen === 'Orders' ||
      targetScreen === 'OrderDetail' ||
      targetScreen === 'OrderDetails'
    ) {
      return true;
    }
    const text = `${notification.title || ''} ${notification.body || ''}`.toLowerCase();
    if (
      text.includes('order') ||
      text.includes('rental') ||
      text.includes('payout') ||
      text.includes('bought your item') ||
      text.includes('bought "') ||
      text.includes('payment confirmed') ||
      text.includes('item delivered') ||
      text.includes('confirmed receipt') ||
      text.includes('arrange delivery') ||
      text.includes('return request') ||
      text.includes('return confirmed')
    ) {
      return true;
    }
    return false;
  };

  const handleNotificationPress = (notification) => {
    if (!notification) return;

    if (!notification.read) {
      markAsRead(notification.id || notification._id);
    }

    // 1. Order notifications -> Navigate directly to Buy page on Purchases or Sales tab
    // (Never navigate to order details modal or NotificationDetail)
    if (isOrderNotification(notification)) {
      const isSales = isSalesNotification(notification);
      const tab = isSales ? 'sales' : 'purchases';
      navigation.navigate('MainTabs', {
        screen: 'Buy',
        params: { tab },
      });
      return;
    }

    // 2. If explicit actionUrl exists, navigate according to route target:
    if (notification.actionUrl?.targetScreen) {
      const { targetScreen, params } = notification.actionUrl;
      if (targetScreen === 'ProductDetail') {
        navigation.navigate('MainTabs', {
          screen: 'Home',
          params: { screen: 'ProductDetail', params },
        });
        return;
      }
      if (targetScreen === 'ChatThread') {
        navigation.navigate('MainTabs', {
          screen: 'Messages',
          params: { screen: 'ChatThread', params },
        });
        return;
      }
      if (targetScreen === 'BuyingRequestsGroup') {
        navigation.navigate('MainTabs', {
          screen: 'Messages',
          params: { screen: 'BuyingRequestsGroup', params },
        });
        return;
      }
      if (targetScreen === 'AdminReports') {
        navigation.navigate('AdminNavigator', { screen: 'AdminReports' });
        return;
      }
      if (targetScreen === 'MyReports') {
        navigation.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'MyReports', params },
        });
        return;
      }
      if (targetScreen === 'ReportDetails' || targetScreen === 'ReportDetail') {
        navigation.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'ReportDetails', params },
        });
        return;
      }
      if (targetScreen === 'Payment') {
        navigation.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'Payment', params },
        });
        return;
      }
    }

    // 3. Wishlist Price Drop & Restock -> ProductDetail
    if (
      notification.type === 'WISHLIST' ||
      notification.subType === 'PRICE_DROP' ||
      notification.subType === 'BACK_IN_STOCK' ||
      notification.title?.includes('Price Drop') ||
      notification.title?.includes('Back in Stock')
    ) {
      if (notification.relatedId) {
        navigation.navigate('MainTabs', {
          screen: 'Home',
          params: {
            screen: 'ProductDetail',
            params: { item: { _id: notification.relatedId, id: notification.relatedId } },
          },
        });
        return;
      }
    }

    // 4. Buying Request Offer
    if (notification.type === 'BUYING_REQUEST') {
      navigation.navigate('MainTabs', {
        screen: 'Messages',
        params: { screen: 'BuyingRequestsGroup' },
      });
      return;
    }

    // 5. Report Updates
    if (notification.type === 'REPORT') {
      const reportId =
        notification.actionUrl?.params?.reportId ||
        notification.relatedId?.toString?.() ||
        notification.relatedId;
      navigation.navigate('MainTabs', {
        screen: 'Profile',
        params: {
          screen: 'ReportDetails',
          params: { reportId },
        },
      });
      return;
    }

    // 6. Messages
    if (notification.type === 'MESSAGE') {
      navigation.navigate('MainTabs', { screen: 'Messages' });
      return;
    }

    // 7. Campus Notices & Announcements
    navigation.navigate('NotificationDetail', { notification });
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

  const getNotificationBadge = (item) => {
    const titleLower = (item.title || '').toLowerCase();
    const subType = item.subType || '';

    if (subType === 'PRICE_DROP' || titleLower.includes('price drop')) {
      return { label: 'PRICE DROP', bg: '#FEF2F2', text: '#DC2626', icon: 'flame' };
    }
    if (subType === 'BACK_IN_STOCK' || titleLower.includes('back in stock')) {
      return { label: 'RESTOCKED', bg: '#ECFDF5', text: '#059669', icon: 'cube' };
    }
    if (titleLower.includes('delivered')) {
      return { label: 'DELIVERED', bg: '#ECFDF5', text: '#059669', icon: 'checkmark-circle' };
    }
    if (titleLower.includes('refund') || titleLower.includes('returned')) {
      return { label: 'REFUNDED', bg: '#FEF2F2', text: '#DC2626', icon: 'arrow-undo' };
    }
    if (titleLower.includes('declined') || titleLower.includes('rejected')) {
      return { label: 'DECLINED', bg: '#F1F5F9', text: '#64748B', icon: 'close-circle' };
    }
    if (titleLower.includes('payout')) {
      return { label: 'PAYOUT', bg: '#ECFDF5', text: '#047857', icon: 'cash' };
    }
    if (titleLower.includes('rental started') || titleLower.includes('rental extended') || titleLower.includes('rental')) {
      return { label: 'RENTAL', bg: '#FEF3C7', text: '#D97706', icon: 'timer-outline' };
    }
    if (item.type === 'ORDER') {
      return { label: 'ORDER', bg: '#E0F2FE', text: '#0284C7', icon: 'cart' };
    }
    if (item.type === 'BUYING_REQUEST') {
      return { label: 'BUY REQUEST', bg: '#F5F3FF', text: '#7C3AED', icon: 'pricetag' };
    }
    if (item.type === 'REPORT') {
      return { label: 'REPORT', bg: '#FFF7ED', text: '#EA580C', icon: 'alert-circle' };
    }
    if (item.type === 'MESSAGE') {
      return { label: 'CHAT', bg: '#ECFEFF', text: '#0891B2', icon: 'chatbubble' };
    }
    return { label: 'CAMPUS NOTICE', bg: '#EFF6FF', text: '#2563EB', icon: 'megaphone' };
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNotificationIcon = (item, badge) => {
    if (item.thumbnail) {
      return (
        <View style={styles.thumbnailWrap}>
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardThumbnail}
            resizeMode="cover"
          />
          <View style={[styles.thumbnailBadge, { backgroundColor: badge.text }]}>
            <Ionicons name={badge.icon} size={10} color="#FFFFFF" />
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.iconCircle, { backgroundColor: badge.bg }]}>
        <Ionicons name={badge.icon} size={22} color={badge.text} />
      </View>
    );
  };

  const formatNotificationTitle = (title, badge) => {
    if (!title) return '';
    let clean = title;
    if (badge.label === 'PRICE DROP') {
      clean = clean.replace(/^[🔥\s]*price\s*drop:\s*/i, '🔥 ');
    } else if (badge.label === 'DELIVERED') {
      clean = clean.replace(/^[📦\s]*item\s*delivered:\s*/i, '📦 ');
    } else if (badge.label === 'REPORT') {
      clean = clean.replace(/^[📋\s]*report\s*/i, '📋 ');
    } else if (badge.label === 'ORDER') {
      clean = clean.replace(/^[❌\s]*order\s*cancelled:\s*/i, '❌ Cancelled: ');
    }
    return clean;
  };

  const renderItem = ({ item }) => {
    const badge = getNotificationBadge(item);
    const timeLabel = formatRelativeTime(item.createdAt);
    const isCampusNotice =
      badge.label === 'CAMPUS NOTICE' ||
      item.type === 'SYSTEM' ||
      item.subType === 'ADMIN_ANNOUNCEMENT';

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {renderNotificationIcon(item, badge)}

        <View style={styles.textContainer}>
          <View style={styles.cardTopRow}>
            <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <Text style={styles.time}>{timeLabel}</Text>
          </View>

          <Text style={[styles.title, !item.read && styles.unreadText]}>
            {formatNotificationTitle(item.title, badge)}
          </Text>

          {!isCampusNotice && (
            <>
              {Boolean(item.body) && (
                <Text style={styles.body}>
                  {item.body}
                </Text>
              )}
              {Boolean(item.attachment?.url) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <Ionicons name="document-text" size={13} color="#2563EB" />
                  <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }} numberOfLines={1}>
                    {decodeURIComponent(item.attachment.name || 'PDF Document Attached')}
                  </Text>
                </View>
              )}
            </>
          )}
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
  };

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
