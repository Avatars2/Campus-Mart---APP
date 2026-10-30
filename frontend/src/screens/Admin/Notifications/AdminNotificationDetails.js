import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';
import { openAttachment } from '../../../utils/attachmentHelper';
import styles from './AdminNotificationDetails.styles';

export default function AdminNotificationDetails({ route, navigation }) {
  const { notification } = route.params || {};

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!notification) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notification Details</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#64748B' }}>Notification not found.</Text>
        </View>
      </View>
    );
  }

  const isAll = notification.targetType === 'ALL';
  const hasAttachment = Boolean(notification.attachment?.url);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedDate = notification.createdAt
    ? new Date(notification.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const confirmDelete = async () => {
    setDeleting(true);
    const targetId = notification.id || notification._id;
    try {
      await client.delete(`/admin/notifications/${targetId}`);
      setDeleteModalVisible(false);
      navigation.navigate({
        name: 'AdminNotifications',
        params: { deletedId: targetId },
        merge: true,
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to delete notification.');
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Screen Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notification Details</Text>
          <Text style={styles.headerSubtitle}>Full broadcast & alert overview</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRightBtn}
          onPress={() => setDeleteModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#F87171" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Overview & Title Card ── */}
        <View style={styles.card}>
          <View style={styles.topMetaRow}>
            <View
              style={[
                styles.audienceBadge,
                isAll ? styles.audienceBadgeAll : styles.audienceBadgeSpecific,
              ]}
            >
              <Ionicons
                name={isAll ? 'people' : 'person'}
                size={14}
                color={isAll ? '#2563EB' : '#7C3AED'}
              />
              <Text style={isAll ? styles.audienceTextAll : styles.audienceTextSpecific}>
                {isAll
                  ? `All Students (${notification.recipientCount || 'All'})`
                  : `Student: ${notification.targetUser?.full_name || 'Individual'}`}
              </Text>
            </View>

            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.dateBadgeText}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.titleLabel}>Title</Text>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
          </View>
        </View>

        {/* ── Audience / Recipient Details Card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={16} color="#1E3A8A" />
            <Text style={styles.sectionHeaderTitle}>Recipient Information</Text>
          </View>

          <View style={styles.audienceInfoBox}>
            <View style={styles.audienceInfoRow}>
              <View
                style={[
                  styles.audienceIconCircle,
                  isAll ? styles.audienceIconCircleAll : styles.audienceIconCircleSpecific,
                ]}
              >
                <Ionicons
                  name={isAll ? 'megaphone' : 'person'}
                  size={22}
                  color={isAll ? '#2563EB' : '#7C3AED'}
                />
              </View>
              <View style={styles.audienceDetailsCol}>
                <Text style={styles.audiencePrimaryText}>
                  {isAll
                    ? 'General Broadcast (All Students)'
                    : notification.targetUser?.full_name || 'Specific Student'}
                </Text>
                <Text style={styles.audienceSubText}>
                  {isAll
                    ? `Delivered to ${notification.recipientCount || 'all registered'} student accounts`
                    : notification.targetUser?.email
                    ? `Email: ${notification.targetUser.email}`
                    : 'Targeted notification'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Message Content Card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={16} color="#1E3A8A" />
            <Text style={styles.sectionHeaderTitle}>Message Content</Text>
          </View>

          <View style={styles.bodyBox}>
            <Text style={styles.bodyText} selectable>
              {notification.body}
            </Text>
          </View>
        </View>

        {/* ── Attachment Card (If Available) ── */}
        {hasAttachment && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-attach-outline" size={16} color="#1E3A8A" />
              <Text style={styles.sectionHeaderTitle}>Attached Document</Text>
            </View>

            <View style={styles.attachmentCard}>
              <View style={styles.attachmentLeft}>
                <View style={styles.attachmentIconWrap}>
                  <Ionicons name="document-text" size={22} color="#2563EB" />
                </View>
                <View style={styles.attachmentDetails}>
                  <Text style={styles.attachmentNameText} numberOfLines={1}>
                    {decodeURIComponent(notification.attachment.name || 'document.pdf')}
                  </Text>
                  {Boolean(notification.attachment.size) && (
                    <Text style={styles.attachmentSizeText}>
                      {formatFileSize(notification.attachment.size)}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.openPdfBtn}
                onPress={() => openAttachment(notification.attachment)}
                activeOpacity={0.7}
              >
                <Text style={styles.openPdfBtnText}>Open PDF</Text>
                <Ionicons name="open-outline" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Delete Confirmation Modal ── */}
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
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.confirmModalTitle}>Delete Notification</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to permanently delete "{notification.title}"?
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

