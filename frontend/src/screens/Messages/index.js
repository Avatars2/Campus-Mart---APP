import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, TextInput, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { Pusher } from 'pusher-js/react-native';
import styles from './styles';
import { AuthContext } from '../../context/AuthContext';
import useScreenRefresh from '../../hooks/useScreenRefresh';

const MessageList = () => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(titleSlideAnim, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Initialize Pusher
    const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY || 'fake_key', {
      cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'mt1',
    });

    const channel = pusher.subscribe(`user-${userId}`);
    channel.bind('conversation-update', function(data) {
      // Fetch latest conversations when an update comes in
      refresh();
    });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId, refresh]);
  const filteredConversations = conversations.filter(item => {
    const otherParticipant = item.participants.find(p => (p._id || p.id) !== userId) || item.participants[0];
    return otherParticipant?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
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
              const itemId = item.item?._id || item.item?.id;
              const otherParticipant = item.participants.find(p => (p._id || p.id) !== userId) || item.participants[0];
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
    const otherParticipant = item.participants.find(p => (p._id || p.id) !== userId) || item.participants[0];
    const lastMessage = item.lastMessage;
    const attachmentCount = lastMessage?.attachments?.length || (lastMessage?.attachment?.url ? 1 : 0);
    const previewText = lastMessage?.content
      || (attachmentCount > 1 ? `${attachmentCount} attachments` : lastMessage?.attachments?.[0]?.fileName || lastMessage?.attachment?.fileName)
      || 'Attachment';
    
    const isMyMessage = Boolean(userId && (lastMessage?.sender === userId || lastMessage?.sender?._id === userId));
    const isUnread = Boolean(!isMyMessage && lastMessage && !lastMessage.read);

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ChatThread', {
          itemId: item.item?._id || item.item?.id,
          otherUserId: otherParticipant?._id || otherParticipant?.id,
          itemName: item.item?.name,
          otherUserName: otherParticipant?.full_name,
          otherUserPhoto: otherParticipant?.profile_photo_url || null,
        })}
      >
        <Image 
          source={{ uri: otherParticipant?.profile_photo_url || 'https://via.placeholder.com/50' }} 
          style={styles.avatar} 
        />
        <View style={styles.conversationDetails}>
          <View style={styles.headerRow}>
            <Text style={[styles.participantName, isUnread && styles.unreadText]}>{otherParticipant?.full_name}</Text>
            {item.lastMessage && (
              <Text style={styles.time}>{new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
          <Text style={styles.itemName}>Item: {item.item?.name}</Text>
          
          <View style={styles.previewRow}>
            {isMyMessage && lastMessage && (
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.Text style={[styles.headerTitle, { opacity: titleFadeAnim, transform: [{ translateY: titleSlideAnim }] }]}>
          My<Text style={{ color: '#007185' }}>Messages</Text>
        </Animated.Text>
      </View>
      
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#565959" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user name..."
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
      
      {filteredConversations.length === 0 ? (
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#0052CC']} />}
        />
      )}
    </View>
  );
};

export default MessageList;
