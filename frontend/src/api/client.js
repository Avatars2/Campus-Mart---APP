import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, DeviceEventEmitter } from 'react-native';

// Your laptop's local Wi-Fi IP address (run `ipconfig` to get this if it changes)
// ⚠️ Important: Change this if your Wi-Fi IP changes (e.g. different network)
const LOCAL_IP = '10.115.13.91';

// Backend runs on Next.js at port 3000
export const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
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

// Flag and queue for silent token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request hasn't been retried yet
    const requestUrl = originalRequest?.url || '';
    const isAuthRoute = requestUrl.includes('/auth/login') ||
                        requestUrl.includes('/auth/refresh') ||
                        requestUrl.includes('/auth/register') ||
                        requestUrl.includes('/auth/send-login-otp') ||
                        requestUrl.includes('/auth/verify-login-otp') ||
                        requestUrl.includes('/auth/forgot-password') ||
                        requestUrl.includes('/auth/reset-password');

    if (error.response && error.response.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');

        // Request a fresh access token using the rotating refresh token
        const refreshResponse = await axios.post(
          `${getBaseUrl()}/auth/refresh`,
          { refreshToken: storedRefreshToken }
        );

        const newAccessToken = refreshResponse.data?.token;
        const newRefreshToken = refreshResponse.data?.refreshToken;

        if (newAccessToken) {
          await AsyncStorage.setItem('token', newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
          }

          client.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          isRefreshing = false;
          return client(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;

        // Refresh token failed or expired -> force logout
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('userInfo');
        await AsyncStorage.removeItem('userRole');
        DeviceEventEmitter.emit('AUTH_ERROR', { isSuspended: false });
        return Promise.reject(refreshErr);
      }
    }

    // Handle account suspensions or unrecoverable session expiry
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const isSuspended = error.response.data?.isSuspended || error.response.data?.error?.toLowerCase().includes('suspended');
      if (isSuspended) {
        DeviceEventEmitter.emit('AUTH_ERROR', { isSuspended: true });
      } else if (error.response.status === 401 && !isAuthRoute) {
        DeviceEventEmitter.emit('AUTH_ERROR', { isSuspended: false });
      }
    }

    return Promise.reject(error);
  }
);

export default client;
