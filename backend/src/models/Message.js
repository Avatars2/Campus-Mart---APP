import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  attachment: {
    url: {
      type: String,
      default: null,
    },
      downloadUrl: {
        type: String,
        default: null,
      },
    fileName: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    resourceType: {
      type: String,
      default: null,
    },
    bytes: {
      type: Number,
      default: null,
    },
  },
  attachments: {
    type: [{
      url: { type: String, required: true },
      downloadUrl: { type: String, default: null },
      fileName: { type: String, default: 'Attachment' },
      mimeType: { type: String, default: 'application/octet-stream' },
      resourceType: { type: String, default: null },
      bytes: { type: Number, default: null },
    }],
    default: [],
  },
  delivered: {
    type: Boolean,
    default: false,
  },
  read: {
    type: Boolean,
    default: false,
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }]
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
