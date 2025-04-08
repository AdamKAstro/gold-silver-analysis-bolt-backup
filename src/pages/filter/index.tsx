//src/pages/filter/index.tsx
import React, { useMemo, useCallback } from 'react';
import { Filter as FilterIcon, RotateCcw } from 'lucide-react';
import { useFilters } from '../../contexts/filter-context';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { StatusBadge } from '../../components/status-badge';
import { PageContainer } from '../../components/ui/page-container';
import { FeatureAccess } from '../../components/ui/feature-access';
import { PercentageRangeSlider } from '../../components/ui/percentage-range-slider';
import { metricCategories, getMetricsByCategory } from '../../lib/metric-types';
import { cn } from '../../lib/utils';
import type { CompanyStatus, MetricFormat } from '../../lib/types';

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];

function StatusFilter({
  selectedStatuses,
  onStatusChange
}: {
  selectedStatuses: CompanyStatus[];
  onStatusChange: (statuses: CompanyStatus[]) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-surface-white">Development Status</h3>
      <div className="flex flex-wrap gap-2">
        {FILTERABLE_STATUSES.map(status => (
          <button
            key={status}
            onClick={() => {
              const newStatuses = selectedStatuses.includes(status)
                ? selectedStatuses.filter(s => s !== status)
                : [...selectedStatuses, status];
              onStatusChange(newStatuses);
            }}
            className={cn(
              "relative transition-all duration-200 ease-in-out",
              "rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-500",
              selectedStatuses.includes(status)
                ? "scale-105 focus:ring-accent-teal shadow-lg" // Selected: scale up, teal ring
                : cn(
                    "scale-100 hover:scale-[1.02] focus:ring-navy-300", // Unselected: normal scale, navy ring
                    "after:absolute after:inset-0 after:rounded-full after:bg-navy-400/30", // Overlay for unselected
                    "hover:after:bg-navy-400/10" // Lighten overlay on hover
                  )
            )}
            aria-pressed={selectedStatuses.includes(status)}
          >
            <StatusBadge 
              status={status}
              className={cn(
                "transition-transform duration-200",
                !selectedStatuses.includes(status) && "saturate-50"
              )}
            />
          </button>
        ))}
      </div>
      <Button
        variant="link"
        size="sm"
        onClick={() => onStatusChange([])}
        className="text-xs h-auto p-0 text-blue-400 hover:text-blue-300 disabled:text-muted-foreground/50 disabled:no-underline"
        disabled={selectedStatuses.length === 0}
      >
        Clear Statuses
      </Button>
    </div>
  );
}

export function FilterPage() {
  const {
    filterSettings,
    metricFullRanges,
    displayData,
    totalCount,
    loading,
    error,
    currentUserTier,
    setDevelopmentStatusFilter,
    setMetricRange,
    resetFilters,
  } = useFilters();

  const formatDisplayValue = useCallback((value: number | null, format: MetricFormat | undefined, absoluteDefault: number) => {
    const numValue = value ?? absoluteDefault;
    if (numValue === null || numValue === undefined || !Number.isFinite(numValue)) return "-";

    try {
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(numValue);
        case 'percent':
          return `${numValue.toFixed(1)}%`;
        case 'moz':
          return `${numValue.toFixed(2)} Moz`;
        case 'koz':
          return `${Math.round(numValue)} koz`;
        case 'ratio':
          return numValue.toFixed(2);
        case 'years':
          return `${numValue.toFixed(1)} yrs`;
        case 'number':
        default:
          if (Math.abs(numValue) >= 1e6) {
            return new Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(numValue);
          }
          return numValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
      }
    } catch (e) {
      console.error("Formatting error for value:", numValue, "Format:", format, e);
      return String(numValue);
    }
  }, []);

  return (
    <PageContainer
      title="Advanced Filters"
      description={`${loading && !error ? 'Loading companies...' : `${totalCount} companies match your filters`} ${totalCount > displayData.length && !loading && !error ? ` (showing first ${displayData.length})`: ''}`}
      actions={
        <Button variant="outline" size="sm" onClick={resetFilters} title="Reset all filters" className="text-xs">
          <RotateCcw className="mr-1 h-4 w-4"/> Reset Filters
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-navy-400/20 border-navy-300/20 p-4 md:col-span-2">
          <StatusFilter
            selectedStatuses={filterSettings.developmentStatus}
            onStatusChange={setDevelopmentStatusFilter}
          />
        </Card>

        {Object.entries(metricCategories).map(([category, label]) => {
          const allNumericMetricsInCategory = getMetricsByCategory(category as MetricCategory)
            .filter(m => ['number', 'currency', 'percent', 'moz', 'koz', 'ratio', 'years'].includes(m.format));

          if (allNumericMetricsInCategory.length === 0) return null;

          return (
            <Card key={category} className="bg-navy-400/20 border-navy-300/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-surface-white">{label}</h2>
                <FilterIcon className="h-5 w-5 text-surface-white/40" />
              </div>
              <div className="space-y-6">
                {allNumericMetricsInCategory.map(metric => {
                  const fullRange = metricFullRanges[metric.db_column];
                  const currentRange = filterSettings.metricRanges[metric.db_column] || [null, null];
                  const [absoluteMin, absoluteMax] = fullRange ?? [0, 0];
                  const [currentMin, currentMax] = currentRange;

                  return (
                    <div key={metric.key} className="relative space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium text-surface-white",
                            fullRange === undefined && "opacity-50"
                          )}>
                            {metric.label}
                          </span>
                          {fullRange !== undefined && (
                            metric.higherIsBetter
                              ? <span className="text-xs text-emerald-400">↑</span>
                              : <span className="text-xs text-red-400">↓</span>
                          )}
                        </div>
                        <div className={cn(
                          "text-xs",
                          fullRange === undefined
                            ? "text-surface-white/50 italic"
                            : "text-surface-white/70"
                        )}>
                          {fullRange !== undefined
                            ? `${formatDisplayValue(currentMin, metric.format, absoluteMin)} - ${formatDisplayValue(currentMax, metric.format, absoluteMax)}`
                            : "(Range N/A)"
                          }
                        </div>
                      </div>

                      <FeatureAccess
                        requiredTier={metric.tier}
                        currentTier={currentUserTier}
                      >
                        {fullRange !== undefined ? (
                          <div className="relative pt-1">
                            <PercentageRangeSlider
                              fullRange={fullRange}
                              currentRange={currentRange}
                              onRangeChange={(min, max) => setMetricRange(metric.db_column, min, max)}
                            />
                          </div>
                        ) : (
                          <div className="h-8 bg-navy-400/20 rounded mt-3" />
                        )}
                      </FeatureAccess>

                      <p className={cn(
                        "text-xs text-surface-white/50",
                        fullRange === undefined && "opacity-50"
                      )}>
                        {metric.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-navy-500/80 backdrop-blur-sm flex items-center justify-center z-50">
          <LoadingIndicator />
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-navy-500/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-navy-400/90 rounded-lg p-6 max-w-md text-center">
            <p className="text-red-400 font-semibold mb-4">{error}</p>
            <Button onClick={resetFilters} variant="destructive">
              Clear Filters & Retry
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}