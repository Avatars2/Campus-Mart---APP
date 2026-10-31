export const FAQ_CATEGORIES = [
  { id: 'all', label: 'All Questions', icon: 'apps-outline' },
  { id: 'buyer', label: 'Buyer Guide', icon: 'cart-outline' },
  { id: 'seller', label: 'Seller Guide', icon: 'pricetag-outline' },
  { id: 'payment', label: 'Payments & UPI', icon: 'card-outline' },
  { id: 'orders', label: 'Delivery & Returns', icon: 'cube-outline' },
  { id: 'requests', label: 'Buying Requests', icon: 'megaphone-outline' },
  { id: 'account', label: 'Account & Login', icon: 'person-circle-outline' },
  { id: 'safety', label: 'Campus Safety', icon: 'shield-checkmark-outline' },
];

export const FAQ_ITEMS = [
  // ── BUYER QUESTIONS ──
  {
    id: 'b-purchase',
    category: 'buyer',
    question: 'How do I purchase an item on CampusMart?',
    answer:
      '1. Browse categories or use the search bar to find textbooks, lab gear, drafters, electronics, or dorm essentials.\n2. Tap an item to check authentic photos, condition rating (Like New, Good, Fair), and seller details.\n3. Tap "Buy Now" or "Add to Cart".\n4. Choose your payment method (Online via UPI/Cards or Cash on Handover) and confirm your order.',
  },
  {
    id: 'b-renting',
    category: 'buyer',
    question: 'How does item rental work on CampusMart?',
    answer:
      '• Items marked "For Rent" can be leased for a set period (Per Hour, Per Day, or Per Month).\n• The listing shows the exact rental fee and period.\n• Coordinate the handover location with the owner via built-in Chat.\n• Use the item responsibly and return it in original condition before the due date agreed with the owner.',
  },
  {
    id: 'b-delivery',
    category: 'buyer',
    question: 'How does item delivery or meetup work on campus?',
    answer:
      'CampusMart is an exclusive on-campus marketplace, so transactions happen face-to-face!\n• Use the built-in Chat to decide on a convenient, public campus meetup spot (e.g. Central Library, College Canteen, Main Gate, or Department Foyer).\n• Meet in person, inspect the item thoroughly, and confirm the handover.',
  },
  {
    id: 'b-inspect',
    category: 'buyer',
    question: 'Can I inspect the item before confirming the handover?',
    answer:
      'Yes, absolutely! We strongly advise every buyer to inspect the item, check all pages of textbooks, test electronic buttons/ports, and verify physical condition before handing over cash or confirming order receipt in the app.',
  },

  // ── SELLER QUESTIONS ──
  {
    id: 's-list',
    category: 'seller',
    question: 'How do I list an item for sale or rent?',
    answer:
      '1. Tap the "Sell" tab on the bottom navigation bar.\n2. Take or upload high-resolution photos of your actual item.\n3. Enter the title, description, category, and honest condition rating.\n4. Select whether you are Selling or Renting (with hourly/daily/monthly rates), enter your price, and publish.',
  },
  {
    id: 's-edit-delete',
    category: 'seller',
    question: 'Can I edit or delete my listing after publishing?',
    answer:
      'Yes! Open the item page or go to your active listings, tap "Edit" to modify the price, photos, or description, or tap "Delete" to permanently unlist it if it has been sold.',
  },
  {
    id: 's-buyer-noshow',
    category: 'seller',
    question: 'What happens if a buyer cancels or does not show up?',
    answer:
      '• If a buyer cancels, the item is immediately restored to active listings so other students can buy it.\n• If a buyer does not arrive or stops responding, you can cancel the pending order from your Sales screen to free up your stock.',
  },
  {
    id: 's-fee',
    category: 'seller',
    question: 'Are there any platform listing fees or seller commissions?',
    answer:
      'CampusMart is 100% free for all college students! There are zero listing fees, zero seller commissions, and zero hidden charges.',
  },

  // ── PAYMENTS & UPI ──
  {
    id: 'p-methods',
    category: 'payment',
    question: 'What payment options are available on CampusMart?',
    answer:
      '• Cash on Handover (COD): Pay cash directly to the seller during your in-person campus meeting after inspecting the item.\n• Online Payment via Razorpay: Pay securely using UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, or Net Banking.',
  },
  {
    id: 'p-seller-payout',
    category: 'payment',
    question: 'How and when do sellers receive money for online orders?',
    answer:
      'For online orders, go to "Profile > Payments" and connect your bank account or UPI details via Razorpay Linked Account. Once the handover is confirmed by both parties, payouts are automatically routed to your bank account.',
  },
  {
    id: 'p-security',
    category: 'payment',
    question: 'Is online payment secure on CampusMart?',
    answer:
      'Yes. Online payments are processed through Razorpay with RBI-compliant 256-bit SSL encryption. CampusMart never stores your UPI PIN, card numbers, or banking passwords.',
  },

  // ── ORDERS & RETURNS ──
  {
    id: 'o-cancel',
    category: 'orders',
    question: 'Can I cancel an order? How do cancellations work?',
    answer:
      'Yes, you can cancel your order anytime before the handover is completed:\n1. Open your Orders / Buy screen.\n2. Tap the order you wish to cancel.\n3. Tap "Cancel Order" and select a reason.\n• If paid online, your refund will be automatically initiated to your original payment method (typically credited within 3-5 business days).',
  },
  {
    id: 'o-return',
    category: 'orders',
    question: 'What if an item is damaged or not as described?',
    answer:
      '• For Cash Orders: Always inspect the item thoroughly during the meetup BEFORE paying. If unsatisfied, decline the handover on the spot.\n• For Online Orders: If an item received does not match the description or is malfunctioning, immediately report the order via "Support & Safety > Reports" or contact Admin. We will verify the case and issue a full refund if the item was misrepresented.',
  },

  // ── BUYING REQUESTS (COMMUNITY BOARD) ──
  {
    id: 'r-board',
    category: 'requests',
    question: 'What is the "Items Buying Requests" board?',
    answer:
      'If you need a specific textbook, calculator, drafter, or lab coat that no one has listed for sale yet, the Buying Requests board lets you post a public request to the entire campus student community.',
  },
  {
    id: 'r-post',
    category: 'requests',
    question: 'How do I post a new buying request?',
    answer:
      '1. Open the "Messages" tab and tap "Items Buying Requests".\n2. Tap the "+ Post Request" button at the bottom.\n3. Fill in the item name, your budget, category, and whether you want to Buy or Rent.\n4. Tap "Submit" to publish it on the campus board.',
  },
  {
    id: 'r-respond',
    category: 'requests',
    question: 'How do I respond to someone else\'s buying request?',
    answer:
      'When browsing the requests board, if you have the requested item, tap "Message Buyer" to open a direct chat with the student, or tap "Call" to coordinate handover details immediately.',
  },

  // ── ACCOUNT & LOGIN ──
  {
    id: 'a-who-can-join',
    category: 'account',
    question: 'Who is eligible to register on CampusMart?',
    answer:
      'CampusMart is an exclusive community platform strictly reserved for verified BVM Engineering students and staff. Registration requires an official college email (@bvmengineering.ac.in).',
  },
  {
    id: 'a-forgot-pass',
    category: 'account',
    question: 'What should I do if I forget my password?',
    answer:
      '1. On the Login screen, tap "Forgot Password?".\n2. Enter your registered college email.\n3. Check your college inbox for the secure OTP.\n4. Enter the OTP and choose a new, secure password.',
  },
  {
    id: 'a-edit-profile',
    category: 'account',
    question: 'How do I update my profile photo, phone number, or branch?',
    answer:
      'Go to the "Profile" tab and tap "Edit Profile". You can upload a new profile picture, update your mobile contact number, student ID, and branch details.',
  },

  // ── CAMPUS SAFETY & RULES ──
  {
    id: 'safe-meetup',
    category: 'safety',
    question: 'What are the top safety guidelines for campus transactions?',
    answer:
      '• Always meet in busy, well-lit campus areas (e.g., College Canteen, Central Library, Department Foyer, or Main Gate) during daytime hours.\n• Never share your college email password, OTPs, or private banking details.\n• For valuable electronics, test all buttons, screen display, and battery condition before finalizing.',
  },
  {
    id: 'safe-prohibited',
    category: 'safety',
    question: 'What items are strictly prohibited on CampusMart?',
    answer:
      'Prohibited items include: weapons, hazardous chemicals, alcoholic beverages, illicit substances, leaked exam question papers, pirated software, and non-student commercial goods. Violators are subject to permanent platform bans and referral to college authorities.',
  },
  {
    id: 'safe-report',
    category: 'safety',
    question: 'How do I report a suspicious user or inappropriate listing?',
    answer:
      '• Tap the flag/report icon on any item listing or user profile, or navigate to "Profile > Support & Safety > Reports".\n• Select the violation type (e.g., scam, counterfeit, abusive behavior) and attach a brief explanation.\n• CampusMart administrators review all reports promptly and take strict enforcement actions.',
  },
  {
    id: 'safe-admin-help',
    category: 'safety',
    question: 'How can I contact the CampusMart Admin directly?',
    answer:
      'Use the "Call Admin" or "Send Mail" buttons at the top of this Help screen to connect with the Admin directly regarding account issues, unresolved disputes, or platform emergencies.',
  },
];
