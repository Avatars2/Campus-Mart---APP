import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
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

  const renderItem = ({ item }) => {
    const otherParticipant = item.participants.find(p => (p._id || p.id) !== userId) || item.participants[0];
    const lastMessage = item.lastMessage;
    const attachmentCount = lastMessage?.attachments?.length || (lastMessage?.attachment?.url ? 1 : 0);
    const previewText = lastMessage?.content
      || (attachmentCount > 1 ? `${attachmentCount} attachments` : lastMessage?.attachments?.[0]?.fileName || lastMessage?.attachment?.fileName)
      || 'Attachment';
    
    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => navigation.navigate('ChatThread', {
          itemId: item.item._id || item.item.id,
          otherUserId: otherParticipant._id || otherParticipant.id,
          itemName: item.item.name,
          otherUserName: otherParticipant.full_name,
          otherUserPhoto: otherParticipant.profile_photo_url || null,
        })}
      >
        <Image 
          source={{ uri: otherParticipant.profile_photo_url || 'https://via.placeholder.com/50' }} 
          style={styles.avatar} 
        />
        <View style={styles.conversationDetails}>
          <View style={styles.headerRow}>
            <Text style={styles.participantName}>{otherParticipant.full_name}</Text>
            {item.lastMessage && (
              <Text style={styles.time}>{new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
          <Text style={styles.itemName}>Item: {item.item.name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage ? previewText : 'No messages yet'}
          </Text>
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
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by user name..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
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
