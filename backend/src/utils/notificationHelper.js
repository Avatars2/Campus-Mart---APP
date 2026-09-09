import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { pusherServer } from '../lib/pusher.js';
import { messaging } from '../lib/firebase.js';

/**
 * Sends a notification via Database (In-App), Pusher (Real-time), and Firebase (Push)
 * @param {Object} params
 * @param {String} params.recipientId - ID of the user receiving the notification
 * @param {String} [params.senderId] - ID of the user triggering the notification
 * @param {String} params.type - 'MESSAGE', 'ORDER', 'SYSTEM'
 * @param {String} params.title - Notification title
 * @param {String} params.body - Notification body
 * @param {String} [params.relatedId] - ID of related item/order/conversation
 */
export const sendNotification = async ({ recipientId, senderId, type, title, body, relatedId }) => {
  try {
    // 1. Save to Database
    const newNotification = new Notification({
      recipient: recipientId,
      sender: senderId || null,
      type,
      title,
      body,
      relatedId: relatedId || null,
    });
    const savedNotification = await newNotification.save();
    
    // Populate sender info if available for UI purposes
    const populatedNotification = await savedNotification.populate('sender', 'full_name profile_photo_url');

    // 2. Real-time In-App Update via Pusher
    await pusherServer.trigger(`user-${recipientId}`, 'new:notification', populatedNotification);

    // 3. Push Notification via Firebase (if FCM token exists)
    const recipientUser = await User.findById(recipientId).select('fcmToken');
    if (recipientUser && recipientUser.fcmToken) {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type,
          relatedId: relatedId ? relatedId.toString() : '',
          notificationId: savedNotification._id.toString(),
        },
        token: recipientUser.fcmToken,
      };

      try {
        await messaging.send(message);
        console.log(`Push notification sent successfully to ${recipientId}`);
      } catch (fcmError) {
        console.error(`Failed to send push notification to ${recipientId}:`, fcmError);
        // We don't throw here so the main function doesn't fail if just push fails
      }
    }

    return savedNotification;
  } catch (error) {
    console.error('Error in sendNotification helper:', error);
    throw error;
  }
};
