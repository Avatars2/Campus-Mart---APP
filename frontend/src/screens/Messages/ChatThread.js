import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image, Linking, Alert } from 'react-native';
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

const ChatThread = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
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
  
  const { itemId: rawItemId, otherUserId: rawOtherUserId, itemName, otherUserName, otherUserPhoto } = route.params;
  
  // Normalize IDs in case they were passed as objects from stale navigation state
  const itemId = typeof rawItemId === 'object' ? (rawItemId._id || rawItemId.id) : rawItemId;
  const otherUserId = typeof rawOtherUserId === 'object' ? (rawOtherUserId._id || rawOtherUserId.id) : rawOtherUserId;

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
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
    if ((!inputText.trim() && attachments.length === 0) || !userId || !otherUserId || !itemId || sending) return;
    
    const content = inputText.trim();
    setInputText('');
    const selectedAttachments = attachments;
    setAttachments([]);
    setSending(true);
    
    const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const optimisticMessage = {
      _id: tempId,
      optimisticId: tempId,
      sender: userId,
      receiver: otherUserId,
      item: itemId,
      content: content,
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
      formData.append('content', content);

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

  const shareLocation = async () => {
    setShowAttachMenu(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow location access to share your location.');
      return;
    }
    
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      const mapUrl = `📍 Location: https://maps.google.com/?q=${latitude},${longitude}`;
      
      setInputText(prev => prev ? `${prev}\n${mapUrl}` : mapUrl);
    } catch (error) {
      console.error('Location Error:', error);
      Alert.alert('Error', 'Could not fetch your location.');
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
        pageSize: 20,
      });
      
      const validContacts = data.filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0).slice(0, 3);
      
      if (validContacts.length > 0) {
        Alert.alert(
          'Select Contact (Preview)', 
          'Choose one of your recent contacts to share:',
          [
            ...validContacts.map(c => ({
              text: c.name,
              onPress: () => {
                const text = `👤 Contact: ${c.name}\n📞 ${c.phoneNumbers[0].number}`;
                setInputText(prev => prev ? `${prev}\n${text}` : text);
              }
            })),
            { text: 'Cancel', style: 'cancel' }
          ]
        );
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

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender === userId;
    const messageAttachments = getMessageAttachments(item);
    
    return (
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}>
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
        {item.content ? <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>{item.content}</Text> : null}
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
    <View style={styles.container}>
      {/* WhatsApp-style Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MessageList')}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
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
              <TouchableOpacity style={styles.attachMenuItem} onPress={chooseFile}>
                <View style={[styles.attachMenuIconContainer, { backgroundColor: '#5F66CD' }]}>
                  <Ionicons name="document" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.attachMenuText}>Document</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.attachMenuItem} onPress={openCamera}>
                <View style={[styles.attachMenuIconContainer, { backgroundColor: '#D3396D' }]}>
                  <Ionicons name="camera" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.attachMenuText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachMenuItem} onPress={chooseImage}>
                <View style={[styles.attachMenuIconContainer, { backgroundColor: '#AC44CF' }]}>
                  <Ionicons name="image" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.attachMenuText}>Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.attachMenuItem} onPress={() => { setShowAttachMenu(false); Alert.alert('Coming Soon', 'Audio feature is not yet implemented.'); }}>
                <View style={[styles.attachMenuIconContainer, { backgroundColor: '#E95922' }]}>
                  <Ionicons name="headset" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.attachMenuText}>Audio</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.attachMenuItem} onPress={shareLocation}>
                <View style={[styles.attachMenuIconContainer, { backgroundColor: '#1DA661' }]}>
                  <Ionicons name="location" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.attachMenuText}>Location</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.attachMenuItem} onPress={shareContact}>
                <View style={[styles.attachMenuIconContainer, { backgroundColor: '#0A82E0' }]}>
                  <Ionicons name="person" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.attachMenuText}>Contact</Text>
              </TouchableOpacity>
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
              onPress={sendMessage}
              disabled={(!inputText.trim() && attachments.length === 0) || sending}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatThread;
