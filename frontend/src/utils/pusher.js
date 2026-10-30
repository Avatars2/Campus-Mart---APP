import Pusher from 'pusher-js';

let pusherInstance = null;

const resolvePusherConstructor = () => {
  if (typeof Pusher === 'function') return Pusher;
  if (Pusher && typeof Pusher.default === 'function') return Pusher.default;
  if (Pusher && typeof Pusher.Pusher === 'function') return Pusher.Pusher;
  if (typeof window !== 'undefined' && typeof window.Pusher === 'function') return window.Pusher;
  return null;
};

/**
 * Returns a shared Pusher client instance.
 * Ensures a single WebSocket connection across the application.
 */
export const getPusherClient = () => {
  if (!pusherInstance) {
    const PusherConstructor = resolvePusherConstructor();
    if (!PusherConstructor) {
      console.error('[Pusher] Constructor could not be resolved from pusher-js');
      return null;
    }

    const key = process.env.EXPO_PUBLIC_PUSHER_KEY || 'afe7301a919a15389f86';
    const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'ap2';

    try {
      pusherInstance = new PusherConstructor(key, {
        cluster,
        forceTLS: true,
      });

      if (typeof window !== 'undefined') {
        PusherConstructor.logToConsole = true;
      }
      console.log('[Pusher] Initialized successfully with cluster:', cluster);
    } catch (err) {
      console.error('[Pusher] Initialization error:', err);
      return null;
    }
  }
  return pusherInstance;
};

export default getPusherClient;
