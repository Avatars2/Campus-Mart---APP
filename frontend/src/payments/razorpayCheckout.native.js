import { isRunningInExpoGo } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';

function waitForAppToBecomeActive(timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    let leftApp = AppState.currentState !== 'active';
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error('Payment page did not return to CampusMart. Reopen the app and check Orders before retrying.'));
    }, timeoutMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        leftApp = true;
      } else if (leftApp) {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }
    });
  });
}

export default async function openRazorpayCheckout(options) {
  if (isRunningInExpoGo()) {
    if (!options.hosted_checkout_url) {
      throw new Error('Razorpay hosted checkout URL is missing. Please try again.');
    }
    const checkoutUrl = new URL(options.hosted_checkout_url);
    if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'rzp.io') {
      throw new Error('Razorpay returned an invalid hosted checkout URL.');
    }
    const browserResult = await WebBrowser.openBrowserAsync(checkoutUrl.toString(), {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      showTitle: true,
      enableBarCollapsing: false,
    });
    return { hosted: true, type: browserResult.type };
  }

  const { default: RazorpayCheckout } = await import('react-native-razorpay');
  if (typeof RazorpayCheckout?.open !== 'function') {
    throw new Error(
      'Razorpay native checkout is not installed in this app build. Rebuild CampusMart after adding the Razorpay SDK.'
    );
  }
  return RazorpayCheckout.open(options);
}
