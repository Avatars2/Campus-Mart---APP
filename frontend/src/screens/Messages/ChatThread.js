import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image, Linking, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts/legacy';
import client from '../../api/client';
import { Pusher } from 'pusher-js/react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './ChatThread.styles';

let MapView = null;
let Marker = null;
let UrlTile = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  UrlTile = Maps.UrlTile;
}

const ChatThread = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');

  const handleDeleteMessage = async (type) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage._id;
    setMessages(prev => prev.filter(m => m._id !== msgId && m.id !== msgId));
    setSelectedMessage(null);
    try {
      await client.delete(`/messages/delete/${msgId}?userId=${userId}&type=${type}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message on the server.');
    }
  };

  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid offer amount.');
      return;
    }
    setOfferModalVisible(false);
    setOfferAmount('');
    try {
      const response = await client.post('/messages', {
        action: 'create_offer',
        senderId: userId,
        receiverId: otherUserId,
        itemId,
        offerPrice: amount
      });
      if (response.data.success) {
        setMessages(prev => {
          if (prev.find(m => m._id === response.data.message._id)) return prev;
          return [...prev, response.data.message];
        });
      } else {
        Alert.alert('Error', response.data.message);
      }
    } catch (error) {
      console.error('Error sending offer to URL:', error.config?.url, 'Method:', error.config?.method);
      console.error('Full Error:', error);
      Alert.alert('Error', 'Failed to send offer: ' + (error.response?.status || error.message));
    }
  };

  const handleAcceptOffer = (messageId, price) => {
    navigation.navigate('Checkout', { 
      checkoutItems: [{
        id: itemId,
        name: itemName,
        price: price,
        quantity: 1,
        listing_type: 'buy'
      }],
      fromCart: false,
      offerPayload: { messageId, userId }
    });
  };
  
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const flatListRef = useRef();

  const { itemId: rawItemId, otherUserId: rawOtherUserId, itemName, otherUserName, otherUserPhoto, isOwnItem } = route.params;
  
  // Normalize IDs in case they were passed as objects from stale navigation state
  const itemId = typeof rawItemId === 'object' ? (rawItemId._id || rawItemId.id) : rawItemId;
  const otherUserId = typeof rawOtherUserId === 'object' ? (rawOtherUserId._id || rawOtherUserId.id) : rawOtherUserId;

  useEffect(() => {
    isFocusedRef.current = isFocused;
    if (isFocused && userId) {
      markMessagesAsRead(userId);
    }
  }, [isFocused, userId, itemId, otherUserId]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    fetchMessages();
  }, [itemId, otherUserId]);

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

    channel.bind('message-deleted', function(data) {
      // The other user deleted a message for everyone
      setMessages(prev => prev.filter(m => m._id !== data.messageId && m.id !== data.messageId));
    });

    channel.bind('offer-updated', function(data) {
      // Offer status updated (accepted/expired)
      setMessages(prev => prev.map(m => m._id === data._id ? data : m));
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [userId, itemId, otherUserId]);

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
    setMessages([]);
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

  const sendMessage = async (contentOverride = null) => {
    const isOverrideString = typeof contentOverride === 'string';
    const finalContent = isOverrideString ? contentOverride : inputText.trim();
    
    if ((!finalContent && attachments.length === 0) || !userId || !otherUserId || !itemId || sending) return;
    
    if (!isOverrideString) {
      setInputText('');
    }
    const selectedAttachments = attachments;
    if (!isOverrideString) {
      setAttachments([]);
    }
    setSending(true);
    
    const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const optimisticMessage = {
      _id: tempId,
      optimisticId: tempId,
      sender: userId,
      receiver: otherUserId,
      item: itemId,
      content: finalContent,
      attachments: selectedAttachments.map(selectedAttachment => ({
        url: selectedAttachment.uri,
        fileName: selectedAttachment.name,
        mimeType: selectedAttachment.type,
      })),
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
      const formData = new FormData();
      formData.append('senderId', userId);
      formData.append('receiverId', otherUserId);
      formData.append('itemId', itemId);
      formData.append('content', finalContent);

      for (const selectedAttachment of selectedAttachments) {
        if (Platform.OS === 'web') {
          const fileResponse = await fetch(selectedAttachment.uri);
          const blob = await fileResponse.blob();
          formData.append('attachment', blob, selectedAttachment.name);
        } else {
          formData.append('attachment', {
            uri: selectedAttachment.uri.replace('file://', ''),
            name: selectedAttachment.name,
            type: selectedAttachment.type,
          });
        }
      }

      const response = await client.post(`/messages`, formData, {
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
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
      Alert.alert('Unable to send', error.response?.data?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const openCamera = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setAttachments(current => [
        ...current,
        {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `photo-${Date.now()}.jpg`,
          type: result.assets[0].mimeType || 'image/jpeg',
          size: result.assets[0].fileSize,
        }
      ].slice(0, 10));
    }
  };

  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedMapRegion, setSelectedMapRegion] = useState(null);

  const shareLocation = async () => {
    setShowAttachMenu(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow location access to share your location.');
      return;
    }
    
    setLocationPickerVisible(true);
    setSelectedMapRegion(null);
    setCurrentLocation(null);
    
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLocation(location);
    } catch (error) {
      console.error('Location Error:', error);
      Alert.alert('Error', 'Could not fetch your location.');
      setLocationPickerVisible(false);
    }
  };

  const shareContact = async () => {
    setShowAttachMenu(false);
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow contacts access to share a contact.');
      return;
    }
    
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      
      const validContacts = data.filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
                                .sort((a, b) => a.name.localeCompare(b.name));
      
      if (validContacts.length > 0) {
        setAvailableContacts(validContacts);
        setContactPickerVisible(true);
      } else {
        Alert.alert('No Contacts', 'Could not find any contacts with phone numbers on this device.');
      }
    } catch (error) {
      console.error('Contact Error:', error);
      Alert.alert('Error', 'Could not fetch contacts.');
    }
  };

  const chooseImage = async () => {
    setShowAttachMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setAttachments(current => [
        ...current,
        ...result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}-${index + 1}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        })),
      ].slice(0, 10));
    }
  };

  const chooseFile = async () => {
    setShowAttachMenu(false);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.length) {
      setAttachments(current => [...current, ...result.assets.map(file => ({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
        size: file.size,
      }))].slice(0, 10));
    }
  };

  const removeAttachment = (index) => {
    setAttachments(current => current.filter((_, attachmentIndex) => attachmentIndex !== index));
  };

  const getMessageAttachments = (message) => (
    message.attachments?.length
      ? message.attachments
      : (message.attachment?.url ? [message.attachment] : [])
  );

  const openAttachment = async (file) => {
    // Prefer direct Cloudinary URL (publicly accessible), fall back to backend proxy
    const directUrl = file?.url || file?.downloadUrl;
    const proxyUrl = file?.openUrl
      ? `${client.defaults.baseURL.replace(/\/api$/, '')}${file.openUrl}`
      : null;
    const downloadUrl = directUrl || proxyUrl;

    if (!downloadUrl) {
      Alert.alert('Error', 'No file URL available.');
      return;
    }

    if (Platform.OS === 'web') {
      Linking.openURL(downloadUrl);
      return;
    }

    try {
      const fileName = (file.fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${FileSystem.documentDirectory}${fileName}`;

      // Try downloading with auth token (works for both Cloudinary and backend proxy)
      const token = await AsyncStorage.getItem('token');
      const downloadOptions = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      let downloadRes = await FileSystem.downloadAsync(downloadUrl, localUri, downloadOptions);

      // If direct URL failed (status not 200), try backend proxy with auth
      if (downloadRes.status !== 200 && proxyUrl && proxyUrl !== downloadUrl) {
        downloadRes = await FileSystem.downloadAsync(proxyUrl, localUri, downloadOptions);
      }

      if (downloadRes.status !== 200) {
        Alert.alert('Error', `Could not download file (status ${downloadRes.status})`);
        return;
      }

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: file.mimeType || 'application/octet-stream',
        });
      } else {
        await Sharing.shareAsync(downloadRes.uri, {
          UTI: file.mimeType || '*/*',
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.error('Error opening attachment:', error);
      Alert.alert('Error', `Could not open file: ${error.message}`);
    }
  };

  const saveImageToGallery = async (file) => {
    const imageUrl = file?.url || file?.downloadUrl;
    if (!imageUrl) {
      Alert.alert('Error', 'No image URL available.');
      return;
    }
    
    try {
      const fileName = (file.fileName || `image_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadRes = await FileSystem.downloadAsync(imageUrl, localUri);
      if (downloadRes.status !== 200) {
        Alert.alert('Error', 'Could not download the image.');
        return;
      }

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: file.mimeType || 'image/jpeg',
        });
      } else {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: file.mimeType || 'image/jpeg',
          UTI: 'public.jpeg',
        });
      }
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', `Could not open image: ${error.message}`);
    }
  };

  const OfferMessage = ({ item, isMyMessage, handleAcceptOffer }) => {
    const [now, setNow] = React.useState(new Date());
    
    React.useEffect(() => {
      if (item.offer?.status === 'PENDING') {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
      }
    }, [item.offer?.status]);

    const isAccepted = item.offer?.status === 'ACCEPTED';
    const isExpired = item.offer?.status === 'EXPIRED' || (!isAccepted && item.offer?.status !== 'REJECTED' && now > new Date(item.offer?.expiresAt));
    
    const timeLeft = item.offer?.status === 'PENDING' && !isExpired ? Math.max(0, Math.floor((new Date(item.offer?.expiresAt) - now) / 1000)) : 0;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    
    return (
      <View style={{ alignSelf: 'center', backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, marginVertical: 12, width: '90%', maxWidth: 350, borderWidth: 1, borderColor: '#A5D6A7', elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="pricetag" size={24} color="#2E7D32" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1B5E20', flex: 1 }}>
            {isMyMessage ? 'You sent an offer!' : 'Special Offer Received!'}
          </Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#2E7D32', marginBottom: 12, textAlign: 'center' }}>₹{item.offer?.price}</Text>
        
        {isAccepted ? (
          <View style={{ backgroundColor: '#C8E6C9', padding: 10, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ color: '#2E7D32', fontWeight: '700', fontSize: 15 }}>Offer Accepted ✓</Text>
          </View>
        ) : isExpired ? (
          <View style={{ backgroundColor: '#FFCDD2', padding: 10, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 15 }}>Offer Expired</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center', backgroundColor: '#FBE9E7', padding: 6, borderRadius: 6 }}>
              <Ionicons name="time-outline" size={18} color="#D84315" style={{ marginRight: 6 }} />
              <Text style={{ color: '#D84315', fontWeight: '600' }}>Expires in {mins}:{secs < 10 ? '0' : ''}{secs}</Text>
            </View>
            {!isMyMessage && (
              <TouchableOpacity 
                style={{ backgroundColor: '#2E7D32', padding: 14, borderRadius: 8, alignItems: 'center' }}
                onPress={() => handleAcceptOffer(item._id, item.offer?.price)}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Accept</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    const senderIdStr = typeof item.sender === 'object' ? (item.sender?._id || item.sender?.id) : item.sender;
    const isMyMessage = senderIdStr === userId;
    
    if (item.isSystemMessage && item.offer) {
      return <OfferMessage item={item} isMyMessage={isMyMessage} handleAcceptOffer={handleAcceptOffer} />;
    }

    // Detect location messages
    const locationMatch = item.content?.match(/📍\s*Location:\s*https:\/\/maps\.google\.com\/\?q=([-\d.]+),([-\d.]+)/);
    if (locationMatch) {
      const lat = parseFloat(locationMatch[1]);
      const lng = parseFloat(locationMatch[2]);
      return (
        <TouchableOpacity
          style={[styles.locationCard, { alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }]}
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}
          onLongPress={() => setSelectedMessage(item)}
          activeOpacity={0.85}
        >
          <View style={styles.locationMapPreview}>
            {/* Grid lines for map-like background */}
            <View style={styles.locationGridContainer}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={`h${i}`} style={[styles.locationGridLineH, { top: `${i * 25}%` }]} />
              ))}
              {[0, 1, 2, 3, 4].map(i => (
                <View key={`v${i}`} style={[styles.locationGridLineV, { left: `${i * 25}%` }]} />
              ))}
            </View>
            <Ionicons name="location" size={40} color="#DC2626" style={{ marginBottom: 8 }} />
          </View>
          <View style={styles.locationDetails}>
            <Text style={styles.locationTitle}>📍 Shared Location</Text>
            <Text style={styles.locationCoords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={styles.locationTapHint}>Tap to open in Maps →</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : { color: '#8792A2' }, { marginTop: 0 }]}>
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
          </View>
        </TouchableOpacity>
      );
    }

    const messageAttachments = getMessageAttachments(item);
    
    return (
      <TouchableOpacity 
        style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}
        onLongPress={() => setSelectedMessage(item)}
        activeOpacity={0.8}
      >
        {messageAttachments.map((messageAttachment, attachmentIndex) => (
          messageAttachment.url && messageAttachment.mimeType?.startsWith('image/') ? (
            <TouchableOpacity
              key={`${messageAttachment.url}-${attachmentIndex}`}
              onPress={() => saveImageToGallery(messageAttachment)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: messageAttachment.url }} style={styles.attachmentImage} />
              <View style={styles.imageDownloadBadge}>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : messageAttachment.url ? (
            <TouchableOpacity key={`${messageAttachment.url}-${attachmentIndex}`} style={styles.fileAttachment} onPress={() => openAttachment(messageAttachment)} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={24} color={isMyMessage ? '#FFFFFF' : '#4CAF50'} />
              <Text style={[styles.fileAttachmentName, isMyMessage ? styles.myMessageText : styles.theirMessageText]} numberOfLines={2}>{messageAttachment.fileName || 'Attachment'}</Text>
            </TouchableOpacity>
          ) : null
        ))}
        {item.content ? (
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
            {item.content.replace(/â,¹/g, '₹').replace(/â‚¹/g, '₹').replace(/,1/g, '₹').split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
              if (part.match(/(https?:\/\/[^\s]+)/g)) {
                return (
                  <Text 
                    key={index} 
                    style={{ textDecorationLine: 'underline', color: isMyMessage ? '#E0F7FA' : '#0052CC' }} 
                    onPress={() => Linking.openURL(part)}
                  >
                    {part}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        ) : null}
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
      {/* WhatsApp-style Custom Header */}
      <View style={styles.customHeader}>
        {isSearchMode ? (
          <>
            <TouchableOpacity onPress={() => { setIsSearchMode(false); setSearchQuery(''); }} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#0F1111" />
            </TouchableOpacity>
            <TextInput
              style={[styles.searchHeaderInput, { flex: 1, backgroundColor: '#F0F2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 16 }]}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
                <Ionicons name="close-circle" size={20} color="#8792A2" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => navigation.navigate('MessageList')}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#0F1111" />
            </TouchableOpacity>

            {otherUserPhoto ? (
              <Image
                source={{ uri: otherUserPhoto }}
                style={styles.headerAvatarImage}
              />
            ) : (
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>
                  {(otherUserName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>{itemName}</Text>
            </View>

            <TouchableOpacity 
              style={styles.headerMenuButton}
              onPress={() => setShowOptionsMenu(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#0F1111" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages.filter(msg => msg.content?.toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={item => item._id || item.createdAt}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={(
            <View style={styles.emptyThread}>
              <View style={styles.emptyThreadIcon}>
                <Ionicons name="chatbubbles-outline" size={28} color="#2F9E5B" />
              </View>
              <Text style={styles.emptyThreadTitle}>Start a conversation</Text>
              <Text style={styles.emptyThreadText}>Discuss delivery, handover, or anything about this item.</Text>
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          {attachments.length > 0 && (
            <FlatList
              horizontal
              data={attachments}
              keyExtractor={(attachment, index) => `${attachment.name}-${index}`}
              contentContainerStyle={styles.attachmentPreviewList}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: attachment, index }) => (
                <View style={styles.attachmentPreview}>
                  <Ionicons name={attachment.type?.startsWith('image/') ? 'image-outline' : 'document-outline'} size={16} color="#4CAF50" />
                  <Text style={styles.attachmentPreviewText} numberOfLines={1}>{attachment.name}</Text>
                  <TouchableOpacity onPress={() => removeAttachment(index)} accessibilityLabel={`Remove ${attachment.name}`}>
                    <Ionicons name="close-circle" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          
          {showAttachMenu && (
            <View style={styles.attachMenuContainer}>
              {[
                { icon: 'document', color: '#5F66CD', label: 'Document', onPress: chooseFile },
                { icon: 'camera', color: '#D3396D', label: 'Camera', onPress: openCamera },
                { icon: 'image', color: '#AC44CF', label: 'Gallery', onPress: chooseImage },
                { icon: 'headset', color: '#E95922', label: 'Audio', onPress: () => { setShowAttachMenu(false); Alert.alert('Coming Soon', 'Audio feature is not yet implemented.'); } },
                { icon: 'location', color: '#1DA661', label: 'Location', onPress: shareLocation },
                { icon: 'person', color: '#0A82E0', label: 'Contact', onPress: shareContact },
              ].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.attachMenuItem} onPress={item.onPress}>
                  <View style={[styles.attachMenuIconContainer, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={26} color="#FFFFFF" />
                  </View>
                  <Text style={styles.attachMenuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.composerRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message"
                placeholderTextColor="#8792A2"
                multiline
              />
              <TouchableOpacity style={styles.attachButton} onPress={() => setShowAttachMenu(!showAttachMenu)} accessibilityLabel="Attach">
                <Ionicons name="attach-outline" size={24} color="#8792A2" />
              </TouchableOpacity>
              {!inputText.trim() && (
                <TouchableOpacity style={styles.attachButton} onPress={chooseImage} accessibilityLabel="Add image">
                  <Ionicons name="camera" size={24} color="#8792A2" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() && attachments.length === 0) ? { opacity: 0.6 } : null]}
              onPress={() => sendMessage()}
              disabled={(!inputText.trim() && attachments.length === 0) || sending}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Options Menu Modal */}
      <Modal visible={showOptionsMenu} transparent animationType="fade" onRequestClose={() => setShowOptionsMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowOptionsMenu(false)} activeOpacity={1}>
          <View style={{ position: 'absolute', top: 50, right: 10, backgroundColor: '#FFF', borderRadius: 8, padding: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, minWidth: 150 }}>
            <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F2' }} onPress={() => { setShowOptionsMenu(false); setIsSearchMode(true); }}>
              <Text style={{ fontSize: 16, color: '#0F1111' }}>Search</Text>
            </TouchableOpacity>
            {isOwnItem && (
              <TouchableOpacity style={{ padding: 12 }} onPress={() => { 
                setShowOptionsMenu(false); 
                setOfferModalVisible(true);
              }}>
                <Text style={{ fontSize: 16, color: '#0F1111' }}>Send Custom Offer</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Send Custom Offer Modal */}
      <Modal visible={offerModalVisible} transparent animationType="fade" onRequestClose={() => setOfferModalVisible(false)}>
        <TouchableOpacity style={styles.deleteModalOverlay} onPress={() => setOfferModalVisible(false)} activeOpacity={1}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Send Custom Offer</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F2', borderRadius: 8, paddingHorizontal: 12, marginBottom: 20 }}>
              <Text style={{ fontSize: 18, color: '#0F1111', fontWeight: '500', marginRight: 8 }}>₹</Text>
              <TextInput
                style={{ flex: 1, height: 50, fontSize: 18, color: '#0F1111' }}
                placeholder="0.00"
                keyboardType="numeric"
                value={offerAmount}
                onChangeText={setOfferAmount}
                autoFocus
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setOfferModalVisible(false)}>
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 15, marginTop: 10, backgroundColor: '#00A884', borderRadius: 6 }} 
                onPress={handleSendOffer}
              >
                <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '700', textTransform: 'uppercase' }}>Send Offer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Message Modal */}
      <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
        <TouchableOpacity style={styles.deleteModalOverlay} onPress={() => setSelectedMessage(null)} activeOpacity={1}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete message?</Text>
            
            {selectedMessage?.sender === userId && (
              <TouchableOpacity style={styles.deleteModalOption} onPress={() => handleDeleteMessage('everyone')}>
                <Text style={styles.deleteModalText}>Delete for everyone</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.deleteModalOption} onPress={() => handleDeleteMessage('me')}>
              <Text style={styles.deleteModalText}>Delete for me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setSelectedMessage(null)}>
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={contactPickerVisible} transparent animationType="slide" onRequestClose={() => setContactPickerVisible(false)}>
        <View style={styles.contactModalOverlay}>
          <View style={styles.contactModalContainer}>
            <View style={styles.contactModalHeader}>
              <Text style={styles.contactModalTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setContactPickerVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#565959" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableContacts}
              keyExtractor={(item, index) => item.id || String(index)}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.contactItemContainer}
                  onPress={() => {
                    const text = `ðŸ‘¤ Contact: ${item.name}\nðŸ“ž ${item.phoneNumbers[0].number}`;
                    setInputText(prev => prev ? `${prev}\n${text}` : text);
                    setContactPickerVisible(false);
                  }}
                >
                  <View style={styles.contactIconWrapper}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>
                      {item.name ? item.name.charAt(0).toUpperCase() : '#'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal visible={locationPickerVisible} animationType="slide" transparent={false} onRequestClose={() => setLocationPickerVisible(false)}>
        <View style={styles.locModalContainer}>
          {/* Header */}
          <View style={styles.locModalHeader}>
            <TouchableOpacity onPress={() => { setLocationPickerVisible(false); setSelectedMapRegion(null); }}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.locModalTitle}>Send location</Text>
            <TouchableOpacity onPress={async () => {
              try {
                setCurrentLocation(null);
                setSelectedMapRegion(null);
                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setCurrentLocation(location);
              } catch (err) {
                Alert.alert('Error', 'Could not refresh your location.');
              }
            }}>
              <Ionicons name="refresh" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          {/* Map Area - fills all available space */}
          <View style={{ flex: 1, backgroundColor: '#E8E8E8' }}>
            {currentLocation && MapView ? (
              <View style={{ flex: 1 }}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  mapType={Platform.OS === 'android' ? 'none' : 'standard'}
                  initialRegion={{
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  onRegionChangeComplete={(region) => {
                    setSelectedMapRegion(region);
                  }}
                >
                  {Platform.OS === 'android' && UrlTile && (
                    <UrlTile
                      urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maximumZ={19}
                      flipY={false}
                    />
                  )}
                </MapView>
                {/* Center pin overlay */}
                <View style={[styles.locPinOverlay, { pointerEvents: 'none' }]}>
                  <Ionicons name="location" size={40} color="#DC2626" />
                </View>
              </View>
            ) : currentLocation ? (
              <View style={styles.locFallbackContainer}>
                <Ionicons name="map" size={80} color="#B0B7C3" />
                <Text style={styles.locFallbackTitle}>Location acquired</Text>
                <Text style={styles.locFallbackSubtitle}>Map preview not available</Text>
              </View>
            ) : (
              <View style={styles.locFallbackContainer}>
                <ActivityIndicator size="large" color="#00A884" style={{ marginBottom: 12 }} />
                <Text style={styles.locFallbackTitle}>Fetching your location...</Text>
              </View>
            )}
          </View>

          {/* Send Selected Map Location Button (when map is dragged) */}
          {selectedMapRegion && (
            <TouchableOpacity
              style={styles.locSendSelectedBtn}
              activeOpacity={0.8}
              onPress={() => {
                const lat = selectedMapRegion.latitude;
                const lng = selectedMapRegion.longitude;
                const mapUrl = `📍 Location: https://maps.google.com/?q=${lat},${lng}`;
                sendMessage(mapUrl);
                setLocationPickerVisible(false);
                setSelectedMapRegion(null);
              }}
            >
              <Ionicons name="navigate" size={20} color="#FFF" />
              <Text style={styles.locSendSelectedText}>Send this location</Text>
            </TouchableOpacity>
          )}

          {/* Bottom: Send Current Location */}
          <TouchableOpacity 
            style={[styles.locBottomOption, { opacity: currentLocation ? 1 : 0.5 }]}
            disabled={!currentLocation}
            activeOpacity={0.7}
            onPress={() => {
              const lat = currentLocation?.coords?.latitude;
              const lng = currentLocation?.coords?.longitude;
              const mapUrl = `📍 Location: https://maps.google.com/?q=${lat},${lng}`;
              sendMessage(mapUrl);
              setLocationPickerVisible(false);
              setSelectedMapRegion(null);
            }}
          >
            <View style={styles.locCurrentIconWrapper}>
              <Ionicons name="navigate" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locListText}>Send your current location</Text>
              {currentLocation && (
                <Text style={styles.locCurrentAccuracy}>
                  Accurate to {Math.round(currentLocation.coords.accuracy || 10)} meters
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
};

export default ChatThread;







