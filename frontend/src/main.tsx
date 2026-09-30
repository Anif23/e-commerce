import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import './index.css';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import { ErrorBoundary } from './components/common/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <App />
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
