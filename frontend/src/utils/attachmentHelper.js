import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import client from '../api/client';

/**
 * Opens an attachment (PDF, document) matching the exact flow in ChatThread.js
 * @param {Object} file - { url, downloadUrl, openUrl, name, fileName, mimeType }
 */
export const openAttachment = async (file) => {
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
    const rawName = file.fileName || file.name || 'document.pdf';
    const decodedName = decodeURIComponent(rawName);
    const fileName = decodedName.replace(/[^a-zA-Z0-9._-]/g, '_');
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
        type: file.mimeType || 'application/pdf',
      });
    } else {
      await Sharing.shareAsync(downloadRes.uri, {
        UTI: file.mimeType || 'com.adobe.pdf',
        mimeType: file.mimeType || 'application/pdf',
      });
    }
  } catch (error) {
    console.error('Error opening attachment:', error);
    Alert.alert('Error', `Could not open file: ${error.message}`);
  }
};

