import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import styles from './Notification.styles';
import { useNotifications } from '../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
          data={notifications}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
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
    </View>
  );
};

export default Notification;
