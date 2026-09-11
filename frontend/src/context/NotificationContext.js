import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Pusher from 'pusher-js';
import client from '../api/client';
import { AuthContext } from './AuthContext';

// Configure how notifications should behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext();

export const useNotifications = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { user } = useContext(AuthContext);
  const userId = user?.id;
  
  const notificationListener = useRef();
  const responseListener = useRef();

  const fetchNotifications = async (uid) => {
    try {
      // Assuming a GET /notifications route in backend
      const response = await client.get('/notifications');
      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
        const unread = response.data.notifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push Token:', token);
      
      // Save token to backend
      try {
        await client.post('/users/token', { fcmToken: token });
      } catch (e) {
        console.error('Failed to save push token to backend', e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications(userId);
      registerForPushNotificationsAsync();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }

    // Listeners for foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Notification received in foreground
      fetchNotifications();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped notification:', response.notification.request.content);
      // Navigation logic can go here if needed
    });

    return () => {
      if (notificationListener.current?.remove) {
        notificationListener.current.remove();
      } else if (typeof Notifications.removeNotificationSubscription === 'function') {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }

      if (responseListener.current?.remove) {
        responseListener.current.remove();
      } else if (typeof Notifications.removeNotificationSubscription === 'function') {
        Notifications.removeNotificationSubscription(responseListener.current);
      }

      notificationListener.current = undefined;
      responseListener.current = undefined;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY || 'fake_key', {
      cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'mt1',
    });

    const channel = pusher.subscribe(`user-${userId}`);
    
    channel.bind('new:notification', function(data) {
      console.log('New real-time notification via Pusher:', data);
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  const markAsRead = async (id) => {
    try {
      await client.put(`/notifications/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await client.put('/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
