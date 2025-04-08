import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Home } from 'lucide-react';
import { useFilters } from '../../contexts/filter-context';
import { CurrencySelector } from '../../components/currency-selector';
import { TierSelector } from '../../components/tier-selector';
import { Button } from './button';

export function Header() {
  const { currentUserTier, setCurrentUserTier } = useFilters();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-300/20 bg-navy-500/95 backdrop-blur supports-[backdrop-filter]:bg-navy-500/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4">
        {/* Brand / Logo */}
        <div className="mr-4 flex">
          <Link className="mr-6 flex items-center gap-2" to="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-teal to-accent-teal/80">
              <Database className="h-5 w-5 text-surface-white" />
            </div>
            <span className="font-bold text-surface-white hidden sm:inline-block">
              Mining Analytics
            </span>
          </Link>
        </div>

        {/* Right Side Items */}
        <div className="flex items-center gap-4">
          <TierSelector
            currentTier={currentUserTier}
            onTierChange={setCurrentUserTier}
          />
          <CurrencySelector />
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-surface-white/70 hover:text-surface-white"
            >
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}