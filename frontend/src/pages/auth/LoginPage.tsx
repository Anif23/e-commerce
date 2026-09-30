import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useLogin } from '../../hooks/queries/useAuth';
import { AuthShell } from './AuthShell';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/';
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your cart and orders."
      footer={
        <p>
          New here?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);

          try {
            await login.mutateAsync({ email: email.trim(), password });
            navigate(redirect, { replace: true });
          } catch (mutationError) {
            setError((mutationError as Error).message);
          }
        }}
      >
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={login.isPending}>
          Sign in
        </Button>

        <div className="rounded-xl bg-ink-100 px-4 py-3 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">Demo accounts</p>
          <p className="mt-1">Shopper: shopper@store.dev / Shopper@123</p>
          <p>Admin: admin@store.dev / Admin@123</p>
        </div>
      </form>
    </AuthShell>
  );
};
