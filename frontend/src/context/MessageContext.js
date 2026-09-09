import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pusher from 'pusher-js';
import client from '../api/client';

const MessageContext = createContext();

export const useMessages = () => {
  return useContext(MessageContext);
};

export const MessageProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);

  const fetchUnreadCount = async (uid) => {
    try {
      const response = await client.get(`/messages/unread-count/${uid}`);
      if (response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserId(userInfo.id);
        fetchUnreadCount(userInfo.id);
      }
    };
    
    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY || 'fake_key', {
      cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'mt1',
    });

    const channel = pusher.subscribe(`user-${userId}`);
    
    channel.bind('conversation-update', async function(data) {
      // Whenever there's a new message or messages are read, refresh count
      fetchUnreadCount(userId);
      
      if (data.newMessage && data.newMessage.receiver === userId) {
        try {
          await client.put('/messages/deliver', { messageId: data.newMessage._id });
        } catch (error) {
          console.error('Error marking message as delivered:', error);
        }
      }
    });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  return (
    <MessageContext.Provider value={{ unreadCount, fetchUnreadCount }}>
      {children}
    </MessageContext.Provider>
  );
};
