import React from 'react';
import { ArrowRight, Crown, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Typography } from './typography';
import { Button } from './button';

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  return (
    <div className={cn(
      'relative min-h-[80vh] w-full overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950',
      className
    )}>
      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-50"></div>

      {/* Header */}
      <header className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600">
              <div className="h-5 w-5 rotate-45 transform border-2 border-white"></div>
            </div>
            <span className="text-base font-bold text-white">Can PM Rank</span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/companies" className="text-sm text-gray-300 hover:text-white transition-colors">
              Companies
            </Link>
            <Link to="/creators" className="text-sm text-gray-300 hover:text-white transition-colors">
              Creators
            </Link>
            <Link to="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-sm text-gray-300 hover:text-white transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA Button */}
          <Link to="/subscribe">
            <Button
              variant="outline"
              size="sm"
              className="bg-navy-400/40 border-navy-300/20 text-surface-white hover:bg-navy-400/60 hover:border-navy-300/40"
            >
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Content */}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Left Column */}
          <div className="max-w-2xl">
            <div className="relative">
              {/* Accent Circle */}
              <div className="absolute -left-8 top-1 h-6 w-6 rounded-full bg-amber-500 ring-4 ring-amber-500/30"></div>
              
              <Typography
                variant="h1"
                className="text-3xl sm:text-4xl lg:text-5xl text-white"
              >
                Peak Performance Metrics for Canadian Precious Metals
              </Typography>
            </div>

            <Typography
              variant="subtitle"
              className="mt-6 text-sm sm:text-base text-gray-400"
            >
              Your definitive index for evaluating and comparing Canadian gold, silver, and platinum group metal mining stocks. Filter, analyze, and discover value.
            </Typography>

            <div className="mt-8 flex items-center gap-4">
              <Link to="/companies">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                >
                  Access the Index
                </Button>
              </Link>
              <Link
                to="/about"
                className="group inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors"
              >
                Learn More
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative lg:mt-24">
            {/* Stats Card */}
            <div className="absolute right-0 top-0 lg:top-1/2 lg:-translate-y-1/2 w-full lg:w-80">
              <div className="rounded-2xl bg-gray-800/50 p-6 backdrop-blur-sm">
                <Typography variant="h3" className="text-lg sm:text-xl text-white">
                  The Gold Standard in Canadian Miner Rankings
                </Typography>
                <Typography variant="body" className="mt-3 text-sm text-gray-400">
                  Independent, in-depth rankings and financial data for Canada's precious metals sector.
                </Typography>
                <Link to="/subscribe">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-amber-500 hover:text-amber-400 hover:bg-gray-800/50"
                  >
                    Get Ranked Insights™
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Award Badge */}
      <div className="absolute bottom-0 left-8 -mb-6 h-12 w-12 rounded-full border-4 border-gray-800 bg-gray-900"></div>
    </div>
  );
}