import { createHmac, timingSafeEqual } from 'node:crypto';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAY_PARTNER_API_BASE = 'https://api.razorpay.com/v2';

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return { keyId, keySecret };
}

export function getRazorpayKeyId() {
  return getCredentials().keyId;
}

export async function razorpayRequest(path, method = 'GET', body) {
  const { keyId, keySecret } = getCredentials();
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = result.error?.description || result.error?.reason;
    throw new Error(providerMessage || `Razorpay request failed with status ${response.status}`);
  }
  return result;
}

export async function razorpayPartnerRequest(path, method = 'GET', body) {
  const keyId = process.env.RAZORPAY_PARTNER_KEY_ID;
  const keySecret = process.env.RAZORPAY_PARTNER_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay Partner API is not configured. Set RAZORPAY_PARTNER_KEY_ID and RAZORPAY_PARTNER_KEY_SECRET.');
  }
  const isMultipart = body instanceof FormData;
  const response = await fetch(`${RAZORPAY_PARTNER_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      ...(body && !isMultipart ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: isMultipart ? body : JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Razorpay Partner API request failed with status ${response.status}`);
  }
  return result;
}

function safeHexCompare(expected, provided) {
  if (typeof provided !== 'string' || !/^[a-f\d]+$/i.test(provided) || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
}

export function verifyCheckoutSignature(orderId, paymentId, signature) {
  const { keySecret } = getCredentials();
  const expected = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeHexCompare(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Razorpay webhooks are not configured. Set RAZORPAY_WEBHOOK_SECRET.');
  }
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeHexCompare(expected, signature);
}

export function verifyRazorpayPartnerWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Razorpay Partner webhooks are not configured. Set RAZORPAY_PARTNER_WEBHOOK_SECRET.');
  }
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeHexCompare(expected, signature);
}

export async function createRazorpayOrder({ amount, currency, receipt, notes }) {
  const payload = {
    amount,
    currency,
    receipt,
    notes,
  };
  return razorpayRequest('/orders', 'POST', payload);
}

export async function createRazorpayPaymentLink({ amount, currency, referenceId, description, notes, expiresAt, callbackUrl }) {
  const payload = {
    amount,
    currency,
    reference_id: referenceId,
    description,
    notes,
    notify: { sms: false, email: false },
    reminder_enable: false,
    callback_url: callbackUrl || 'campusmart://payment-complete',
    callback_method: 'get',
  };
  // Razorpay payment links require expire_by to be at least 15 minutes in future
  if (expiresAt) {
    const expireTimestamp = Math.floor(expiresAt.getTime() / 1000);
    const minTimestamp = Math.floor(Date.now() / 1000) + 16 * 60;
    payload.expire_by = Math.max(expireTimestamp, minTimestamp);
  }
  return razorpayRequest('/payment_links', 'POST', payload);
}


function normalizePartnerStatus(entity) {
  const status = entity?.activation_status || entity?.status;
  if (entity?.activated === true) return 'activated';
  return ['activated', 'rejected', 'suspended', 'under_review', 'needs_clarification'].includes(status)
    ? status
    : 'pending';
}

export async function getRazorpayLinkedAccountStatus(accountId, productId) {
  try {
    if (process.env.RAZORPAY_PARTNER_KEY_ID && process.env.RAZORPAY_PARTNER_KEY_SECRET) {
      const account = await razorpayPartnerRequest(`/accounts/${encodeURIComponent(accountId)}`);
      const accountStatus = normalizePartnerStatus(account);
      if (!productId) return accountStatus === 'activated' ? 'pending' : accountStatus;
      const product = await razorpayPartnerRequest(
        `/accounts/${encodeURIComponent(accountId)}/products/${encodeURIComponent(productId)}`
      );
      const productStatus = normalizePartnerStatus(product);
      if (['rejected', 'suspended', 'needs_clarification', 'under_review'].includes(productStatus)) {
        return productStatus;
      }
      if (accountStatus !== 'activated') return accountStatus;
      return productStatus === 'activated' ? 'activated' : 'pending';
    }
    const account = await razorpayRequest(`/accounts/${encodeURIComponent(accountId)}`);
    return ['activated', 'rejected', 'suspended'].includes(account.status) ? account.status : 'pending';
  } catch {
    return 'activated';
  }
}

export async function createRazorpayRefund(paymentId, { amount, notes } = {}) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/refund`, 'POST', {
    ...(amount ? { amount } : {}),
    notes,
  });
}

export async function createRazorpayTransfer(paymentId, { account, amount, currency = 'INR', notes } = {}) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/transfers`, 'POST', {
    transfers: [{
      account,
      amount,
      currency,
      notes,
    }],
  });
}

export async function createRazorpayStandardLinkedAccount({ email, phone, name, legalBusinessName, bankAccount }) {
  return razorpayRequest('/accounts', 'POST', {
    email,
    phone,
    type: 'route',
    legal_business_name: legalBusinessName || name,
    business_type: 'individual',
    contact_name: name,
    profile: {
      category: 'ecommerce',
      subcategory: 'ecommerce_marketplace',
      addresses: {
        registered: {
          street1: 'Campus Mart Hostels',
          city: 'Campus',
          state: 'State',
          postal_code: 110001,
          country: 'IN',
        },
      },
    },
    settlements: {
      account_number: bankAccount.account_number,
      ifsc_code: bankAccount.ifsc_code,
      beneficiary_name: bankAccount.beneficiary_name || name,
    },
  });
}
