import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import Pusher from 'pusher-js';
import { Ionicons } from '@expo/vector-icons';
import styles from './ChatThread.styles';

const ChatThread = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const flatListRef = useRef();

  useEffect(() => {
    isFocusedRef.current = isFocused;
    if (isFocused && userId) {
      markMessagesAsRead(userId);
    }
  }, [isFocused, userId]);
  
  const { itemId: rawItemId, otherUserId: rawOtherUserId, itemName, otherUserName } = route.params;
  
  // Normalize IDs in case they were passed as objects from stale navigation state
  const itemId = typeof rawItemId === 'object' ? (rawItemId._id || rawItemId.id) : rawItemId;
  const otherUserId = typeof rawOtherUserId === 'object' ? (rawOtherUserId._id || rawOtherUserId.id) : rawOtherUserId;

  useEffect(() => {
    navigation.setOptions({
      title: `${otherUserName}`,
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('MessageList')} 
          style={{ marginRight: 15 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0052CC" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <Text style={styles.headerItemName} numberOfLines={1}>{itemName}</Text>
      )
    });
    
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Initialize Pusher
    const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY || 'fake_key', {
      cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'mt1',
    });

    // Channel name matches backend channel naming logic
    const channelName = `chat-${itemId}-${[userId, otherUserId].sort().join('-')}`;
    const channel = pusher.subscribe(channelName);
    
    channel.bind('new-message', function(data) {
      setMessages(prev => {
        // If we already have this exact message, ignore
        if (prev.find(m => m._id === data._id)) return prev;
        
        // Race condition fix: If Pusher arrives before POST response, replace the optimistic message
        const optimisticIndex = prev.findIndex(m => m.sending && m.content === data.content && m.sender === data.sender);
        if (optimisticIndex !== -1) {
           const newMessages = [...prev];
           newMessages[optimisticIndex] = data;
           return newMessages;
        }

        return [...prev, data];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // If we received a message from the other user, mark it as read
      if (data.sender === otherUserId && data.sender !== userId && isFocusedRef.current) {
        markMessagesAsRead();
      }
    });

    channel.bind('messages-read', function(data) {
      // The other user read our messages
      if (data.readerId === otherUserId) {
        setMessages(prev => prev.map(m => 
          m.sender === userId ? { ...m, read: true, delivered: true } : m
        ));
      }
    });

    channel.bind('messages-delivered', function(data) {
      // The other user received our message
      setMessages(prev => prev.map(m => 
        m._id === data.messageId ? { ...m, delivered: true } : m
      ));
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [userId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const markMessagesAsRead = async (currentUserId = userId) => {
    if (!currentUserId || !otherUserId || !itemId) return;
    try {
      await client.put('/messages/read', {
        itemId,
        senderId: otherUserId,
        receiverId: currentUserId
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const fetchMessages = async () => {
    if (!itemId || !otherUserId || itemId === 'undefined' || otherUserId === 'undefined') {
      console.warn('Cannot fetch messages: missing or invalid parameters', { itemId, otherUserId });
      setLoading(false);
      return;
    }

    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserId(userInfo.id);
        
        const response = await client.get(`/messages/thread/${itemId}/${otherUserId}?userId=${userInfo.id}`);
        if (response.data.success) {
          setMessages(response.data.messages);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
          
          // Mark unread messages from them as read
          const hasUnread = response.data.messages.some(m => m.sender === otherUserId && !m.read);
          if (hasUnread && isFocusedRef.current) {
            markMessagesAsRead(userInfo.id);
          }
        }
      }
    } catch (error) {
      if (error.message === 'Network Error') {
        console.warn('Network Error: Make sure the backend server is running.');
      } else {
        console.error('Error fetching chat thread:', error.response?.data || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userId || !otherUserId || !itemId) return;
    
    const content = inputText.trim();
    setInputText('');
    
    const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const optimisticMessage = {
      _id: tempId,
      optimisticId: tempId,
      sender: userId,
      receiver: otherUserId,
      item: itemId,
      content: content,
      createdAt: new Date().toISOString(),
      read: false,
      delivered: false,
      sending: true
    };

    // Add sending message immediately to UI
    setMessages(prev => [...prev, optimisticMessage]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await client.post(`/messages`, {
        senderId: userId,
        receiverId: otherUserId,
        itemId: itemId,
        content: content
      });
      
      if (response.data.success) {
        // Optimistically update the existing 'sending' message with real data
        setMessages(prev => prev.map(m => 
          m.optimisticId === tempId ? { ...response.data.message } : m
        ));
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender === userId;
    
    return (
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
          {item.content}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 }}>
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.theirMessageTime, { marginTop: 0 }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMyMessage && (
            <Ionicons 
              name={item.sending ? "time-outline" : (item.delivered || item.read ? "checkmark-done" : "checkmark")}
              size={16} 
              color={item.read ? "#34B7F1" : "#B0B7C3"} 
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id || item.createdAt}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={!inputText.trim()}>
          <Ionicons name="send" size={24} color={inputText.trim() ? "#4CAF50" : "#ccc"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatThread;
