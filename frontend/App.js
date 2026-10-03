import * as React from 'react';
import { LogBox, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { CartWishlistProvider } from './src/context/CartWishlistContext';

import { MessageProvider } from './src/context/MessageContext';
import { NotificationProvider } from './src/context/NotificationContext';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
  'style.resizeMode is deprecated',
  'Push notification registration skipped',
  'Listening to push token changes is not yet fully supported on web'
]);

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('"shadow*" style props are deprecated') ||
          args[0].includes('props.pointerEvents is deprecated') ||
          args[0].includes('style.resizeMode is deprecated') ||
          args[0].includes('Listening to push token changes is not yet fully supported on web') ||
          args[0].includes('Push notification registration skipped')) {
        return;
      }
    }
    originalWarn(...args);
  };
}

export default function App() {
  return (
    <AuthProvider>
      <CartWishlistProvider>
        <MessageProvider>
          <NotificationProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </NotificationProvider>
        </MessageProvider>
      </CartWishlistProvider>
    </AuthProvider>
  );
}
