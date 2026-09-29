import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../lib/queryClient';
import { useRealtime } from '../hooks/useRealtime';

/** Wires the socket listener into the React tree once the cache exists. */
const RealtimeBridge = () => {
  useRealtime();
  return null;
};

export const QueryProvider = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <RealtimeBridge />
    {children}
  </QueryClientProvider>
);
