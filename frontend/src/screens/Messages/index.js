import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import Pusher from 'pusher-js';
import styles from './styles';

const MessageList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchConversations();
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
      fetchConversations();
    });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  const fetchConversations = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserId(userInfo.id);
        
        const response = await client.get(`/messages/${userInfo.id}`);
        if (response.data.success) {
          setConversations(response.data.conversations);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const otherParticipant = item.participants.find(p => (p._id || p.id) !== userId) || item.participants[0];
    
    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => navigation.navigate('ChatThread', {
          itemId: item.item._id || item.item.id,
          otherUserId: otherParticipant._id || otherParticipant.id,
          itemName: item.item.name,
          otherUserName: otherParticipant.full_name
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
            {item.lastMessage ? item.lastMessage.content : 'No messages yet'}
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

  return (
    <View style={styles.container}>
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

export default MessageList;
