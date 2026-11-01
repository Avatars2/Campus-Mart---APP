import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, TextInput, Animated, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import getPusherClient from '../../utils/pusher';
import styles from './styles';
import { AuthContext } from '../../context/AuthContext';
import useScreenRefresh from '../../hooks/useScreenRefresh';

const MessageList = () => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Buying'); // 'Buying' | 'Selling' | 'Groups'
  const [requestsCount, setRequestsCount] = useState(0);
  const { user } = useContext(AuthContext);
  const userId = user?.id;
  const navigation = useNavigation();

  const loadConversations = useCallback(async () => {
    if (!userId) return [];
    const response = await client.get(`/messages/${userId}`);
    return response.data.success ? response.data.conversations : [];
  }, [userId]);
  const saveConversations = useCallback((value) => setConversations(value), []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadConversations, saveConversations, [userId]);

  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(new Animated.Value(-15)).current;

  const fetchRequestsCount = useCallback(async () => {
    try {
      const response = await client.get('/buying-requests?status=open');
      if (Array.isArray(response.data)) {
        setRequestsCount(response.data.length);
      }
    } catch (err) {
      console.log('Error fetching buying requests count:', err);
    }
  }, []);

  useEffect(() => {
    fetchRequestsCount();
  }, [fetchRequestsCount]);

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
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`user-${userId}`);
    const handleUpdate = function(data) {
      refresh();
    };
    channel.bind('conversation-update', handleUpdate);

    const requestsChannel = pusher.subscribe('group-buying-requests');
    const handleReqUpdate = () => {
      fetchRequestsCount();
    };
    requestsChannel.bind('buying-request:new', handleReqUpdate);
    requestsChannel.bind('buying-request:deleted', handleReqUpdate);
    requestsChannel.bind('buying-request:updated', handleReqUpdate);

    return () => {
      channel.unbind('conversation-update', handleUpdate);
      requestsChannel.unbind('buying-request:new', handleReqUpdate);
      requestsChannel.unbind('buying-request:deleted', handleReqUpdate);
      requestsChannel.unbind('buying-request:updated', handleReqUpdate);
    };
  }, [userId, refresh]);

  const filteredConversations = conversations.filter(item => {
    const otherParticipant = item.participants?.find(p => (p._id || p.id) !== userId) || item.participants?.[0];
    const isMatchedSearch = !searchQuery || 
      otherParticipant?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!isMatchedSearch) return false;

    // The owner can be an object (if populated) or string ID. We'll check its ID just in case.
    const ownerId = item.item?.seller_id?._id || item.item?.seller_id?.id || item.item?.seller_id;
    const isOwner = String(ownerId) === String(userId);
    
    const matchesTab = activeTab === 'Selling' ? isOwner : !isOwner;
    return matchesTab;
  });

  const handleLongPress = (item) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to permanently delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const itemId = item.item?._id || item.item?.id || item.item;
              const otherParticipant = item.participants?.find(p => (p._id || p.id) !== userId) || item.participants?.[0];
              const otherUserId = otherParticipant?._id || otherParticipant?.id;
              
              const response = await client.delete(`/messages/thread/${itemId}/${otherUserId}?userId=${userId}`);
              if (response.data.success) {
                setConversations(prev => prev.filter(c => (c._id || c.id) !== (item._id || item.id)));
              } else {
                Alert.alert('Error', response.data.message || 'Failed to delete chat');
              }
            } catch (error) {
              console.error('Delete chat error:', error);
              Alert.alert('Error', 'An error occurred while deleting the chat');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const otherParticipant = item.participants?.find(p => (p._id || p.id) !== userId) || item.participants?.[0];
    const lastMessage = item.lastMessage;
    const attachmentCount = lastMessage?.attachments?.length || (lastMessage?.attachment?.url ? 1 : 0);
    const previewText = (lastMessage?.content ? lastMessage.content.replace(/â,¹/g, '₹').replace(/â‚¹/g, '₹').replace(/,1/g, '₹') : '')
      || (attachmentCount > 1 ? `${attachmentCount} attachments` : lastMessage?.attachments?.[0]?.fileName || lastMessage?.attachment?.fileName)
      || 'Attachment';
    
    const isMyMessage = Boolean(userId && (lastMessage?.sender === userId || lastMessage?.sender?._id === userId));
    const isUnread = Boolean(!isMyMessage && lastMessage && !lastMessage.read);

    const displayName = item.item?.name?.startsWith('Request:') ? item.item.name : `Item: ${item.item?.name || 'Item'}`;

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        onPress={() => {
          const ownerId = item.item?.seller_id?._id || item.item?.seller_id?.id || item.item?.seller_id;
          const itemId = item.item?._id || item.item?.id || item.item;
          navigation.navigate('ChatThread', {
            itemId: String(itemId),
            otherUserId: otherParticipant?._id || otherParticipant?.id,
            itemName: item.item?.name || 'Chat',
            otherUserName: otherParticipant?.full_name,
            otherUserPhoto: otherParticipant?.profile_photo_url || null,
            isOwnItem: String(ownerId) === String(userId)
          });
        }}
      >
        <Image 
          source={{ uri: otherParticipant?.profile_photo_url || 'https://via.placeholder.com/50' }} 
          style={styles.avatar} 
        />
        <View style={styles.conversationDetails}>
          <View style={styles.headerRow}>
            <Text style={[styles.participantName, isUnread && styles.unreadText]}>{otherParticipant?.full_name}</Text>
            {!!item.lastMessage && (
              <Text style={styles.time}>{new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
          <Text style={styles.itemName}>{displayName}</Text>
          
          <View style={styles.previewRow}>
            {isMyMessage && !!lastMessage && (
              <Ionicons 
                name={lastMessage.read ? "checkmark-done" : lastMessage.delivered ? "checkmark-done" : "checkmark"} 
                size={16} 
                color={lastMessage.read ? "#34B7F1" : "#888"} 
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.lastMessage, isUnread && styles.unreadText]} numberOfLines={1}>
              {item.lastMessage ? previewText : 'No messages yet'}
            </Text>
            {isUnread && <View style={styles.unreadBadge} />}
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Unable to load messages.</Text>
        <TouchableOpacity onPress={retry}>
          <Text style={styles.emptyText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupMatchesSearch = 'items buying requests'.includes(searchQuery.toLowerCase().trim());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.Text style={[styles.headerTitle, { opacity: titleFadeAnim, transform: [{ translateY: titleSlideAnim }] }]}>
          Mess<Text style={{ color: '#007185' }}>ages</Text>
        </Animated.Text>
      </View>
      
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#565959" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'Groups' ? "Search groups..." : "Search by user name..."}
            placeholderTextColor="#565959"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#565959" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'Buying' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Buying')}
        >
          <Text style={[styles.tabText, activeTab === 'Buying' && styles.tabTextActive]}>Buying</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'Selling' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Selling')}
        >
          <Text style={[styles.tabText, activeTab === 'Selling' && styles.tabTextActive]}>Selling</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'Groups' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Groups')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'Groups' && styles.tabTextActive]}>Groups</Text>
            {requestsCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{requestsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'Groups' ? (
        <ScrollView
          style={styles.groupsContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                refresh();
                fetchRequestsCount();
              }}
              colors={['#007185']}
            />
          }
        >
          {groupMatchesSearch ? (
            <TouchableOpacity
              style={styles.groupCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BuyingRequestsGroup')}
            >
              <View style={styles.groupIconContainer}>
                <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
                <View style={styles.groupLiveDot} />
              </View>

              <View style={styles.groupCardContent}>
                <View style={styles.groupCardHeader}>
                  <Text style={styles.groupCardTitle}>Items Buying Requests</Text>
                  <View style={styles.groupPill}>
                    <Text style={styles.groupPillText}>All Students</Text>
                  </View>
                </View>

                <Text style={styles.groupCardDescription} numberOfLines={2}>
                  Post what items you need or fulfill student requests with your listings.
                </Text>

                <View style={styles.groupCardFooter}>
                  <View style={styles.groupMetaItem}>
                    <Ionicons name="radio-button-on" size={12} color="#10B981" />
                    <Text style={styles.groupMetaText}>
                      {requestsCount} Active Request{requestsCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.groupArrowBtn}>
                    <Text style={styles.groupOpenText}>Open Group</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007185" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No groups found matching "{searchQuery}".</Text>
            </View>
          )}
        </ScrollView>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No users found.' : 'No messages yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { refresh(); fetchRequestsCount(); }} colors={['#0052CC']} />}
        />
      )}
    </View>
  );
};

export default MessageList;
