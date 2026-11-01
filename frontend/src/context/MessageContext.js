import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';
import { AuthContext } from './AuthContext';
import getPusherClient from '../utils/pusher';

const MessageContext = createContext();

export const useMessages = () => {
  return useContext(MessageContext);
};

export const MessageProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useContext(AuthContext);
  const userId = user?.id;

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
    if (userId) {
      fetchUnreadCount(userId);
    } else {
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`user-${userId}`);
    
    const handleConversationUpdate = async function(data) {
      // Whenever there's a new message or messages are read, refresh count
      fetchUnreadCount(userId);
      
      if (data.newMessage && data.newMessage.receiver === userId) {
        try {
          await client.put('/messages/deliver', { messageId: data.newMessage._id });
        } catch (error) {
          console.error('Error marking message as delivered:', error);
        }
      }
    };

    channel.bind('conversation-update', handleConversationUpdate);

    return () => {
      channel.unbind('conversation-update', handleConversationUpdate);
    };
  }, [userId]);

  return (
    <MessageContext.Provider value={{ unreadCount, fetchUnreadCount }}>
      {children}
    </MessageContext.Provider>
  );
};
