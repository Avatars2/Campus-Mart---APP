import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your laptop's local Wi-Fi IP address (run `ipconfig` to get this if it changes)
// ⚠️ Important: Change this if your Wi-Fi IP changes (e.g. different network)
const LOCAL_IP = '10.25.218.91';

// Backend runs on Next.js at port 3000
const getBaseUrl = () => {
  if (Platform.OS === 'android' && !__DEV__) {
    // Production APK — replace with your deployed backend URL
    return 'https://your-production-backend.com/api';
  }
  // Development (Expo Go on real phone, Android Emulator, iOS Simulator)
  return `http://${LOCAL_IP}:3000/api`;
};

const client = axios.create({
  baseURL: getBaseUrl(),
});

client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
