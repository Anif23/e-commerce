/**
 * Store policies live in one typed file so legal copy can be edited without
 * touching components, and so every page can share the same renderer.
 *
 * Indian context: prices are in INR (₹), tax is itemized at checkout, and the copy follows the
 * Digital Personal Data Protection Act, 2023 and the Consumer Protection
 * (E-Commerce) Rules, 2020.
 */

export type PolicyBlock =
  | { kind: 'text'; body: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

export type PolicySection = {
  id: string;
  heading: string;
  blocks: PolicyBlock[];
};

export type Policy = {
  slug: string;
  title: string;
  summary: string;
  /** Shown under the title on the page and in the footer card list. */
  audience: string;
  sections: PolicySection[];
};

const text = (body: string): PolicyBlock => ({ kind: 'text', body });
const list = (items: string[]): PolicyBlock => ({ kind: 'list', items });
const table = (head: string[], rows: string[][]): PolicyBlock => ({ kind: 'table', head, rows });

export const POLICIES: Policy[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    audience: 'How {{storeName}} collects, uses and protects your data',
    summary:
      'We collect only what we need to take your order, deliver it and support you afterwards. We never sell your personal data.',
    sections: [
      {
        id: 'who-we-are',
        heading: '1. Who we are',
        blocks: [
          text(
            '{{storeName}} ("we", "us", "our") is an online retail store operated from {{businessAddress}}. This policy explains what personal information we collect when you browse or buy from this website, why we collect it, and the choices you have.',
          ),
          text(
            'By using this website you consent to the practices described here. If you do not agree, please do not use the site or share your details with us.',
          ),
        ],
      },
      {
        id: 'what-we-collect',
        heading: '2. Information we collect',
        blocks: [
          list([
            'Identity and contact details: name, email address, phone number and delivery addresses.',
            'Order information: items purchased, size or colour variants chosen, coupons applied, order notes and the delivery status of each order.',
            'Payment information: card or UPI details are collected and processed by our configured payment partners (Razorpay and/or Stripe). We never store your full card number, CVV or UPI PIN — we only keep the transaction reference, the amount and the result.',
            'Account information: a securely hashed password, wishlist entries, reviews you write and support tickets you raise.',
            'Technical information: IP address, browser and device type, pages visited and cookie identifiers (see our Cookie Policy).',
          ]),
        ],
      },
      {
        id: 'how-we-use',
        heading: '3. How we use your information',
        blocks: [
          list([
            'To accept, pack, ship and deliver your order, and to provide order and tax records where required.',
            'To process payments, apply coupons and issue refunds.',
            'To send service messages: order confirmation, dispatch, delivery and support replies. These are not marketing messages and cannot be switched off while an order is open.',
            'To send offers and announcements only when you have opted in; you can unsubscribe from any marketing email or turn off marketing cookies at any time.',
            'To detect and prevent fraud, abuse and unauthorised access to accounts.',
            'To improve the store — for example, to see which products are viewed most and where shoppers drop out of checkout.',
          ]),
        ],
      },
      {
        id: 'legal-basis',
        heading: '4. Legal basis and your rights',
        blocks: [
          text(
            'Under the Digital Personal Data Protection Act, 2023 we process your data to perform our contract with you, to comply with law (for example tax records), and — for marketing and analytics — on the basis of your consent, which you can withdraw at any time.',
          ),
          list([
            'Right to access: ask us for a summary of the personal data we hold about you.',
            'Right to correction: ask us to fix inaccurate details such as a wrong phone number or PIN code.',
            'Right to erasure: ask us to delete your account and personal data, subject to records we must keep by law (for example invoices retained for tax purposes).',
            'Right to grievance redressal: write to our grievance officer using the contact details below and we will respond within 30 days.',
          ]),
        ],
      },
      {
        id: 'sharing',
        heading: '5. Who we share data with',
        blocks: [
          text('We share the minimum information needed with trusted partners:'),
          table(
            ['Partner', 'Why they receive data'],
            [
              ['Configured payment gateways', 'To authorise and settle your payment and to prevent fraud.'],
              ['Courier partners', 'Name, address, phone number and order contents — only to deliver your parcel.'],
              ['Email / notification provider', 'To send order and service messages.'],
              ['Government and tax authorities', 'When required by law, for applicable tax filings.'],
            ],
          ),
          text(
            'We do not sell, rent or trade your personal information to anyone. Every partner is bound by contract to use the data only for the service they provide to us.',
          ),
        ],
      },
      {
        id: 'retention',
        heading: '6. How long we keep data',
        blocks: [
          list([
            'Orders and invoices: 8 years, as required by applicable tax and consumer-record laws.',
            'Account profile and addresses: until you delete them or close your account.',
            'Support tickets: 3 years from the last message, so we can handle repeat issues and disputes.',
            'Server and security logs: 90 days.',
            'Analytics data: 14 months, and only when you have accepted analytics cookies.',
          ]),
        ],
      },
      {
        id: 'security',
        heading: '7. Security',
        blocks: [
          text(
            'Traffic is encrypted with HTTPS. Passwords are stored as salted hashes (bcrypt) and never in plain text. Access to customer data inside {{storeName}} is limited to staff who need it to process orders, and every administrative action is recorded in an audit log.',
          ),
          text(
            'If a data breach affecting your information occurs, we will notify you and the relevant authority as required by law.',
          ),
        ],
      },
      {
        id: 'children',
        heading: '8. Children',
        blocks: [
          text(
            'The store is not intended for anyone under 18. If you are ordering on behalf of a minor, please do so as their parent or guardian.',
          ),
        ],
      },
      {
        id: 'contact',
        heading: '9. Contact and grievance officer',
        blocks: [
          text(
            'Questions, requests or complaints about your data can be raised from the Contact support page in your account, or by writing to us. We aim to resolve every request within 30 days.',
          ),
        ],
      },
    ],
  },

  {
    slug: 'refund',
    title: 'Refund & Returns Policy',
    audience: 'Returns, replacements, cancellations and how refunds are paid',
    summary:
      'Return most items within 7 days of delivery for a full refund. Refunds are issued to the original payment method within 5–7 working days.',
    sections: [
      {
        id: 'window',
        heading: '1. Return window',
        blocks: [
          text(
            'You may return or exchange most products within 7 days of delivery. Raise the request from Order history → the order → Request return, or write to support with your order number.',
          ),
          table(
            ['Situation', 'What you can do'],
            [
              ['Change of mind', 'Return within 7 days; the item must be unused and in original packaging.'],
              ['Wrong, damaged or defective item', 'Free replacement or full refund — report within 48 hours of delivery with photos.'],
              ['Item missing from the parcel', 'Report within 48 hours; we refund or reship after verification.'],
              ['Order not yet dispatched', 'Cancel free of charge from the order page.'],
            ],
          ),
        ],
      },
      {
        id: 'condition',
        heading: '2. Condition of returned items',
        blocks: [
          list([
            'Unused, unwashed and undamaged, with all tags, manuals, accessories and free gifts included.',
            'Packed in the original box so it survives the return journey.',
            'Accompanied by the order number and proof of purchase.',
          ]),
          text(
            'If an item comes back used, damaged or incomplete we may decline the refund and send it back to you at your cost.',
          ),
        ],
      },
      {
        id: 'non-returnable',
        heading: '3. Items that cannot be returned',
        blocks: [
          list([
            'Innerwear, socks, cosmetics and other items that cannot be returned for hygiene reasons once opened.',
            'Products with a broken manufacturer seal, or personalised / made-to-order items.',
            'Digital goods, gift cards and coupons.',
            'Items marked "Final sale" on the product page at the time of purchase.',
          ]),
        ],
      },
      {
        id: 'process',
        heading: '4. How to return an item',
        blocks: [
          list([
            'Open the order in Order history and choose Request return (or message support with your order number and reason).',
            'Add photos if the item is damaged, defective or wrong — this speeds up approval.',
            'We review the request within 1 working day and email you a return approval with pickup instructions.',
            'Hand the parcel to the courier on the scheduled pickup day. Reverse pickup is free for damaged, defective or wrong items.',
            'We inspect the returned item within 48 hours of receiving it and then issue the refund.',
          ]),
        ],
      },
      {
        id: 'refund-timelines',
        heading: '5. Refund timelines and method',
        blocks: [
          table(
            ['Original payment method', 'Refund arrives in', 'Credited to'],
            [
              ['UPI / card / net banking / wallet', '5–7 working days after approval', 'The original payment instrument'],
              ['Cash on Delivery (COD)', '5–7 working days after we receive bank details', 'Your bank account or UPI ID'],
              ['Store credit or coupon', 'Immediately', 'Your {{storeName}} account'],
            ],
          ),
          text(
            'Shipping charges are refunded when the return is our fault (damaged, defective or wrong item). For change-of-mind returns the original shipping fee is not refunded, and a ₹99 reverse pickup fee may be deducted from the refund.',
          ),
          text(
            'If your refund is late, check with your bank first — card refunds sometimes take up to two billing cycles to appear. If it has been more than 10 working days since approval, contact support and we will chase it.',
          ),
        ],
      },
      {
        id: 'cancellation',
        heading: '6. Cancellations',
        blocks: [
          text(
            'Orders can be cancelled free of charge any time before dispatch. Once a parcel has been handed to the courier, please refuse delivery or raise a return after it arrives. Prepaid orders that are cancelled before dispatch are refunded in full, including shipping.',
          ),
        ],
      },
      {
        id: 'exchanges',
        heading: '7. Exchanges',
        blocks: [
          text(
            'Need a different size or colour? Raise a return and place a new order, or ask support for a size exchange where stock allows. Exchanges follow the same 7-day window and condition rules as returns.',
          ),
        ],
      },
    ],
  },

  {
    slug: 'shipping',
    title: 'Shipping & Delivery Policy',
    audience: 'Dispatch times, delivery charges and serviceable PIN codes',
    summary:
      'Orders are dispatched within 24–48 hours. Standard delivery takes 3–7 working days and is free on orders over {{freeShippingThreshold}}.',
    sections: [
      {
        id: 'dispatch',
        heading: '1. Dispatch and delivery time',
        blocks: [
          text(
            'Orders placed before 2 pm IST on a working day are usually dispatched the same day; otherwise they go out the next working day. We do not dispatch on Sundays or national holidays.',
          ),
          table(
            ['Zone', 'Typical delivery time'],
            [
              ['Metro cities (Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata)', '2–4 working days'],
              ['Other state capitals and tier-2 cities', '3–6 working days'],
              ['Rest of India (serviceable PIN codes)', '4–7 working days'],
              ['Remote and North-East locations', '7–10 working days'],
            ],
          ),
        ],
      },
      {
        id: 'charges',
        heading: '2. Shipping charges',
        blocks: [
          table(
            ['Order value', 'Standard shipping'],
            [
              ['Below {{freeShippingThreshold}}', '{{shippingFee}}'],
              ['{{freeShippingThreshold}} and above', 'Free'],
              ['Cash on Delivery', '{{shippingFee}}, free above {{freeShippingThreshold}}'],
            ],
          ),
          text('Shipping charges, if any, are shown on the checkout summary before you pay and in your order summary.'),
        ],
      },
      {
        id: 'pincode',
        heading: '3. Serviceable PIN codes',
        blocks: [
          text(
            'Enter a complete delivery address, including its PIN code, at checkout. Courier serviceability is confirmed after the order is placed; if a carrier cannot deliver to the address, we will contact you to update or cancel the order and arrange any applicable refund.',
          ),
        ],
      },
      {
        id: 'tracking',
        heading: '4. Tracking your order',
        blocks: [
          list([
            'Once dispatched you receive a tracking number by email and in your account.',
            'Track any time from Track order or from Order history — the timeline shows Placed, Paid, Processing, Shipped and Delivered.',
            'If tracking does not move for more than 3 working days, contact support and we will follow up with the courier.',
          ]),
        ],
      },
      {
        id: 'delivery',
        heading: '5. Delivery attempts and failed delivery',
        blocks: [
          text(
            'Our courier partner will attempt delivery up to three times. Please keep your phone reachable. If a parcel is returned to us because of an incorrect address, repeated absence or a refused delivery, we will refund the order minus the shipping cost once it reaches our warehouse.',
          ),
        ],
      },
      {
        id: 'damage',
        heading: '6. Damaged or tampered parcels',
        blocks: [
          text(
            'If the package looks tampered with or damaged on arrival, do not accept it — ask the courier to return it and message us with your order number. If you have already accepted it, report the damage within 48 hours with photographs and we will arrange a free replacement or refund.',
          ),
        ],
      },
      {
        id: 'taxes',
        heading: '7. Taxes and order records',
        blocks: [
          text(
            'Applicable tax is calculated using the store rate and shown as a separate line in the checkout summary before payment. Product prices are displayed before this tax is added. The order record includes the amount collected; the seller remains responsible for issuing any statutory tax invoice required by law.',
          ),
        ],
      },
    ],
  },

  {
    slug: 'terms',
    title: 'Terms & Conditions',
    audience: 'The rules for using this website and placing orders',
    summary:
      'These terms govern your use of {{storeName}} and any order you place with us. Please read them before you buy.',
    sections: [
      {
        id: 'acceptance',
        heading: '1. Acceptance of these terms',
        blocks: [
          text(
            'By browsing, registering or ordering from this website you agree to these terms, our Privacy Policy, our Refund & Returns Policy and our Shipping & Delivery Policy. If you do not accept them, please do not use the site.',
          ),
        ],
      },
      {
        id: 'account',
        heading: '2. Your account',
        blocks: [
          list([
            'You must be at least 18 years old and able to form a contract under Indian law.',
            'Keep your password confidential; you are responsible for activity under your account.',
            'Provide accurate details — delivery delays caused by a wrong address or phone number are your responsibility.',
            'We may suspend or close accounts used for fraud, abusive behaviour or reselling without permission.',
          ]),
        ],
      },
      {
        id: 'products',
        heading: '3. Products, pricing and availability',
        blocks: [
          text(
            'All prices are shown in Indian rupees (₹). Applicable tax is calculated using the configured store rate and itemized separately in the checkout summary. We try to describe and photograph products accurately, but slight variations in colour may occur because of screen settings.',
          ),
          list([
            'Prices, offers and stock can change without notice; the price charged is the one shown when you place the order.',
            'If an item is priced incorrectly or goes out of stock after you order, we will contact you and either fulfil the rest of the order, offer an alternative, or cancel and refund the affected item.',
            'We may limit order quantities per customer during promotions.',
          ]),
        ],
      },
      {
        id: 'orders',
        heading: '4. Placing and accepting an order',
        blocks: [
          text(
            'Your order is an offer to buy. A contract is formed only when we accept it — for online payments, when the payment is authorised; for Cash on Delivery, when the order is confirmed and dispatched. Until then we may decline or cancel an order (for example for stock, pricing or fraud reasons) and will refund any money taken.',
          ),
          text(
            'Online orders that are not paid for within 15 minutes are released automatically and the reserved stock returns to the shelf.',
          ),
        ],
      },
      {
        id: 'payment',
        heading: '5. Payment',
        blocks: [
          text(
            'When configured, we accept payments through Razorpay and Stripe, alongside Cash on Delivery where available. You confirm that the payment method you use belongs to you and that the details you provide are correct.',
          ),
        ],
      },
      {
        id: 'use',
        heading: '6. Acceptable use',
        blocks: [
          list([
            'Do not use the site for anything unlawful or to harm, harass or defraud others.',
            'Do not attempt to gain unauthorised access to accounts, systems or data.',
            'Do not scrape, copy or reuse product content, images or code without written permission.',
            'Reviews must reflect genuine experience; fake, abusive or promotional reviews may be removed.',
          ]),
        ],
      },
      {
        id: 'ip',
        heading: '7. Intellectual property',
        blocks: [
          text(
            'The website design, code, text, logos, product photography and other content are owned by {{storeName}} or its licensors and are protected by Indian copyright and trademark law. You may use the site for personal, non-commercial shopping only.',
          ),
        ],
      },
      {
        id: 'liability',
        heading: '8. Limitation of liability',
        blocks: [
          text(
            'To the extent permitted by law, {{storeName}} is not liable for indirect or consequential losses, loss of profit or data, or delays caused by events outside our reasonable control (natural disasters, courier strikes, government action, internet outages). Our total liability for any claim relating to an order is limited to the value of that order.',
          ),
          text('Nothing in these terms limits rights you have under the Consumer Protection Act, 2019.'),
        ],
      },
      {
        id: 'law',
        heading: '9. Governing law and jurisdiction',
        blocks: [
          text(
            'These terms are governed by the laws of India. Disputes are subject to the jurisdiction of the courts that may lawfully hear matters relating to our business address at {{businessAddress}}, without prejudice to any statutory remedy available to you as a consumer.',
          ),
        ],
      },
      {
        id: 'changes',
        heading: '10. Changes to these terms',
        blocks: [
          text(
            'We may update these terms to reflect changes in the law or how the store works. The updated version is published on this page with a new revision date, and continued use of the site means you accept it.',
          ),
        ],
      },
    ],
  },

  {
    slug: 'cookies',
    title: 'Cookie Policy',
    audience: 'What cookies we set, why, and how to change your choice',
    summary:
      'Essential cookies keep you signed in and your cart intact. Analytics and marketing cookies are optional and only run after you allow them.',
    sections: [
      {
        id: 'what',
        heading: '1. What cookies are',
        blocks: [
          text(
            'Cookies are small text files stored by your browser when you visit a website. We also use local storage for the same purpose. They let the site remember you between pages and visits — for example to keep products in your cart while you shop as a guest.',
          ),
        ],
      },
      {
        id: 'categories',
        heading: '2. Cookies we use',
        blocks: [
          table(
            ['Category', 'Purpose'],
            [
              ['Essential', 'Sign-in session, CSRF protection, cart and wishlist, cookie-consent choice. These cannot be switched off or the store stops working.'],
              ['Preferences', 'Remember choices such as your last used address or recently viewed products.'],
              ['Analytics', 'Anonymous statistics about page views and where shoppers drop out of checkout. Only loaded after you accept analytics cookies.'],
              ['Marketing', 'Measure campaigns and show relevant offers. Only loaded after you accept marketing cookies.'],
            ],
          ),
        ],
      },
      {
        id: 'third-party',
        heading: '3. Third-party cookies',
        blocks: [
          text(
            'Our configured payment partners (Razorpay and Stripe) set their own cookies and scripts when you choose to pay with them — these are required to process the payment securely and to prevent fraud. Embedded maps or video players may set their own cookies too; we do not control them.',
          ),
        ],
      },
      {
        id: 'manage',
        heading: '4. Managing your choices',
        blocks: [
          list([
            'Use the Cookie preferences button in the footer to change your choice at any time.',
            'Accept all, reject everything non-essential, or pick categories individually.',
            'You can also block or delete cookies in your browser settings — blocking essential cookies will stop sign-in and the cart from working.',
            'Rejecting analytics or marketing cookies does not reduce your ability to shop; it only stops optional measurement.',
          ]),
          text(
            'We remember your choice for 12 months, then ask again. If we start using a new category of cookies we will ask for consent again.',
          ),
        ],
      },
      {
        id: 'dnt',
        heading: '5. Do Not Track and retention',
        blocks: [
          text(
            'We honour the choice you make in our consent banner rather than the browser Do Not Track header, because there is no common standard for it. Analytics identifiers expire after 14 months and consent itself after 12 months.',
          ),
        ],
      },
    ],
  },
];

export const POLICY_LINKS = POLICIES.map(({ slug, title }) => ({ slug, title }));

export const getPolicy = (slug?: string) => POLICIES.find((policy) => policy.slug === slug);
