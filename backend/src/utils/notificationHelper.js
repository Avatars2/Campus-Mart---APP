import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { pusherServer } from '../lib/pusher.js';
import { messaging } from '../lib/firebase.js';

/**
 * Normalizes notification types to match schema enum
 */
const normalizeType = (rawType) => {
  if (!rawType) return 'SYSTEM';
  const upper = String(rawType).toUpperCase().replace(/[\s-]/g, '_');
  if (['MESSAGE', 'ORDER', 'SYSTEM', 'WISHLIST', 'REPORT', 'BUYING_REQUEST'].includes(upper)) {
    return upper;
  }
  if (upper.includes('BUY') || upper.includes('REQUEST')) return 'BUYING_REQUEST';
  if (upper.includes('WISH') || upper.includes('PRICE') || upper.includes('STOCK')) return 'WISHLIST';
  if (upper.includes('REPORT')) return 'REPORT';
  if (upper.includes('ORDER')) return 'ORDER';
  if (upper.includes('MSG') || upper.includes('CHAT')) return 'MESSAGE';
  return 'SYSTEM';
};

/**
 * Sends a notification via Database (In-App), Pusher (Real-time), and Firebase (Push)
 * @param {Object} params
 * @param {String} params.recipientId - ID of user receiving the notification (or params.userId)
 * @param {String} [params.senderId] - ID of user triggering the notification
 * @param {String} params.type - 'MESSAGE', 'ORDER', 'SYSTEM', 'WISHLIST', 'REPORT', 'BUYING_REQUEST'
 * @param {String} [params.subType] - 'PRICE_DROP', 'BACK_IN_STOCK', 'PAYOUT_DISBURSED', 'REFUND_PROCESSED', etc.
 * @param {String} params.title - Notification title
 * @param {String} params.body - Notification body (or params.message)
 * @param {String} [params.relatedId] - ID of related item/order/conversation/report
 * @param {String} [params.thumbnail] - Image URL (product cover or sender photo)
 * @param {Object} [params.actionUrl] - Direct navigation target { targetScreen, params }
 * @param {Object} [params.attachment] - Optional attachment { url, name, mimeType, size }
 */
export const sendNotification = async (params) => {
  try {
    const {
      recipientId,
      userId,
      senderId,
      type,
      subType,
      title,
      body,
      message,
      relatedId,
      thumbnail,
      actionUrl,
      attachment,
    } = params;

    const actualRecipientId = recipientId || userId;
    const actualBody = body || message || '';
    const actualType = normalizeType(type);

    if (!actualRecipientId) {
      console.warn('sendNotification skipped: No recipientId provided.');
      return null;
    }

    if (!title || !actualBody) {
      console.warn('sendNotification skipped: Missing title or body.');
      return null;
    }

    // 1. Save to Database
    const newNotification = new Notification({
      recipient: actualRecipientId,
      sender: senderId || null,
      type: actualType,
      subType: subType || null,
      title: String(title).trim(),
      body: String(actualBody).trim(),
      relatedId: relatedId || null,
      thumbnail: thumbnail || null,
      actionUrl: actionUrl || null,
      attachment: attachment || null,
    });
    const savedNotification = await newNotification.save();

    // Populate sender info if available for UI purposes
    const populatedNotification = await savedNotification.populate('sender', 'full_name profile_photo_url');

    // 2. Real-time In-App Update via Pusher
    try {
      await pusherServer.trigger(`user-${actualRecipientId}`, 'new:notification', populatedNotification);
    } catch (pusherErr) {
      console.warn(`Pusher notification delivery warning for user-${actualRecipientId}:`, pusherErr.message);
    }

    // 3. Push Notification via Firebase (if FCM token exists)
    try {
      const recipientUser = await User.findById(actualRecipientId).select('fcmToken');
      if (recipientUser && recipientUser.fcmToken) {
        const fcmPayload = {
          notification: {
            title: String(title).trim(),
            body: String(actualBody).trim(),
          },
          data: {
            type: actualType,
            subType: subType || '',
            relatedId: relatedId ? relatedId.toString() : '',
            notificationId: savedNotification._id.toString(),
            attachmentUrl: attachment?.url || '',
            thumbnail: thumbnail || '',
            targetScreen: actionUrl?.targetScreen || '',
            params: actionUrl?.params ? JSON.stringify(actionUrl.params) : '',
          },
          token: recipientUser.fcmToken,
        };

        await messaging.send(fcmPayload);
        console.log(`Push notification sent successfully to ${actualRecipientId}`);
      }
    } catch (fcmError) {
      console.warn(`Failed to send push notification to ${actualRecipientId}:`, fcmError.message);
      // We don't throw here so the main function doesn't fail if just push fails
    }

    return savedNotification;
  } catch (error) {
    console.error('Error in sendNotification helper:', error);
    throw error;
  }
};
