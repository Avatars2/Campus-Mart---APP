import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { CartWishlistProvider } from './src/context/CartWishlistContext';

import { MessageProvider } from './src/context/MessageContext';
import { NotificationProvider } from './src/context/NotificationContext';

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
