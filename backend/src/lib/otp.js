import OTP from '@/models/OTP';
import { sendOTP } from '@/lib/emailService';

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const createAndSendOtp = async (email, label) => {
  const latestOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
  if (latestOtp && Date.now() - latestOtp.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { error: 'Please wait before requesting another OTP.', status: 429 };
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await OTP.create({ email, otp_code: otpCode, expires_at: expiresAt });

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Send email — non-blocking: OTP is already saved in DB so we
    // return success even if nodemailer reports a transient error,
    // because Gmail often delivers the message despite SMTP quirks.
    sendOTP(email, otpCode, label).then((result) => {
      if (!result.success) {
        console.warn(`[OTP] Email reported failure for ${email} but OTP is in DB:`, result.error);
      } else {
        console.log(`[OTP] Email sent to ${email}`);
      }
    }).catch((err) => {
      console.warn(`[OTP] sendOTP threw unexpectedly for ${email}:`, err.message);
    });
  } else {
    console.log(`[DEV MODE] ${label} OTP for ${email} is ${otpCode}`);
  }
  return { expiresAt };
};

export const verifyOtp = async (email, otp) => {
  const latestOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
  if (!latestOtp) return { error: 'No OTP found for this email.', status: 400 };
  if (latestOtp.used_at) return { error: 'This OTP has already been used.', status: 400 };
  if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) return { error: 'Too many invalid attempts. Request a new OTP.', status: 429 };
  if (new Date() > latestOtp.expires_at) return { error: 'OTP code has expired.', status: 400 };

  if (latestOtp.otp_code !== String(otp || '').trim()) {
    latestOtp.attempts += 1;
    await latestOtp.save();
    return { error: 'Invalid OTP code.', status: 400 };
  }

  latestOtp.used_at = new Date();
  await latestOtp.save();
  return { otp: latestOtp };
};