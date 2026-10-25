import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import { openAttachment } from '../../../utils/attachmentHelper';
import styles from './styles';

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL_TABS'); // 'ALL_TABS', 'ALL', 'SPECIFIC'

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
    filterNotifications(notifications, text, activeTab);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    filterNotifications(notifications, searchQuery, tab);
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.audienceBadge,
              isAll ? styles.audienceBadgeAll : styles.audienceBadgeSpecific,
            ]}
          >
            <Ionicons
              name={isAll ? 'people' : 'person'}
              size={12}
              color={isAll ? '#2563EB' : '#7C3AED'}
            />
            <Text style={isAll ? styles.audienceTextAll : styles.audienceTextSpecific}>
              {isAll
                ? `All Students (${item.recipientCount || 'All'})`
                : `Student: ${item.targetUser?.full_name || 'Individual'}`}
            </Text>
          </View>
          <Text style={styles.cardDate}>{dateStr}</Text>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          {item.body}
        </Text>

        {hasPdf && (
          <TouchableOpacity
            style={styles.attachmentChip}
            onPress={() => handleOpenPdf(item.attachment)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text" size={16} color="#2563EB" />
            <Text style={styles.attachmentText} numberOfLines={1}>
              {decodeURIComponent(item.attachment.name || 'Attached PDF Document')}
            </Text>
            {Boolean(item.attachment.size) && (
              <Text style={styles.attachmentSizeText}>
                ({formatFileSize(item.attachment.size)})
              </Text>
            )}
            <Ionicons name="open-outline" size={14} color="#2563EB" />
          </TouchableOpacity>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => promptDelete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
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
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
          }
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
    </View>
  );
}
