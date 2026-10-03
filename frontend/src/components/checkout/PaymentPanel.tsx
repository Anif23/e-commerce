import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CreditCard, Loader2, Wallet } from 'lucide-react';

import { Button } from '../ui/Button';
import { getErrorMessage } from '../../lib/api/client';
import { loadStripeJs, type StripeCardElement, type StripeInstance } from '../../lib/stripe';
import type { PaymentProvider } from '../../types/api';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;
let razorpayScriptPromise: Promise<RazorpayConstructor> | null = null;

const loadRazorpay = (): Promise<RazorpayConstructor> => {
  const existing = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      const Razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (Razorpay) resolve(Razorpay);
      else reject(new Error('Razorpay checkout failed to initialize'));
    };
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error('Could not load Razorpay checkout'));
    };
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
};

/** Razorpay's hosted checkout modal; only public order details reach the browser. */
const RazorpayCheckout = ({
  payment,
  onConfirm,
  onCancel,
}: {
  payment: PaymentSession;
  onConfirm: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const orderId = payment.orderId as string | undefined;
  const keyId = payment.keyId as string | undefined;
  const amount = payment.amount as number | undefined;
  const currency = payment.currency as string | undefined;

  const openCheckout = async () => {
    if (!orderId || !keyId || !amount || !currency) {
      setMessage('Razorpay did not return the required payment details. Please retry checkout.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const Razorpay = await loadRazorpay();
      setBusy(false);
      const instance = new Razorpay({
        key: keyId,
        order_id: orderId,
        amount,
        currency,
        name: (payment.name as string | undefined) ?? 'Store',
        description: (payment.description as string | undefined) ?? 'Order payment',
        prefill: payment.prefill as { email?: string } | undefined,
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          setBusy(true);
          try {
            await onConfirm({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (error) {
            setMessage(getErrorMessage(error, 'Could not verify the Razorpay payment'));
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: onCancel },
      });
      instance.on('payment.failed', (response) => {
        setMessage(response.error?.description ?? 'Payment failed. You can try again.');
      });
      instance.open();
    } catch (error) {
      setBusy(false);
      setMessage(getErrorMessage(error, 'Could not open Razorpay checkout'));
    }
  };

  return (
    <div className="space-y-3">
      {message && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {message}
        </p>
      )}
      <Button onClick={openCheckout} loading={busy} leftIcon={<Wallet className="h-4 w-4" />}>
        Pay securely with Razorpay
      </Button>
      <p className="text-xs text-ink-500">Your payment is verified directly with Razorpay before the order is confirmed.</p>
    </div>
  );
};

/** Card capture via Stripe Elements (loaded lazily from the CDN). */
const StripeCardForm = ({
  clientSecret,
  publishableKey,
  onConfirm,
  onCancel,
}: {
  clientSecret: string;
  publishableKey: string;
  onConfirm: (paymentIntentId: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const stripeRef = useRef<StripeInstance | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!publishableKey) throw new Error('Stripe is not configured for this store');
        const factory = await loadStripeJs();
        // advancedFraudSignals:false stops Stripe.js firing the r.stripe.com
        // Radar beacon, which ad-blockers block (ERR_BLOCKED_BY_CLIENT) and which
        // we don't use — removing a recurring console error at checkout.
        const stripe = factory(publishableKey, { advancedFraudSignals: false });
        const elements = stripe.elements({ clientSecret });
        const card = elements.create('card', { style: { base: { fontSize: '15px' } } });

        stripeRef.current = stripe;
        cardRef.current = card;
        if (cancelled) return;

        card.mount(containerRef.current!);
        setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(getErrorMessage(error, 'Could not load the card form'));
        }
      }
    })();

    return () => {
      cancelled = true;
      cardRef.current?.destroy();
    };
  }, [clientSecret, publishableKey]);

  const submit = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const stripe = stripeRef.current;
      if (!stripe) throw new Error('Card form is not ready');

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardRef.current },
      });

      if (result.error) {
        setMessage(result.error.message ?? 'The card was declined');
        return;
      }

      if (result.paymentIntent?.id) await onConfirm(result.paymentIntent.id);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not process that card'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-300 bg-white p-4">
        <div ref={containerRef} className="min-h-10" />
        {status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading the secure card form…</p>
        )}
      </div>

      {message && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <Button onClick={submit} loading={busy} disabled={status !== 'ready'} leftIcon={<CreditCard className="h-4 w-4" />}>
          Pay with card
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export interface PaymentSession {
  provider: PaymentProvider;
  status: string;
  [key: string]: unknown;
}

/** Renders the real gateway widget for an online payment awaiting confirmation. */
export const PaymentPanel = ({
  provider,
  payment,
  onConfirm,
  onCancel,
}: {
  provider: PaymentProvider;
  payment: PaymentSession | null;
  onConfirm: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) => {
  if (!payment) return <p className="text-sm text-danger">Payment details are unavailable. Please refresh your orders.</p>;

  if (provider === 'RAZORPAY') {
    return <RazorpayCheckout payment={payment} onConfirm={onConfirm} onCancel={onCancel} />;
  }

  if (provider === 'STRIPE') {
    const clientSecret = payment.clientSecret as string | undefined;
    const publishableKey = payment.publishableKey as string | undefined;

    return clientSecret && publishableKey ? (
      <StripeCardForm
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        onConfirm={(paymentIntentId) => onConfirm({ paymentIntentId })}
        onCancel={onCancel}
      />
    ) : (
      <p className="text-sm text-danger">Stripe did not return the required payment details. Please retry checkout.</p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-ink-500">
      <Wallet className="h-4 w-4" />
      No online payment widget is needed for this method.
    </div>
  );
};
