import { NextResponse } from 'next/server';
import { getRazorpayKeyId } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let key_id = searchParams.get('key_id') || '';
  if (!key_id) {
    try {
      key_id = getRazorpayKeyId();
    } catch (e) {
      // ignore
    }
  }
  const order_id = searchParams.get('order_id') || '';
  const amount = searchParams.get('amount') || '';
  const name = searchParams.get('name') || 'Campus Mart';
  const description = searchParams.get('description') || 'Campus Mart order';
  const redirect_url = searchParams.get('redirect_url') || 'campusmart://payment-complete';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${name}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justifyContent: center;
      min-height: 100vh;
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      text-align: center;
    }
    .card {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #E2E8F0;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #E2E8F0;
      border-top-color: #007185;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .brand {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .brand span { color: #007185; }
    .status-text {
      color: #334155;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .subtext {
      color: #64748B;
      font-size: 13px;
      line-height: 1.5;
    }
    .btn {
      margin-top: 20px;
      background: #007185;
      color: #FFFFFF;
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: none;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <div id="success-icon" style="display: none; font-size: 48px; margin-bottom: 12px;">✅</div>
    <div class="brand">Campus<span>Mart</span></div>
    <div class="status-text" id="status-title">Opening Razorpay Checkout...</div>
    <div class="subtext" id="status-desc">Please complete your payment securely in the popup window.</div>
    <button class="btn" id="retry-btn" onclick="openCheckout()">Tap to Open Payment</button>
    <a class="btn" id="return-btn" style="display: none; text-decoration: none;">Return to CampusMart</a>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var rzpInstance = null;

    function buildRedirectUrl(params) {
      var base = ${JSON.stringify(redirect_url)};
      var separator = base.indexOf('?') === -1 ? '?' : '&';
      var queryString = Object.keys(params).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      return base + separator + queryString;
    }

    function redirectToApp(params) {
      var target = buildRedirectUrl(params);
      var returnBtn = document.getElementById('return-btn');
      if (returnBtn) {
        returnBtn.href = target;
        returnBtn.style.display = 'block';
        returnBtn.innerText = params.status === 'success' ? 'Confirm Order & Return to App' : 'Return to App';
      }
      try {
        window.location.href = target;
      } catch (e) {}
      setTimeout(function() {
        try {
          window.location.replace(target);
        } catch (e) {}
      }, 300);
    }

    function openCheckout() {
      if (!window.Razorpay) {
        document.getElementById('status-title').innerText = "Loading Payment SDK...";
        setTimeout(openCheckout, 500);
        return;
      }

      var options = {
        key: ${JSON.stringify(key_id)},
        order_id: ${JSON.stringify(order_id)},
        amount: ${JSON.stringify(amount)},
        currency: "INR",
        name: ${JSON.stringify(name)},
        description: ${JSON.stringify(description)},
        theme: { color: "#007185" },
        handler: function(response) {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('success-icon').style.display = 'block';
          document.getElementById('status-title').innerText = "Payment Successful! 🎉";
          document.getElementById('status-desc').innerText = "Your payment was received. Returning automatically to CampusMart...";
          redirectToApp({
            status: 'success',
            razorpay_payment_id: response.razorpay_payment_id || '',
            razorpay_order_id: response.razorpay_order_id || '',
            razorpay_signature: response.razorpay_signature || ''
          });
        },
        modal: {
          ondismiss: function() {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('status-title').innerText = "Payment Cancelled";
            document.getElementById('status-desc').innerText = "Returning to CampusMart...";
            redirectToApp({ status: 'cancelled' });
          }
        }
      };

      try {
        rzpInstance = new window.Razorpay(options);
        rzpInstance.on('payment.failed', function(resp) {
          var desc = (resp && resp.error && resp.error.description) ? resp.error.description : 'Payment failed';
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('status-title').innerText = "Payment Failed";
          document.getElementById('status-desc').innerText = desc;
          redirectToApp({ status: 'failed', error: desc });
        });
        rzpInstance.open();
      } catch (err) {
        document.getElementById('status-title').innerText = "Unable to open payment";
        document.getElementById('status-desc').innerText = err.message || "Please tap below to retry";
        document.getElementById('retry-btn').style.display = 'block';
      }
    }

    window.onload = function() {
      setTimeout(openCheckout, 300);
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

