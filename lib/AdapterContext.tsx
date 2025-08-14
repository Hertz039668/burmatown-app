import React, { useContext } from 'react';
import { PersistenceAdapter, chooseAdapter } from './adapters';

// React context to supply a single PersistenceAdapter instance app-wide.
// If no provider is present, hooks will fall back to chooseAdapter().
const AdapterContext = React.createContext<PersistenceAdapter | null>(null);

export const AdapterProvider: React.FC<{ adapter?: PersistenceAdapter; children: React.ReactNode }> = ({ adapter, children }) => {
  const value = adapter || chooseAdapter();
  return <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>;
};

export function useAdapterFromContext(): PersistenceAdapter | null {
  return useContext(AdapterContext);
}

// Helper to resolve an adapter (context first, then auto-choice) used by hooks.
export function resolveAdapter(explicit?: PersistenceAdapter, ctx?: PersistenceAdapter | null): PersistenceAdapter {
  if (explicit) return explicit;
  if (ctx) return ctx;
  return chooseAdapter();
}

export default AdapterContext;
