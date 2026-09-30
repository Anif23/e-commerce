import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

import { Button } from '../ui/Button';

export const NotFoundPage = () => (
  <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 py-20 text-center">
    <div>
      <p className="text-6xl font-bold tracking-tight text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500">
        The page you were looking for has moved or never existed. Let us get you back to the catalogue.
      </p>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/">
          <Button leftIcon={<Home className="h-4 w-4" />}>Go home</Button>
        </Link>
        <Link to="/products">
          <Button variant="outline" leftIcon={<Search className="h-4 w-4" />}>
            Browse products
          </Button>
        </Link>
      </div>
    </div>
  </div>
);
