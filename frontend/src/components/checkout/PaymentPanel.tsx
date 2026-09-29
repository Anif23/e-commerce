import { useEffect, useRef, useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { AlertCircle, CreditCard, Loader2, Wallet } from 'lucide-react';

import { Button } from '../ui/Button';
import { getErrorMessage } from '../../lib/api/client';
import { loadStripeJs, type StripeCardElement, type StripeInstance } from '../../lib/stripe';
import type { PaymentProvider } from '../../types/api';

/** PayPal's smart buttons, driven by the order id the API created. */
const PayPalCheckout = ({
  paypalOrderId,
  onApprove,
  onCancel,
}: {
  paypalOrderId: string;
  onApprove: (orderId: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const [{ isPending }] = usePayPalScriptReducer();
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading PayPal…
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
        createOrder={async () => paypalOrderId}
        onApprove={async (data) => {
          setBusy(true);
          await onApprove(data.orderID);
          setBusy(false);
        }}
        onCancel={onCancel}
        disabled={busy}
      />
    </div>
  );
};

/** Card capture via Stripe Elements (loaded lazily from the CDN). */
const StripeCardForm = ({
  clientSecret,
  onConfirm,
  onCancel,
}: {
  clientSecret: string;
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
        const factory = await loadStripeJs();
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

        if (!publishableKey) throw new Error('Stripe is not configured for this store');

        const stripe = factory(publishableKey);
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
  }, [clientSecret]);

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
        {status === 'loading' && <p className="text-sm text-ink-500">Loading the secure card form…</p>}
      </div>

      {message && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
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

/**
 * Renders the right gateway widget for an order that is awaiting payment.
 * COD and the simulated gateway need no UI — the caller finalises those itself.
 */
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
  if (provider === 'PAYPAL') {
    const paypalOrderId = payment?.orderId as string | undefined;

    return paypalOrderId ? (
      <PayPalCheckout
        paypalOrderId={paypalOrderId}
        onApprove={(orderId) => onConfirm({ paypalOrderId: orderId })}
        onCancel={onCancel}
      />
    ) : (
      <p className="text-sm text-danger">PayPal did not return an order id. Please try again.</p>
    );
  }

  if (provider === 'STRIPE') {
    const clientSecret = payment?.clientSecret as string | undefined;

    return clientSecret ? (
      <StripeCardForm
        clientSecret={clientSecret}
        onConfirm={(paymentIntentId) => onConfirm({ paymentIntentId })}
        onCancel={onCancel}
      />
    ) : (
      <p className="text-sm text-danger">Stripe did not return a client secret. Please try again.</p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-ink-500">
      <Wallet className="h-4 w-4" />
      No extra steps needed for this payment method.
    </div>
  );
};
