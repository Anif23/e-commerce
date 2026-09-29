import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Toaster } from 'react-hot-toast';

import './index.css';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const paypalCurrency = (import.meta.env.VITE_PAYPAL_CURRENCY ?? 'INR').toUpperCase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          {/* PayPal is only bootstrapped when the store actually has a client id. */}
          {paypalClientId ? (
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: paypalCurrency, intent: 'capture' }}>
              <App />
            </PayPalScriptProvider>
          ) : (
            <App />
          )}

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: { borderRadius: 12, fontSize: 14, padding: '10px 14px' },
            }}
          />
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
);
