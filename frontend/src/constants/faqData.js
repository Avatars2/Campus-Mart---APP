export const FAQ_CATEGORIES = [
  { id: 'all', label: 'All Questions', icon: 'apps-outline' },
  { id: 'buyer', label: 'Buyer Guide', icon: 'cart-outline' },
  { id: 'seller', label: 'Seller Guide', icon: 'pricetag-outline' },
  { id: 'payment', label: 'Payments & Refunds', icon: 'card-outline' },
  { id: 'orders', label: 'Delivery & Returns', icon: 'cube-outline' },
  { id: 'safety', label: 'Campus Safety', icon: 'shield-checkmark-outline' },
];

export const FAQ_ITEMS = [
  // ── BUYER QUESTIONS ──
  {
    id: 'b-purchase',
    category: 'buyer',
    question: 'How do I purchase or rent an item on CampusMart?',
    answer:
      '1. Browse categories or use the search bar to find textbooks, lab gear, calculators, electronics, or dorm essentials.\n2. Tap an item to view photos, price, description, condition, and seller details.\n3. Tap "Add to Cart" or "Buy Now" (or "Rent" if available).\n4. Choose your payment method (Online via Razorpay or Cash on Handover) and confirm your order.',
  },
  {
    id: 'b-delivery',
    category: 'orders',
    question: 'How does item delivery or meetup work on campus?',
    answer:
      'CampusMart is an exclusive on-campus marketplace, so transactions happen face-to-face!\n• Coordinate with the seller via built-in Chat to decide on a convenient, public campus meeting spot (e.g., Central Library, College Canteen, Main Gate, or Department Foyer).\n• Meet in person, inspect the item carefully, and confirm handover completion in the app.',
  },
  {
    id: 'b-payment',
    category: 'payment',
    question: 'What payment options are available for buyers?',
    answer:
      '• Online Payment: Pay securely via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, or Net Banking powered by Razorpay.\n• Cash on Handover (COD): Pay cash directly to the seller when you meet in person on campus after inspecting the item.',
  },
  {
    id: 'b-cancel',
    category: 'orders',
    question: 'Can I cancel an order? How do cancellations work?',
    answer:
      'Yes, you can cancel your order before the seller has marked it as handed over:\n1. Open your Orders / Buy screen.\n2. Tap the order you wish to cancel.\n3. Tap "Cancel Order" and select a reason.\n• If paid online, your refund will be automatically initiated to your original payment method (typically credited within 3-5 business days).',
  },
  {
    id: 'b-return',
    category: 'orders',
    question: 'What if an item is damaged or not as described (Returns & Refunds)?',
    answer:
      '• For Cash Orders: Always inspect the item thoroughly during the on-campus meetup BEFORE paying. If unsatisfied, you can decline the handover on the spot.\n• For Online Orders: If an item received does not match the description or is malfunctioning, immediately report the order via "Support & Safety > Reports" or reach out to the Admin. Our team will verify the case and issue a full refund if the item was misrepresented.',
  },
  {
    id: 'b-renting',
    category: 'buyer',
    question: 'How does item rental work?',
    answer:
      '• Select the rental duration (days or weeks) on the item page.\n• Pay the rental fee online or cash.\n• Use the item responsibly and return it in original condition before the due date agreed with the owner.\n• If a security deposit was charged, the seller will refund it upon receiving the item back safely.',
  },

  // ── SELLER QUESTIONS ──
  {
    id: 's-list',
    category: 'seller',
    question: 'How do I list an item for sale or rent?',
    answer:
      '1. Tap the "Sell" tab at the bottom navigation bar.\n2. Take or upload high-quality, authentic photos of your item.\n3. Fill in title, description, category, and actual condition (Like New, Good, or Fair).\n4. Select listing type: "Sell" or "Rent", enter your price, and publish.',
  },
  {
    id: 's-payout',
    category: 'payment',
    question: 'How and when do I get paid for my sales?',
    answer:
      '• Online Orders: Go to "Profile > Payments" and connect your bank account or UPI details via Razorpay Linked Account. Once the handover is confirmed, payouts are automatically routed to your bank account.\n• Cash Orders: Collect cash directly from the student buyer during the in-person campus handover.',
  },
  {
    id: 's-handover',
    category: 'seller',
    question: 'How do I complete a delivery/handover as a seller?',
    answer:
      '1. When a buyer places an order, you will receive an in-app notification.\n2. Chat with the buyer to pick a safe campus location and time.\n3. Hand over the item and mark the order as delivered/completed in your seller dashboard.',
  },
  {
    id: 's-buyer-noshow',
    category: 'orders',
    question: 'What happens if a buyer cancels or does not show up?',
    answer:
      '• If a buyer cancels, the reserved item is automatically returned to active listings so other students can buy it.\n• If a buyer does not show up or stops responding, you can cancel the order from your seller panel to release your stock.',
  },
  {
    id: 's-edit-delete',
    category: 'seller',
    question: 'Can I edit or delete my listing after publishing?',
    answer:
      'Yes! Navigate to your listings, select the item, and tap "Edit" to update the price, photos, or description, or tap "Delete" to unlist it permanently.',
  },

  // ── CAMPUS SAFETY & RULES ──
  {
    id: 'safe-meetup',
    category: 'safety',
    question: 'What are the top safety guidelines for campus transactions?',
    answer:
      '• Always meet in busy, well-lit campus areas (e.g., college canteen, library entrance, student center) during daylight hours.\n• Never share your account passwords, OTPs, or private banking credentials.\n• For valuable electronics (laptops, phones, scientific calculators), test all buttons, ports, and battery life before finalizing.',
  },
  {
    id: 'safe-report',
    category: 'safety',
    question: 'How do I report a suspicious user or prohibited item?',
    answer:
      '• Tap the flag/report icon on any listing or user profile, or go to "Profile > Support & Safety > Reports".\n• Choose the violation category (e.g., fake item, scam attempt, prohibited item) and add details.\n• CampusMart admins review reports promptly and take strict actions, including permanent bans for bad actors.',
  },
  {
    id: 'safe-admin-help',
    category: 'safety',
    question: 'How can I contact the CampusMart Admin directly?',
    answer:
      'Use the Call or Email buttons at the top of this Help screen to connect with the Admin directly. You can discuss unresolved disputes, technical bugs, account recovery, or urgent safety issues.',
  },
];

