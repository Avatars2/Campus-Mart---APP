import Pusher from 'pusher';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '12345',
  key: process.env.PUSHER_KEY || 'fake_key',
  secret: process.env.PUSHER_SECRET || 'fake_secret',
  cluster: process.env.PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});
