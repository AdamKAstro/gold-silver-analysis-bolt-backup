import React from 'react';
import { Check, Crown, Star, ArrowRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Typography } from '../../components/ui/typography';
import { cn } from '../../lib/utils';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Basic access to company data',
    features: [
      'Basic company information',
      'Limited financial metrics',
      'Public company profiles',
      'Daily updates'
    ],
    icon: null,
    color: 'gray',
    buttonText: 'Get Started',
    buttonVariant: 'outline' as const
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'Advanced analytics and insights',
    features: [
      'All Free features',
      'Advanced financial metrics',
      'Resource estimates',
      'Production data',
      'Custom watchlists',
      'Export capabilities'
    ],
    icon: Star,
    color: 'accent-teal',
    popular: true,
    buttonText: 'Start Pro Trial',
    buttonVariant: 'primary' as const
  },
  {
    name: 'Premium',
    price: '$99',
    period: '/month',
    description: 'Complete access and premium features',
    features: [
      'All Pro features',
      'Real-time alerts',
      'API access',
      'Cost metrics',
      'Valuation models',
      'Priority support'
    ],
    icon: Crown,
    color: 'accent-yellow',
    buttonText: 'Start Premium Trial',
    buttonVariant: 'primary' as const
  }
];

export function SubscribePage() {
  return (
    <div className="min-h-screen bg-navy-500">
      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-50"></div>

      {/* Header */}
      <header className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-teal to-accent-teal/80">
              <div className="h-5 w-5 rotate-45 transform border-2 border-surface-white"></div>
            </div>
            <span className="text-sm font-bold text-surface-white">Can PM Rank</span>
          </Link>

          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-surface-white/70 hover:text-surface-white"
            >
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Content */}
        <div className="relative">
          <div className="text-center mb-16">
            <Typography variant="h3" className="text-surface-white text-base sm:text-lg font-bold">
              Choose Your Plan
            </Typography>
            <Typography variant="body" className="mt-2 text-surface-white/70 text-xs">
              Get access to comprehensive mining company analytics and insights
            </Typography>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={cn(
                    "relative transform transition-all duration-300 hover:scale-[1.02]",
                    "h-full"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-navy-400/40 px-2.5 py-0.5 text-xs font-medium text-surface-white ring-1 ring-navy-300/20">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "relative h-full rounded-xl border border-navy-300/20 p-6",
                      "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b",
                      "before:from-navy-300/5 before:to-transparent before:blur-sm",
                      plan.popular
                        ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/5"
                        : "bg-navy-400/80 text-surface-white shadow-md shadow-navy-300/5",
                      plan.color === 'accent-yellow' && "before:from-accent-yellow/5",
                      plan.color === 'accent-teal' && "before:from-accent-teal/5"
                    )}
                  >
                    <div className="relative flex items-center gap-3">
                      {Icon && (
                        <Icon
                          className={cn(
                            "h-8 w-8",
                            plan.color === 'accent-yellow'
                              ? "text-accent-yellow"
                              : plan.color === 'accent-teal'
                              ? "text-accent-teal"
                              : "text-surface-white"
                          )}
                        />
                      )}
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                    </div>

                    <div className="relative mt-4 flex items-baseline">
                      <span className="text-3xl font-bold tracking-tight">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-surface-white/80 ml-1 text-sm font-medium">{plan.period}</span>
                      )}
                    </div>

                    <p className="relative mt-4 text-sm font-medium text-surface-white/90">{plan.description}</p>

                    <ul className="relative mt-8 space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 flex-shrink-0 text-accent-teal" />
                          <span className="text-sm font-medium text-surface-white">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "relative mt-8 w-full text-sm font-semibold h-11",
                        "bg-navy-300/20 hover:bg-navy-300/30 text-surface-white border border-navy-200/20",
                        "transition-all duration-200 ease-in-out"
                      )}
                    >
                      {plan.buttonText}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <Typography variant="body" className="text-sm text-surface-white/60">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-accent-teal hover:text-accent-teal/90 font-medium inline-flex items-center gap-1"
              >
                Sign in <ArrowRight className="h-3 w-3" />
              </Link>
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}