import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatPrice } from '../../lib/format';
import { useCart, useCartMutations } from '../../hooks/queries/useCart';
import { Button, Drawer, EmptyState, QuantityStepper } from '../ui';
import { Skeleton } from '../ui/Feedback';

export const CartDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const cart = useCart();
  const { updateItem, removeItem } = useCartMutations();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Your cart (${cart.count})`}
      footer={
        cart.items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Subtotal</span>
              <span className="text-base font-semibold text-ink-900">{formatPrice(cart.subtotal)}</span>
            </div>
            <p className="text-xs text-ink-500">Shipping and taxes are calculated at checkout.</p>
            <Link to="/checkout" onClick={onClose} className="block">
              <Button fullWidth size="lg">
                Checkout
              </Button>
            </Link>
            <Link to="/cart" onClick={onClose} className="block">
              <Button fullWidth variant="outline">
                View cart
              </Button>
            </Link>
          </div>
        )
      }
    >
      {cart.isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      ) : cart.items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Browse the catalogue and add something you like."
          action={
            <Link to="/products" onClick={onClose}>
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {cart.items.map((item) => (
            <li key={item.key} className="flex gap-3 py-4">
              <Link to={`/products/${item.product.slug}`} onClick={onClose} className="shrink-0">
                <img
                  src={assetUrl(item.product.image)}
                  alt={item.product.name}
                  loading="lazy"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/products/${item.product.slug}`}
                  onClick={onClose}
                  className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-brand-700"
                >
                  {item.product.name}
                </Link>

                {item.variant?.label && <p className="mt-0.5 text-xs text-ink-500">{item.variant.label}</p>}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    max={Math.max(1, item.availableStock)}
                    onChange={(quantity) =>
                      updateItem.mutate({
                        itemId: item.id,
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity,
                      })
                    }
                  />

                  <span className="text-sm font-semibold text-ink-900">{formatPrice(item.lineTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                aria-label={`Remove ${item.product.name}`}
                onClick={() =>
                  removeItem.mutate({ itemId: item.id, productId: item.productId, variantId: item.variantId })
                }
                className="h-8 w-8 shrink-0 rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-danger"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
};
