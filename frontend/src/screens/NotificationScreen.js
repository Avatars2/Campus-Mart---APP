import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import styles from './NotificationScreen.styles';
import { useNotifications } from '../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NotificationScreen = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigation = useNavigation();

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

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Example navigation based on type
    if (notification.type === 'MESSAGE' && notification.relatedId) {
      navigation.navigate('Chat', { conversationId: notification.relatedId });
    } else if (notification.type === 'ORDER' && notification.relatedId) {
      navigation.navigate('OrderNotificationDetail', { notification });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        {item.type === 'MESSAGE' && <Ionicons name="chatbubble-outline" size={24} color="#007185" />}
        {item.type === 'ORDER' && <Ionicons name="cart-outline" size={24} color="#007185" />}
        {item.type === 'SYSTEM' && <Ionicons name="information-circle-outline" size={24} color="#E77600" />}
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.Text style={[styles.headerTitle, { opacity: titleFadeAnim, transform: [{ translateY: titleSlideAnim }] }]}>
          Notifi<Text style={{ color: '#007185' }}>cations</Text>
        </Animated.Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};



export default NotificationScreen;
