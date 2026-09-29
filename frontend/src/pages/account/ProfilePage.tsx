import { useEffect, useState } from 'react';

import { formatDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Badge, StatCard } from '../../components/ui';
import { useChangePassword, useProfile, useUpdateProfile } from '../../hooks/queries/useAccount';
import { useOrderStats } from '../../hooks/queries/useOrders';
import { useWishlist } from '../../hooks/queries/useAccount';
import { formatPrice } from '../../lib/format';

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { data: stats } = useOrderStats();
  const { ids: wishlistIds } = useWishlist();

  const [form, setForm] = useState({ username: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({ username: profile.username, email: profile.email });
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={stats?.total ?? 0} hint="All-time" />
        <StatCard label="Lifetime spend" value={formatPrice(stats?.lifetimeSpend ?? 0)} tone="success" />
        <StatCard label="Wishlist" value={wishlistIds.length} hint="Saved products" tone="warning" />
      </div>

      <section className="surface p-5">
        <h2 className="text-base font-semibold text-ink-900">Profile details</h2>
        <p className="mt-1 text-sm text-ink-500">
          Member since {formatDate(user?.createdAt ?? profile?.createdAt)}
        </p>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateProfile.mutate(form);
          }}
        >
          <Input
            label="Username"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />

          <div className="sm:col-span-2">
            <Button type="submit" loading={updateProfile.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </section>

      <section className="surface p-5">
        <h2 className="text-base font-semibold text-ink-900">Password</h2>
        <p className="mt-1 text-sm text-ink-500">Use a strong password you do not reuse elsewhere.</p>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPasswordError(null);

            if (passwords.newPassword.length < 6) {
              setPasswordError('New passwords need at least 6 characters');
              return;
            }

            changePassword.mutate(passwords, {
              onSuccess: () => setPasswords({ currentPassword: '', newPassword: '' }),
            });
          }}
        >
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
          />

          {passwordError && <p className="text-sm text-danger sm:col-span-2">{passwordError}</p>}

          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" loading={changePassword.isPending}>
              Update password
            </Button>
          </div>
        </form>
      </section>

      <section className="surface p-5">
        <h2 className="text-base font-semibold text-ink-900">Orders by status</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(stats?.byStatus ?? {}).map(([status, count]) => (
            <Badge key={status} tone="neutral">
              {status.toLowerCase().replace('_', ' ')} · {String(count)}
            </Badge>
          ))}
          {Object.keys(stats?.byStatus ?? {}).length === 0 && <p className="text-sm text-ink-500">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
};
