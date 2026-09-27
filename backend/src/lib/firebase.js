import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let messagingInstance = null;

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized successfully');
    }
    messagingInstance = getMessaging();
  } catch (error) {
    console.error('Firebase admin initialization error:', error.message);
  }
} else {
  console.warn('Firebase Admin: Missing env vars. Push notifications disabled.');
}

export const messaging = messagingInstance;
