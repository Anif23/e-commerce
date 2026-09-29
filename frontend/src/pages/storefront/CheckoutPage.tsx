import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CreditCard, MapPin, ShoppingBag, TestTube, Truck, Wallet } from 'lucide-react';

import { cn } from '../../lib/cn';
import { assetUrl } from '../../lib/assets';
import { formatPrice } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { Badge, EmptyState, ErrorState } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { AddressForm, type AddressDraft } from '../../components/account/AddressForm';
import { PaymentPanel, type PaymentSession } from '../../components/checkout/PaymentPanel';
import { useCheckout, useCheckoutSummary, useConfirmPayment } from '../../hooks/queries/useOrders';
import { cartApi } from '../../lib/api/endpoints';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/store';
import type { Address, PaymentProvider } from '../../types/api';

const STEPS = [
  { id: 1, label: 'Shipping' },
  { id: 2, label: 'Payment' },
  { id: 3, label: 'Review' },
];

const METHOD_ICONS: Record<PaymentProvider, typeof Truck> = {
  COD: Truck,
  PAYPAL: Wallet,
  STRIPE: CreditCard,
  MOCK: TestTube,
};

const METHOD_NOTES: Record<PaymentProvider, string> = {
  COD: 'Pay the courier when your parcel arrives.',
  PAYPAL: 'You will confirm the payment in the PayPal window.',
  STRIPE: 'Card details are handled by Stripe and never touch our servers.',
  MOCK: 'Simulated gateway for testing — no real money moves.',
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useCheckoutSummary();
  const placeOrder = useCheckout();
  const confirmPayment = useConfirmPayment();

  const [step, setStep] = useState(1);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('saved');
  const [addressId, setAddressId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AddressDraft | null>(null);
  const [method, setMethod] = useState<PaymentProvider>('COD');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<{ orderId: number; payment: PaymentSession | null } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addresses = data?.addresses ?? [];
  const cart = data?.cart;

  // Default to the shopper's default address as soon as it arrives.
  useEffect(() => {
    if (!addresses.length) return;

    const preferred = addresses.find((address: Address) => address.isDefault) ?? addresses[0];
    setAddressId(preferred.id);
    setAddressMode('saved');
  }, [data?.addresses]);

  useEffect(() => {
    if (!data?.paymentMethods?.length) return;
    setMethod((current) =>
      data.paymentMethods.some((entry) => entry.id === current) ? current : data.paymentMethods[0].id,
    );
  }, [data?.paymentMethods]);

  const selectedAddress = useMemo(
    () => addresses.find((address: Address) => address.id === addressId) ?? null,
    [addresses, addressId],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState message="We could not prepare your checkout." onRetry={() => refetch()} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Add something to your cart before checking out."
          action={
            <Link to="/products">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const canContinue = step === 1 ? (addressMode === 'saved' ? Boolean(addressId) : Boolean(draft)) : true;

  const submit = async () => {
    setErrorMessage(null);

    try {
      // Final stock check so nobody pays for something that just sold out.
      const validation = await cartApi.validate();

      if (!validation.data.data.valid) {
        setErrorMessage(
          validation.data.data.issues
            .map((issue) =>
              issue.type === 'OUT_OF_STOCK'
                ? `${issue.name} is out of stock`
                : `Only ${issue.available} of ${issue.name} left`,
            )
            .join('. '),
        );
        return;
      }

      const response = await placeOrder.mutateAsync({
        addressId: addressMode === 'saved' ? (addressId ?? undefined) : undefined,
        address: addressMode === 'new' && draft ? { ...draft, save: draft.save ?? true } : undefined,
        paymentMethod: method,
        customerNote: note.trim() || undefined,
      });

      const { order, payment } = response.data.data;
      const provider = payment.provider as PaymentProvider;

      if (provider === 'COD') {
        navigate(`/orders/${order.id}?placed=1`, { replace: true });
        return;
      }

      if (provider === 'MOCK') {
        await confirmPayment.mutateAsync({ orderId: order.id });
        navigate(`/orders/${order.id}?placed=1`, { replace: true });
        return;
      }

      setPending({ orderId: order.id, payment: payment as PaymentSession });
    } catch (error) {
      setErrorMessage(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          (error as Error)?.message ??
          'Checkout failed. Please try again.',
      );
    }
  };

  const totals = cart.totals;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Checkout</h1>

      <ol className="mt-6 flex items-center gap-2 text-sm">
        {STEPS.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={entry.id > step}
              onClick={() => setStep(entry.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium transition',
                step === entry.id ? 'bg-brand-600 text-white' : step > entry.id ? 'text-brand-700' : 'text-ink-400',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full text-[11px]',
                  step === entry.id ? 'bg-white/20' : step > entry.id ? 'bg-brand-100' : 'bg-ink-100',
                )}
              >
                {step > entry.id ? <Check className="h-3 w-3" /> : entry.id}
              </span>
              {entry.label}
            </button>
            {index < STEPS.length - 1 && <span className="h-px w-6 bg-ink-200" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Step 1 — shipping */}
          {step === 1 && (
            <section className="surface p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
                <MapPin className="h-4 w-4 text-brand-600" />
                Shipping address
              </h2>

              {addresses.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {addresses.map((address: Address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => {
                        setAddressMode('saved');
                        setAddressId(address.id);
                      }}
                      className={cn(
                        'rounded-xl border p-4 text-left transition',
                        addressMode === 'saved' && addressId === address.id
                          ? 'border-brand-600 bg-brand-50/50'
                          : 'border-ink-200 hover:border-ink-300',
                      )}
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                        {address.fullName}
                        {address.isDefault && <Badge tone="brand">Default</Badge>}
                        {address.label && <Badge tone="neutral">{address.label}</Badge>}
                      </p>
                      <p className="mt-1 text-sm text-ink-600">
                        {address.address1}
                        {address.address2 ? `, ${address.address2}` : ''}
                      </p>
                      <p className="text-sm text-ink-600">
                        {address.city}, {address.state} {address.zipCode}
                      </p>
                      <p className="text-sm text-ink-500">{address.country}</p>
                      <p className="mt-1.5 text-xs text-ink-400">{address.phone}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setAddressMode(addressMode === 'new' ? 'saved' : 'new')}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  {addressMode === 'new' ? 'Use a saved address instead' : '+ Use a new address'}
                </button>
              </div>

              {addressMode === 'new' && (
                <div className="mt-4 border-t border-ink-100 pt-5">
                  <AddressForm
                    showSaveToggle
                    submitLabel="Continue to payment"
                    onSubmit={(values) => {
                      setDraft({ ...values, save: true });
                      setStep(2);
                    }}
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end border-t border-ink-100 pt-5">
                <Button disabled={!canContinue} onClick={() => setStep(2)}>
                  Continue to payment
                </Button>
              </div>
            </section>
          )}

          {/* Step 2 — payment */}
          {step === 2 && (
            <section className="surface p-6">
              <h2 className="text-base font-semibold text-ink-900">Payment method</h2>

              <div className="mt-4 space-y-3">
                {data?.paymentMethods.map((entry) => {
                  const Icon = METHOD_ICONS[entry.id] ?? Wallet;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setMethod(entry.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition',
                        method === entry.id ? 'border-brand-600 bg-brand-50/50' : 'border-ink-200 hover:border-ink-300',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                          method === entry.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300',
                        )}
                      >
                        {method === entry.id && <Check className="h-3 w-3" />}
                      </span>

                      <span className="flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                          <Icon className="h-4 w-4 text-ink-500" />
                          {entry.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">{METHOD_NOTES[entry.id]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-between border-t border-ink-100 pt-5">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>Review order</Button>
              </div>
            </section>
          )}

          {/* Step 3 — review */}
          {step === 3 && (
            <section className="surface p-6">
              <h2 className="text-base font-semibold text-ink-900">Review your order</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Deliver to</p>
                  {addressMode === 'saved' && selectedAddress ? (
                    <div className="mt-2 text-sm text-ink-700">
                      <p className="font-medium text-ink-900">{selectedAddress.fullName}</p>
                      <p>
                        {selectedAddress.address1}
                        {selectedAddress.address2 ? `, ${selectedAddress.address2}` : ''}
                      </p>
                      <p>
                        {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
                      </p>
                      <p>{selectedAddress.country}</p>
                      <p className="mt-1 text-xs text-ink-500">{selectedAddress.phone}</p>
                    </div>
                  ) : draft ? (
                    <div className="mt-2 text-sm text-ink-700">
                      <p className="font-medium text-ink-900">{draft.fullName}</p>
                      <p>
                        {draft.address1}
                        {draft.address2 ? `, ${draft.address2}` : ''}
                      </p>
                      <p>
                        {draft.city}, {draft.state} {draft.zipCode}
                      </p>
                      <p>{draft.country}</p>
                      <p className="mt-1 text-xs text-ink-500">{draft.phone}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-danger">Pick a delivery address first.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-2 text-xs font-medium text-brand-700 hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div className="rounded-xl border border-ink-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Paying with</p>
                  <p className="mt-2 text-sm font-medium text-ink-900">
                    {data?.paymentMethods.find((entry) => entry.id === method)?.label ?? method}
                  </p>
                  <p className="text-xs text-ink-500">{METHOD_NOTES[method]}</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="mt-2 text-xs font-medium text-brand-700 hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <Textarea
                  label="Delivery note (optional)"
                  placeholder="Anything the courier should know…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                />
              </div>

              {pending ? (
                <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
                  <p className="text-sm font-semibold text-ink-900">Complete the payment for order #{pending.orderId}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Your order is reserved while the payment is confirmed.
                  </p>

                  <div className="mt-4">
                    <PaymentPanel
                      provider={method}
                      payment={pending.payment}
                      onConfirm={async (payload) => {
                        await confirmPayment.mutateAsync({ orderId: pending.orderId, payload });
                        navigate(`/orders/${pending.orderId}?placed=1`, { replace: true });
                      }}
                      onCancel={() => setPending(null)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {errorMessage && (
                    <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{errorMessage}</p>
                  )}

                  <div className="mt-6 flex justify-between border-t border-ink-100 pt-5">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      size="lg"
                      loading={placeOrder.isPending || confirmPayment.isPending}
                      disabled={!canContinue}
                      onClick={submit}
                    >
                      Place order · {formatPrice(totals.total)}
                    </Button>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-ink-400">
                    By placing this order you agree to our{' '}
                    <Link to="/policies/terms" className="underline underline-offset-2 hover:text-brand-700">
                      Terms &amp; Conditions
                    </Link>
                    ,{' '}
                    <Link to="/policies/privacy" className="underline underline-offset-2 hover:text-brand-700">
                      Privacy Policy
                    </Link>{' '}
                    and{' '}
                    <Link to="/policies/refund" className="underline underline-offset-2 hover:text-brand-700">
                      Refund &amp; Returns Policy
                    </Link>
                    . Prices are in Indian rupees and include GST; a GST invoice is sent with every dispatch.
                  </p>
                </>
              )}
            </section>
          )}
        </div>

        {/* Summary */}
        <aside>
          <div className="surface sticky top-24 p-5">
            <h2 className="text-base font-semibold text-ink-900">Order summary</h2>

            <ul className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <img
                    src={assetUrl(item.product.image)}
                    alt={item.product.name}
                    loading="lazy"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-ink-900">{item.product.name}</p>
                    <p className="text-xs text-ink-500">
                      {item.variant?.label ? `${item.variant.label} · ` : ''}Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-ink-900">{formatPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-medium text-ink-900">{formatPrice(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount</dt>
                  <dd>-{formatPrice(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd className="font-medium text-ink-900">
                  {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Tax</dt>
                <dd className="font-medium text-ink-900">{formatPrice(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-semibold text-ink-900">Total</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(totals.total)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-ink-400">
              Free shipping on orders over{' '}
              {formatPrice(data?.shipping.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD)}. Orders are held for
              30 minutes while a payment is confirmed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
