//src/pages/scoring/index.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';

import { PageContainer } from '../../components/ui/page-container';
import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Slider } from '../../components/ui/slider';
import { FeatureAccess } from '../../components/ui/feature-access';
import { TierBadge } from '../../components/ui/tier-badge';
import { metricCategories, getMetricsByCategory, MetricConfig } from '../../lib/metric-types';
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz } from '../../lib/utils';
import { isFeatureAccessible } from '../../lib/tier-utils';
import { calculateScores, type CompanyScore } from '../../lib/scoringUtils';
import type { CompanyStatus, Currency } from '../../lib/types';

export function ScoringPage() {
  const {
    currentUserTier,
    metricFullRanges,
    displayData,
    loading,
    error,
    getMetricConfigByDbColumn,
    totalCount
  } = useFilters();

  const { currency } = useCurrency();

  const [metricWeights, setMetricWeights] = useState<Record<string, number>>({});

  const handleWeightChange = useCallback((db_column: string, value: number) => {
      setMetricWeights(prev => ({
          ...prev,
          [db_column]: value,
      }));
  }, []);

  const handleResetWeights = useCallback(() => {
      setMetricWeights({});
  }, []);

  const formatRangeDisplay = (value: number | null | undefined, format: MetricConfig['format']): string => {
      if (value === null || value === undefined || !Number.isFinite(value)) return '?';

      const compactOptions = { compact: true, decimals: (format === 'moz' || format === 'ratio' || format === 'years' || format === 'percent') ? 1 : 0 };

      switch(format) {
          case 'currency':
              return formatCurrency(value, { ...compactOptions, currency: currency as Currency });
          case 'percent':
              return formatPercent(value, { decimals: compactOptions.decimals });
          case 'moz':
              return formatMoz(value, { decimals: compactOptions.decimals });
          case 'koz':
              return formatKoz(value, { decimals: compactOptions.decimals });
          case 'years':
              return formatNumber(value, { ...compactOptions, suffix: ' yrs' });
          case 'ratio':
              return formatNumber(value, { ...compactOptions, decimals: 2 });
          case 'number':
          default:
              return formatNumber(value, compactOptions);
      }
  };

  const scoreableMetricFormats: MetricConfig['format'][] = ['number', 'currency', 'percent', 'moz', 'koz', 'ratio', 'years'];

  const scores = useMemo(() => {
    if (!displayData.length || !Object.keys(metricWeights).length) return [];

    const metricConfigsMap: Record<string, MetricConfig> = {};
    getMetricsByCategory('financials').forEach(m => {
      metricConfigsMap[m.db_column] = m;
    });

    return calculateScores(
      displayData,
      metricWeights,
      metricFullRanges,
      metricConfigsMap,
      currentUserTier
    );
  }, [displayData, metricWeights, metricFullRanges, currentUserTier]);

  const pageDescription = loading
    ? "Loading companies..."
    : error
    ? "Error loading data"
    : `Assign weights to score ${totalCount} companies`;

  const pageActions = (
    <Button
        onClick={handleResetWeights}
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={Object.keys(metricWeights).length === 0}
    >
       <RotateCcw className="mr-1 h-4 w-4"/> Reset Weights
    </Button>
  );

  return (
    <PageContainer
      title="Company Scoring"
      description={pageDescription}
      actions={pageActions}
    >
      <div className="space-y-6">
        {loading && (
          <div className="flex justify-center p-10">
            <LoadingIndicator message="Loading data for scoring..." />
          </div>
        )}
        {error && (
          <div className="text-center text-red-400 p-6 bg-red-900/20 rounded-lg">
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-navy-400/10 border-navy-300/10 p-4">
                         <p className='text-surface-white/70 text-sm leading-relaxed'>
                              Use the sliders below to set the relative importance (0% to 100%) for each metric in the overall company score.
                              Higher percentages mean the metric contributes more. Metrics you don't have access to with your current tier are locked and won't be included in the score. The final score will be calculated based only on the metrics you assign a weight &gt; 0%.
                         </p>
                    </Card>

                    {Object.entries(metricCategories).map(([categoryKey, categoryLabel]) => {
                      const metricsInCategory = getMetricsByCategory(categoryKey as MetricConfig['category'])
                        .filter(m => scoreableMetricFormats.includes(m.format));

                      if (metricsInCategory.length === 0) return null;

                      return (
                        <Card key={categoryKey} className="bg-navy-400/10 border-navy-300/10 p-4">
                          <h3 className="text-md font-semibold text-surface-white mb-5 border-b border-navy-300/10 pb-2">{categoryLabel}</h3>
                          <div className="space-y-6">
                            {metricsInCategory.map(metric => {
                              const fullRange = metricFullRanges[metric.db_column];
                              const currentWeight = metricWeights[metric.db_column] ?? 0;
                              const isMetricAccessible = isFeatureAccessible(metric.tier, currentUserTier);

                              return (
                                <div key={metric.key} className="space-y-2">
                                  <div className="flex justify-between items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-sm font-medium ${!isMetricAccessible ? 'text-surface-white/40' : 'text-surface-white'}`}>
                                        {metric.label}
                                        </span>
                                        {!isMetricAccessible && <TierBadge tier={metric.tier} className="scale-75 align-middle ml-1" />}
                                    </div>
                                    {fullRange !== undefined ? (
                                      <span className="text-xs text-surface-white/60 whitespace-nowrap">
                                         Range: {formatRangeDisplay(fullRange[0], metric.format)} - {formatRangeDisplay(fullRange[1], metric.format)}
                                      </span>
                                    ) : (
                                       <span className="text-xs text-surface-white/40 italic">(Range N/A)</span>
                                    )}
                                  </div>

                                  <FeatureAccess requiredTier={metric.tier} currentTier={currentUserTier}>
                                      <div className="flex items-center gap-4 pt-1">
                                          <Slider
                                              min={0}
                                              max={100}
                                              step={5}
                                              value={[currentWeight]}
                                              onValueChange={([value]) => handleWeightChange(metric.db_column, value)}
                                              className="flex-grow"
                                              disabled={fullRange === undefined}
                                              aria-label={`${metric.label} Importance Weight`}
                                          />
                                          <span className="text-sm font-semibold w-14 text-right text-accent-yellow tabular-nums">
                                              {currentWeight}%
                                          </span>
                                      </div>
                                  </FeatureAccess>
                                  {!isMetricAccessible && (
                                      <div className="flex items-center gap-4 pt-1 h-[28px]">
                                           <div className="flex-grow text-xs text-surface-white/40 italic pl-1">Locked ({metric.tier})</div>
                                           <span className="text-sm font-semibold w-14 text-right text-surface-white/40 tabular-nums">
                                               -
                                           </span>
                                      </div>
                                   )}
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      );
                    })}
                </div>

                <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-20">
                   <Card className="bg-navy-400/10 border-navy-300/10 p-4">
                      <h2 className="text-lg font-semibold text-surface-white border-b border-navy-300/20 pb-2 mb-4">Ranked Scores</h2>
                      <div className='min-h-[300px] max-h-[70vh] overflow-y-auto'>
                        {scores.length > 0 ? (
                          <div className="space-y-2">
                            {scores.map((result, index) => (
                              <div
                                key={result.companyId}
                                className="flex items-center justify-between p-2 rounded bg-navy-400/10 hover:bg-navy-400/20"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-surface-white/50 w-8">
                                    #{index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-surface-white">
                                    {result.companyName}
                                  </span>
                                </div>
                                <span className="text-sm font-mono text-accent-yellow">
                                  {result.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className='p-10 text-center text-surface-white/50 text-sm'>
                            Assign weights to metrics to see ranked scores.
                          </div>
                        )}
                      </div>
                    </Card>
                </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}