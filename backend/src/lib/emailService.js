import nodemailer from 'nodemailer';

const buildEmailHtml = (otpCode, label) => {
  const isLogin = label === 'Login';
  const heading = isLogin ? 'Login Verification' : 'Email Verification';
  const purpose = isLogin
    ? 'You requested to sign in to CampusMart using a one-time password.'
    : 'You are registering your BVM Engineering College account on CampusMart.';
  const action = isLogin ? 'Sign in with OTP' : 'Verify Your Email';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>CampusMart – ${heading}</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(20,33,61,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#14213D 0%,#0B5ED7 100%);padding:36px 32px;text-align:center;">
            <div style="display:inline-block;background:#FFFFFF;border-radius:20px;padding:12px 18px;margin-bottom:16px;">
              <span style="font-size:28px;font-weight:900;color:#14213D;letter-spacing:-1px;">Campus</span><span style="font-size:28px;font-weight:900;color:#0B5ED7;letter-spacing:-1px;">Mart</span>
            </div>
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${heading}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#14213D;">Hi there 👋</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.6;">${purpose}</p>

            <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#94A3B8;letter-spacing:1.5px;text-transform:uppercase;">Your verification code</p>

            <!-- OTP Block -->
            <div style="background:#F7F9FC;border:2px solid #E2E8F0;border-radius:16px;padding:28px 20px;text-align:center;margin-bottom:28px;">
              <span style="font-size:48px;font-weight:900;letter-spacing:14px;color:#14213D;font-family:'Courier New',monospace;">${otpCode}</span>
              <p style="margin:14px 0 0;font-size:13px;color:#94A3B8;">Expires in <strong style="color:#0B5ED7;">10 minutes</strong></p>
            </div>

            <!-- Action label -->
            <div style="background:#EAF2FF;border-radius:12px;padding:14px 18px;margin-bottom:28px;display:flex;align-items:center;">
              <span style="font-size:13px;color:#084298;font-weight:600;">🔒 ${action}: use the code above in the app.</span>
            </div>

            <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">
              If you did not request this, please ignore this email. Do not share this code with anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F7F9FC;padding:20px 32px;border-top:1px solid #E2E8F0;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#14213D;">CampusMart</p>
            <p style="margin:0;font-size:12px;color:#94A3B8;">Birla Vishvakarma Mahavidyalaya, V.V. Nagar, Anand</p>
            <p style="margin:8px 0 0;font-size:11px;color:#CBD5E1;">Buy. Sell. Connect. On Campus.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

export const sendOTP = async (email, otpCode, label = 'Verification') => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const subjectMap = {
    Login: 'Your CampusMart Login OTP',
    Registration: 'Verify your CampusMart account',
  };

  const mailOptions = {
    from: `"CampusMart" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subjectMap[label] || 'Your CampusMart Verification Code',
    html: buildEmailHtml(otpCode, label),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] OTP (${label}) sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Sending error:', error.message || error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
};

export const sendAccountLockoutEmail = async (email, studentName = 'Student', minutesLocked = 15) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[Email] Email credentials not configured, skipping lockout email');
    return { success: false };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"CampusMart Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '⚠️ Security Alert: CampusMart Account Temporarily Locked',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#F8FAFC;padding:32px;color:#1E293B;">
        <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;border:1px solid #E2E8F0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="display:inline-block;background:#FEE2E2;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">🔒</div>
          </div>
          <h2 style="color:#DC2626;text-align:center;margin:0 0 12px;font-size:20px;">Security Alert: Account Temporarily Locked</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">Hi ${studentName},</p>
          <p style="color:#475569;font-size:15px;line-height:1.6;">
            Your CampusMart account has been temporarily locked for <strong>${minutesLocked} minutes</strong> after <strong>5 consecutive failed password attempts</strong>.
          </p>
          <div style="background:#FFF1F2;border-left:4px solid #E11D48;padding:12px 16px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;color:#9F1239;font-size:14px;font-weight:600;">
              Your account will automatically unlock after ${minutesLocked} minutes.
            </p>
          </div>
          <p style="color:#64748B;font-size:14px;line-height:1.6;">
            If you forgot your password, you can reset it securely via the <em>"Forgot Password"</em> option in the CampusMart app once the cooldown finishes.
          </p>
          <p style="color:#94A3B8;font-size:12px;margin-top:28px;border-top:1px solid #F1F5F9;padding-top:16px;">
            If this wasn't you, your account credentials may be compromised. Please reset your password immediately upon account unlocking.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Account lockout notification sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send lockout notification:', error.message || error);
    return { success: false };
  }
};
