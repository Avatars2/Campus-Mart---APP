import { isRunningInExpoGo } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import { getBaseUrl } from '../api/client';

export default async function openRazorpayCheckout(options) {
  if (isRunningInExpoGo()) {
    const apiBase = getBaseUrl();
    const params = new URLSearchParams();
    if (options.key) params.append('key_id', options.key);
    if (options.order_id) params.append('order_id', options.order_id);
    if (options.amount) params.append('amount', options.amount);
    if (options.currency) params.append('currency', options.currency);
    if (options.name) params.append('name', options.name);
    if (options.description) params.append('description', options.description);
    params.append('redirect_url', 'campusmart://payment-complete');

    // Always use unified Razorpay Checkout web modal endpoint so mobile gets the exact same UI and Order ID as web
    const checkoutUrlString = `${apiBase}/payments/checkout-page?${params.toString()}`;

    const redirectUrl = 'campusmart://payment-complete';
    let browserResult;
    try {
      browserResult = await WebBrowser.openAuthSessionAsync(checkoutUrlString, redirectUrl);
    } catch (e) {
      browserResult = await WebBrowser.openBrowserAsync(checkoutUrlString, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        showTitle: true,
        enableBarCollapsing: false,
      });
    }

    if (browserResult.type === 'success' && browserResult.url) {
      try {
        const parsed = new URL(browserResult.url);
        const pId = parsed.searchParams.get('razorpay_payment_id');
        const oId = parsed.searchParams.get('razorpay_order_id') || options.order_id;
        const sig = parsed.searchParams.get('razorpay_signature');
        const status = parsed.searchParams.get('status');
        const linkStatus = parsed.searchParams.get('razorpay_payment_link_status');

        if (status === 'success' || linkStatus === 'paid' || pId) {
          return {
            hosted: true,
            type: 'success',
            razorpay_payment_id: pId || null,
            razorpay_order_id: oId,
            razorpay_signature: sig,
          };
        }
        if (status === 'cancelled' || status === 'failed') {
          return { hosted: true, type: 'cancel', error: parsed.searchParams.get('error') };
        }
      } catch (err) {
        // ignore parse error
      }
    }

    return { hosted: true, type: browserResult.type || 'cancel' };
  }

  const { default: RazorpayCheckout } = await import('react-native-razorpay');
  if (typeof RazorpayCheckout?.open !== 'function') {
    throw new Error(
      'Razorpay native checkout is not installed in this app build. Rebuild CampusMart after adding the Razorpay SDK.'
    );
  }
  return RazorpayCheckout.open(options);
}
