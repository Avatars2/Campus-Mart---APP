let checkoutScript;

function loadCheckoutScript() {
  if (typeof window.Razorpay === 'function') return Promise.resolve();
  if (!checkoutScript) {
    checkoutScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        if (typeof window.Razorpay !== 'function') {
          checkoutScript = null;
          reject(new Error('Razorpay Checkout loaded without its payment SDK. Check the browser network or content-blocking settings.'));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        checkoutScript = null;
        reject(new Error('Could not load Razorpay Checkout. Check your internet connection or browser content-blocking settings.'));
      };
      document.body.appendChild(script);
    });
  }
  return checkoutScript;
}

export default async function openRazorpayCheckout(options) {
  await loadCheckoutScript();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const checkoutOptions = {
      ...options,
      handler: (response) => finish(resolve, response),
      modal: {
        ...options.modal,
        ondismiss: () => finish(reject, new Error('Payment was cancelled')),
      },
    };

    try {
      const checkout = new window.Razorpay(checkoutOptions);
      if (!checkout || typeof checkout.open !== 'function') {
        finish(reject, new Error('Razorpay Checkout did not initialize. Reload the page and try again.'));
        return;
      }
      if (typeof checkout.on === 'function') {
        checkout.on('payment.failed', (event) => {
          finish(reject, new Error(event.error?.description || 'Payment failed'));
        });
      }
      checkout.open();
    } catch (error) {
      finish(reject, new Error(error.message || 'Razorpay Checkout could not be initialized'));
    }
  });
}
