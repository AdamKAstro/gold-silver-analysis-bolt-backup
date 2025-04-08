import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface PageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  children,
  actions,
  className
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-navy-500">
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-surface-white/70 hover:text-surface-white">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-surface-white">{title}</h1>
              {description && (
                <p className="text-xs sm:text-sm text-surface-white/70">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        <div className={cn("bg-navy-500 rounded-lg", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}