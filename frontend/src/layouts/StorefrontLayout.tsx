import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AnnouncementBar } from '../components/storefront/AnnouncementBar';
import { CartDrawer } from '../components/storefront/CartDrawer';
import { Footer } from '../components/storefront/Footer';
import { Header } from '../components/storefront/Header';

export const StorefrontLayout = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <AnnouncementBar />
      <Header onOpenCart={() => setCartOpen(true)} />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};
