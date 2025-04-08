import React, { createContext, useContext, useState } from 'react';
import type { SubscriptionTier } from '../lib/types';

interface SubscriptionContextType {
  getEffectiveTier: () => SubscriptionTier;
  setTier: (tier: SubscriptionTier) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('premium');

  const getEffectiveTier = () => tier;

  return (
    <SubscriptionContext.Provider value={{ getEffectiveTier, setTier }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}