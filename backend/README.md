This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Razorpay marketplace payments

For step-by-step Partner credentials, seller onboarding, webhook, and local ngrok setup, see [RAZORPAY-PARTNER-SETUP.md](./RAZORPAY-PARTNER-SETUP.md).

Configure these backend-only environment variables before using online checkout:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CRON_SECRET`
- `RAZORPAY_PARTNER_KEY_ID`
- `RAZORPAY_PARTNER_KEY_SECRET`
- `RAZORPAY_PARTNER_WEBHOOK_SECRET`
- `RAZORPAY_SELLER_BUSINESS_SUBCATEGORY`

Never put the key secret or webhook secret in the frontend or commit them to source control. The backend returns only the public key ID to Checkout.

Enable Razorpay Route and the Partner APIs for the platform account. The Partner API credentials are distinct from the standard Razorpay Checkout API keys. Set `RAZORPAY_SELLER_BUSINESS_SUBCATEGORY` to a subcategory explicitly approved for your Partner account by Razorpay; the app submits individual sellers only.

Sellers submit their individual KYC and bank settlement fields in Campus Mart's Payment screen. The backend forwards them to Razorpay Partner APIs and does not persist the submitted values. Configure a separate Razorpay Partner webhook pointing to `<backend-origin>/api/users/payment-account/webhook`, set its secret as `RAZORPAY_PARTNER_WEBHOOK_SECRET`, and subscribe to the supported account status events. The webhook is matched by the linked account ID and the backend retrieves account and payment-product status from Razorpay. Listings and payouts stay disabled until both are activated.

For local development, use a public HTTPS tunnel for the backend webhook. The tunnel and backend must remain running while Razorpay calls the webhook.

Configure the Razorpay webhook URL as `/api/payments/webhook` and subscribe to `payment.captured`, `payment.failed`, `payment_link.paid`, and `payment_link.expired`. The webhook signing secret must match `RAZORPAY_WEBHOOK_SECRET`.

Schedule an authenticated `POST /api/payments/expire` request at least once per minute with `Authorization: Bearer <CRON_SECRET>`. Checkout and payment-status requests also reconcile expired attempts, but the scheduled job releases reservations for abandoned checkouts even when the buyer does not return to the app.

Checkout attempts expire after five minutes. Orders remain unconfirmed unless the backend verifies a captured Razorpay payment. Seller transfers are held until every order in that payment is marked completed by the buyer, then sent using Razorpay Route. This is a deferred payout workflow, not escrow; confirm with Razorpay that the platform's approved Route/funds-flow configuration supports this timing before using live payments.

Failed seller transfers can be reviewed in the seller payment history and retried by an administrator with `POST /api/admin/payments/{paymentId}/seller-transfers`.

A capture received after the five-minute deadline is recorded as `needs_review`; its order is not confirmed and inventory is released. Support must reconcile/refund those payments through the Razorpay Dashboard. Online sale cancellation/refund actions are intentionally blocked in-app until a refund workflow is implemented.
