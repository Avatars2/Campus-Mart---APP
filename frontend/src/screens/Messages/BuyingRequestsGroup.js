import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, TextInput,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Alert, Linking, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { getPusherClient } from '../../utils/pusher';
import styles from './BuyingRequestsGroup.styles';

const CATEGORIES = ['All', 'Books', 'Electronics', 'Stationery', 'Clothing', 'Furniture', 'Others'];

const getReqId = (item) => String(item?.id || item?._id || '');

export default function BuyingRequestsGroup() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id || user?._id;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'buy', 'rent'

  // Post Request Modal state
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('Books');
  const [postType, setPostType] = useState('buy'); // 'buy', 'rent'
  const [postBudget, setPostBudget] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Confirmation Modal state (End Request & Delete Request)
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      let url = `/buying-requests?status=open`;
      if (selectedCategory && selectedCategory !== 'All') {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (selectedType && selectedType !== 'all') {
        url += `&request_type=${selectedType}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await client.get(url);
      const list = Array.isArray(res.data) ? res.data : [];
      const seen = new Set();
      const unique = list.filter(item => {
        const id = getReqId(item);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setRequests(unique);
    } catch (err) {
      console.error('Error fetching buying requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedType, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time updates via Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe('group-buying-requests');

    channel.bind('buying-request:new', (data) => {
      if (data?.request) {
        const incomingId = getReqId(data.request);
        setRequests(prev => {
          if (prev.some(r => getReqId(r) === incomingId)) {
            return prev.map(r => getReqId(r) === incomingId ? { ...r, ...data.request } : r);
          }
          return [data.request, ...prev.filter(r => getReqId(r) !== incomingId)];
        });
      }
    });

    channel.bind('buying-request:updated', (data) => {
      if (data?.request) {
        const updateId = getReqId(data.request);
        setRequests(prev => prev.map(r => getReqId(r) === updateId ? { ...r, ...data.request } : r));
      }
    });

    channel.bind('buying-request:deleted', (data) => {
      if (data?.requestId) {
        const delId = String(data.requestId);
        setRequests(prev => prev.filter(r => getReqId(r) !== delId));
      }
    });

    return () => {
      pusher.unsubscribe('group-buying-requests');
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim()) {
      Alert.alert('Required Field', 'Please enter what item you are looking for.');
      return;
    }
    setIsSubmittingPost(true);
    try {
      const payload = {
        title: postTitle.trim(),
        description: postDescription.trim(),
        category_id: postCategory,
        request_type: postType,
        target_budget: postBudget ? Number(postBudget) : null,
      };
      const res = await client.post('/buying-requests', payload);
      const newReq = res.data;
      const newId = getReqId(newReq);
      setRequests(prev => {
        if (prev.some(r => getReqId(r) === newId)) {
          return prev;
        }
        return [newReq, ...prev.filter(r => getReqId(r) !== newId)];
      });
      setIsPostModalVisible(false);
      setPostTitle('');
      setPostDescription('');
      setPostBudget('');
    } catch (err) {
      console.error('Error posting request:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to post request.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleCallBuyer = (req) => {
    const phone = req.user_phone || req.user_id?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Phone Unavailable', 'This student has not provided a phone number.');
    }
  };

  const handleMessageBuyer = (req) => {
    const targetUserId = String(req.user_id?._id || req.user_id?.id || req.user_id || '');
    if (!targetUserId) {
      Alert.alert('Error', 'Unable to start chat: requester details not available.');
      return;
    }
    if (String(targetUserId) === String(currentUserId)) {
      Alert.alert('Notice', 'This is your own request.');
      return;
    }
    const reqId = String(req._id || req.id || '');
    const userName = req.user_name || req.user_id?.full_name || 'Buyer';
    const userPhoto = req.user_photo || req.user_id?.profile_photo_url || null;

    navigation.navigate('ChatThread', {
      itemId: reqId,
      otherUserId: targetUserId,
      itemName: `Request: ${req.title}`,
      otherUserName: userName,
      otherUserPhoto: userPhoto,
      isOwnItem: false,
    });
  };

  const promptEndRequest = (req) => {
    setConfirmDialog({
      type: 'end',
      request: req,
      title: 'End Request?',
      message: `This will be ended for your ${req.title}.`
    });
  };

  const promptDeleteRequest = (req) => {
    setConfirmDialog({
      type: 'delete',
      request: req,
      title: 'Delete Request?',
      message: `Are you sure you want to permanently delete your request for "${req.title}"?`
    });
  };

  const handleConfirmDialogAction = async () => {
    if (!confirmDialog || isActionLoading) return;
    const { type, request: req } = confirmDialog;
    const reqId = req._id || req.id;
    setIsActionLoading(true);

    try {
      if (type === 'end') {
        const res = await client.patch(`/buying-requests/${reqId}`, { status: 'fulfilled' });
        setRequests(prev => prev.map(r => (r._id || r.id) === reqId ? res.data : r));
        setConfirmDialog(null);
      } else if (type === 'delete') {
        await client.delete(`/buying-requests/${reqId}`);
        setRequests(prev => prev.filter(r => (r._id || r.id) !== reqId));
        setConfirmDialog(null);
      }
    } catch (err) {
      console.error(`Error during ${type} action:`, err);
      Alert.alert('Error', err.response?.data?.error || `Failed to ${type} request.`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderRequestItem = ({ item }) => {
    const isAuthor = String(item.user_id?._id || item.user_id?.id || item.user_id) === String(currentUserId);
    const isRent = item.request_type === 'rent';
    const isFulfilled = item.status === 'fulfilled' || item.status === 'closed';

    return (
      <View style={styles.requestCard}>
        {/* Requester Header */}
        <View style={styles.cardHeader}>
          <View style={styles.authorRow}>
            <Image
              source={{ uri: item.user_photo || 'https://via.placeholder.com/50' }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>{item.user_name}</Text>
              <Text style={styles.authorDept} numberOfLines={1}>
                {item.user_department ? `${item.user_department} • ` : ''}
                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={[
            styles.statusPill,
            { backgroundColor: isFulfilled ? '#DCFCE7' : '#E6F7F9' }
          ]}>
            <Text style={[
              styles.statusPillText,
              { color: isFulfilled ? '#15803D' : '#007185' }
            ]}>
              {isFulfilled ? 'ENDED' : 'ACTIVE'}
            </Text>
          </View>
        </View>

        {/* Item Title & Badges */}
        <Text style={styles.requestTitle}>{item.title}</Text>
        
        <View style={styles.metaPillsRow}>
          <View style={[styles.typePill, { backgroundColor: isRent ? '#007185' : '#D97706' }]}>
            <Text style={styles.typePillText}>{isRent ? 'Rent' : 'Buy'}</Text>
          </View>
          {item.target_budget != null && (
            <View style={styles.budgetPill}>
              <Ionicons name="pricetag" size={11} color="#059669" />
              <Text style={styles.budgetPillText}>Budget: ₹{item.target_budget}</Text>
            </View>
          )}
          {Boolean(item.category_name) && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category_name}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {Boolean(item.description) && (
          <Text style={styles.requestDescription}>{item.description}</Text>
        )}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          {!isAuthor ? (
            <>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.85}
                onPress={() => handleCallBuyer(item)}
              >
                <Ionicons name="call" size={15} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatBtn}
                activeOpacity={0.85}
                onPress={() => handleMessageBuyer(item)}
              >
                <Ionicons name="chatbubble-ellipses" size={15} color="#007185" />
                <Text style={styles.chatBtnText}>Message</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.authorActionsRow}>
              {!isFulfilled ? (
                <TouchableOpacity
                  style={styles.endRequestBtn}
                  activeOpacity={0.85}
                  onPress={() => promptEndRequest(item)}
                >
                  <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.endRequestBtnText}>End Request</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.requestEndedBadge}>
                  <Ionicons name="checkmark-done-circle" size={16} color="#15803D" />
                  <Text style={styles.requestEndedText}>Request Ended</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteRequestBtn}
                activeOpacity={0.8}
                onPress={() => promptDeleteRequest(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity> 
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Items Buying <Text style={{ color: '#007185' }}>Requests</Text>
          </Text>
          <Text style={styles.headerSubtitle}>Campus Student Community Board</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requested items..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Structured Filter UI */}
      <View style={styles.filterSection}>
        {/* Row 1: Request Type Segmented Buttons */}
        <View style={styles.typeSegmentContainer}>
          <TouchableOpacity
            style={[styles.typeSegmentBtn, selectedType === 'all' && styles.typeSegmentBtnActive]}
            onPress={() => setSelectedType('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeSegmentText, selectedType === 'all' && styles.typeSegmentTextActive]}>
              All Types
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeSegmentBtn, selectedType === 'buy' && styles.typeSegmentBtnActive]}
            onPress={() => setSelectedType('buy')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cart-outline"
              size={14}
              color={selectedType === 'buy' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.typeSegmentText, selectedType === 'buy' && styles.typeSegmentTextActive]}>
              Buy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeSegmentBtn, selectedType === 'rent' && styles.typeSegmentBtnActive]}
            onPress={() => setSelectedType('rent')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={selectedType === 'rent' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.typeSegmentText, selectedType === 'rent' && styles.typeSegmentTextActive]}>
              Rent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Category Pill Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPillBtn, isActive && styles.categoryPillBtnActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                  {cat === 'All' ? 'All Categories' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Requests Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007185" />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={item => getReqId(item)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007185']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={54} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Requests Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No buying requests match your search criteria.'
                  : 'Be the first student to post an item request!'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) to Post Request */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => setIsPostModalVisible(true)}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Post Request</Text>
      </TouchableOpacity>

      {/* ──────────────── Modal: Confirmation Dialog (End & Delete Request) ──────────────── */}
      {confirmDialog && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => !isActionLoading && setConfirmDialog(null)}
        >
          <View style={styles.confirmModalBackdrop}>
            <View style={styles.confirmModalCard}>
              <View
                style={[
                  styles.confirmModalIconWrap,
                  { backgroundColor: confirmDialog.type === 'delete' ? '#FEE2E2' : '#DCFCE7' }
                ]}
              >
                <Ionicons
                  name={confirmDialog.type === 'delete' ? 'trash' : 'checkmark-circle'}
                  size={32}
                  color={confirmDialog.type === 'delete' ? '#DC2626' : '#15803D'}
                />
              </View>

              <Text style={styles.confirmModalTitle}>{confirmDialog.title}</Text>
              <Text style={styles.confirmModalMessage}>{confirmDialog.message}</Text>

              <View style={styles.confirmModalBtnRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setConfirmDialog(null)}
                  disabled={isActionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmActionBtn,
                    { backgroundColor: confirmDialog.type === 'delete' ? '#DC2626' : '#007185' },
                    isActionLoading && { opacity: 0.7 }
                  ]}
                  onPress={handleConfirmDialogAction}
                  disabled={isActionLoading}
                  activeOpacity={0.8}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmActionText}>
                      {confirmDialog.type === 'delete' ? 'Delete' : 'Yes, End'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ──────────────── Modal: Post Buying Request ──────────────── */}
      <Modal
        visible={isPostModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request an Item</Text>
              <TouchableOpacity onPress={() => setIsPostModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>What item do you need? *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Casio fx-991EX Calculator, Drafter..."
                placeholderTextColor="#94A3B8"
                value={postTitle}
                onChangeText={setPostTitle}
              />

              <Text style={styles.inputLabel}>I want to:</Text>
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[styles.typeToggleBtn, postType === 'buy' && styles.typeToggleBtnActive]}
                  onPress={() => setPostType('buy')}
                >
                  <Text style={[styles.typeToggleText, postType === 'buy' && styles.typeToggleTextActive]}>
                    Buy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeToggleBtn, postType === 'rent' && styles.typeToggleBtnActive]}
                  onPress={() => setPostType('rent')}
                >
                  <Text style={[styles.typeToggleText, postType === 'rent' && styles.typeToggleTextActive]}>
                    Rent
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 6 }}>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryPillBtn, postCategory === c && styles.categoryPillBtnActive, { marginRight: 6 }]}
                    onPress={() => setPostCategory(c)}
                  >
                    <Text style={[styles.categoryPillText, postCategory === c && styles.categoryPillTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Your Target Budget (₹ optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={postBudget}
                onChangeText={setPostBudget}
              />

              <Text style={styles.inputLabel}>Additional Details (condition, notes)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Need for semester exam this week. Good condition preferred."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={postDescription}
                onChangeText={setPostDescription}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={handleCreatePost}
                disabled={isSubmittingPost}
              >
                {isSubmittingPost ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
