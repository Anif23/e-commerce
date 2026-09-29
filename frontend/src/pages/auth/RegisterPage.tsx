import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useRegister } from '../../hooks/queries/useAuth';
import { AuthShell } from './AuthShell';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const register = useRegister();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for checkout, orders, wishlist and support."
      footer={
        <p>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);

          if (form.password !== form.confirm) {
            setError('Those passwords do not match');
            return;
          }

          if (form.password.length < 6) {
            setError('Use at least 6 characters for your password');
            return;
          }

          try {
            await register.mutateAsync({
              username: form.username.trim(),
              email: form.email.trim(),
              password: form.password,
            });
            navigate('/', { replace: true });
          } catch (mutationError) {
            setError((mutationError as Error).message);
          }
        }}
      >
        <Input
          label="Username"
          required
          autoComplete="username"
          value={form.username}
          onChange={(event) => set('username')(event.target.value)}
          placeholder="jane"
        />

        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(event) => set('email')(event.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 6 characters"
          value={form.password}
          onChange={(event) => set('password')(event.target.value)}
        />

        <Input
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => set('confirm')(event.target.value)}
        />

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={register.isPending}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
};
