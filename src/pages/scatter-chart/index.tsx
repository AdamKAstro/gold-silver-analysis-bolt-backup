// src/pages/scatter-chart/index.tsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Download, Settings, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
// Add ScriptableContext and specific types for clarity
import { Chart as ChartJS, LinearScale, PointElement, LogarithmicScale, Tooltip, Legend, ChartOptions, ScatterDataPoint, ScriptableContext } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import gradient from 'chartjs-plugin-gradient';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels'; // Import Context type

// Context Hooks
import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';

// Lib Utilities and Types
import { cn, getNestedValue } from '../../lib/utils';
import { getMetricByKey, getAccessibleMetrics } from '../../lib/metric-types';
import { getCompaniesForScatterChart } from '../../lib/supabase';
import { normalizeValues, formatValueWrapper, getDomain, exportChartCode, downloadJson } from './chartUtils';
import type { Company, ColumnTier, MetricConfig, Currency } from '../../lib/types';

// UI Components
import { Button } from '../../components/ui/button';
import { MetricSelector } from '../../components/metric-selector';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { PageContainer } from '../../components/ui/page-container';
import { FeatureAccess } from '../../components/ui/feature-access';

// Register Chart.js plugins
ChartJS.register(
  LinearScale, LogarithmicScale, PointElement, Tooltip, Legend, zoomPlugin, gradient, ChartDataLabels
);

// --- ScaleToggle Component ---
function ScaleToggle({ scale, onChange, label }: { scale: 'linear' | 'log', onChange: (scale: 'linear' | 'log') => void, label: string }) {
    return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-surface-white/70">{label}:</span>
          <div className="flex bg-navy-400/20 rounded-lg overflow-hidden p-0.5 gap-0.5">
            <button
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                scale === 'linear'
                  ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30"
                  : "text-surface-white/70 hover:bg-navy-400/30"
              )}
              onClick={() => onChange('linear')}
              aria-pressed={scale === 'linear'}
            >
              Linear
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                scale === 'log'
                  ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30"
                  : "text-surface-white/70 hover:bg-navy-400/30"
              )}
              onClick={() => onChange('log')}
              aria-pressed={scale === 'log'}
            >
              Log
            </button>
          </div>
        </div>
      );
}

// --- Chart Settings Constants ---
// These functions translate a normalized value (0-1) into a pixel radius
const chartSettingsFunctions = {
    pointRadius: (normalizedValue: number): number => {
        const clampedValue = Math.max(0, Math.min(1, normalizedValue || 0));
        // Linear scaling: Base size 5, max additional size 25 (total max ~30)
        return 5 + clampedValue * 25;
    },
    pointHoverRadius: (normalizedValue: number): number => {
       const clampedValue = Math.max(0, Math.min(1, normalizedValue || 0));
       // Slightly larger hover radius
       return 7 + clampedValue * 28; // Base 7, max additional 28 (total max ~35)
    }
};

// Status color mapping (Ensure all statuses used in data are covered)
const statusColors: Record<string, { background: string; border: string }> = {
  producer: {
    background: 'rgba(34, 197, 94, 0.7)', // Emerald-500
    border: 'rgb(22, 163, 74)' // Emerald-600
  },
  developer: {
    background: 'rgba(59, 130, 246, 0.7)', // Blue-500
    border: 'rgb(37, 99, 235)' // Blue-600
  },
  explorer: {
    background: 'rgba(168, 85, 247, 0.7)', // Purple-500
    border: 'rgb(147, 51, 234)' // Purple-600
  },
  royalty: {
      background: 'rgba(244, 162, 97, 0.7)', // Accent Yellow/Orange
      border: 'rgb(217, 119, 6)' // Amber-600
  },
  other: {
    background: 'rgba(107, 114, 128, 0.7)', // Gray-500
    border: 'rgb(75, 85, 99)' // Gray-600
  },
  default: { // Fallback if status is null/undefined
    background: 'rgba(107, 114, 128, 0.7)', // Gray-500
    border: 'rgb(75, 85, 99)' // Gray-600
  }
};


// --- ScatterChartPage Component ---
export function ScatterChartPage() {
  // Hooks
  const { currentUserTier } = useFilters();
  const { currency } = useCurrency();

  // State
  const [rawData, setRawData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xMetric, setXMetric] = useState('financials.market_cap_value');
  const [yMetric, setYMetric] = useState('valuation_metrics.ev_per_resource_oz_all');
  const [zMetric, setZMetric] = useState('production.current_production_total_aueq_koz');
  const [xScale, setXScale] = useState<'linear' | 'log'>('log');
  const [yScale, setYScale] = useState<'linear' | 'log'>('log');
  const [zScale, setZScale] = useState<'linear' | 'log'>('linear');
  const [showSettings, setShowSettings] = useState(false); // Currently unused, for future
  const [isMounted, setIsMounted] = useState(false);

  // Refs
  const chartRef = useRef<ChartJS<'scatter', (number | ScatterDataPoint | null)[], unknown> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => { setIsMounted(true); return () => setIsMounted(false); }, []);
  useEffect(() => { return () => { chartRef.current?.destroy(); chartRef.current = null; }; }, []);

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const companies = await getCompaniesForScatterChart(currency as Currency);
        setRawData(companies);
      } catch (err: any) {
        console.error("Error fetching scatter chart data:", err); setError(err.message || 'Failed to fetch data');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [currency]);

  // Memos for configs
  const accessibleMetrics = useMemo(() => getAccessibleMetrics(currentUserTier), [currentUserTier]);
  const xMetricConfig = useMemo(() => getMetricByKey(xMetric), [xMetric]);
  const yMetricConfig = useMemo(() => getMetricByKey(yMetric), [yMetric]);
  const zMetricConfig = useMemo(() => getMetricByKey(zMetric), [zMetric]);

  // Memo for chart data transformation
  const chartDatasets = useMemo(() => {
    if (!rawData.length || !xMetricConfig?.nested_path || !yMetricConfig?.nested_path || !zMetricConfig?.nested_path) {
      return [];
    }

    // 1. Map raw data to points with x, y, z, and company info
    const points = rawData.map(company => ({
      x: getNestedValue(company, xMetricConfig.nested_path),
      y: getNestedValue(company, yMetricConfig.nested_path),
      z: getNestedValue(company, zMetricConfig.nested_path),
      company,
    })).filter(point => // 2. Filter out points with invalid/non-positive data for the scales used
      Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z) &&
      (xScale !== 'log' || (typeof point.x === 'number' && point.x > 0)) &&
      (yScale !== 'log' || (typeof point.y === 'number' && point.y > 0)) &&
      (zScale !== 'log' || (typeof point.z === 'number' && point.z > 0))
    );

    console.log(`ScatterChart: Generated ${points.length} valid points from ${rawData.length} companies.`);

    // 3. Extract Z values and normalize them (0-1) based on the selected Z scale
    const zValues = points.map(p => p.z as number);
    const normalizedZ = normalizeValues(zValues, zScale);

    // 4. Group valid points by status to create datasets
    const groupedPoints = points.reduce((acc, point, i) => {
      const status = point.company.status?.toLowerCase() || 'default'; // Use 'default' as fallback key
      if (!acc[status]) {
        // Initialize dataset for this status group
        acc[status] = {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          data: [], // This will hold { x, y, r_normalized, company } objects
          // --- Styling --- (Removed pointRadius/hoverRadius from here)
          backgroundColor: statusColors[status]?.background || statusColors.default.background,
          borderColor: statusColors[status]?.border || statusColors.default.border,
          borderWidth: 1,
          hoverBorderWidth: 2, // Hover effect on border
          // --- Datalabels config PER DATASET ---
          datalabels: {
             color: '#F9C74F', // Yellow/Gold text color
             font: { size: 9, weight: '600', family: "'Courier New', Courier, monospace" },
             // backgroundColor removed for no background
             borderRadius: 3, // Still useful for padding target
             padding: 1, // Minimal padding
             textAlign: 'center', anchor: 'center', align: 'center', offset: 0, clamp: true, clip: false,
             // Display logic (can re-enable threshold later)
             display: true, // Keep true for now to ensure visibility
             // Formatter to get the text (TSX code)
             formatter: (value: any, context: Context): string | null => {
                 const datasetIndex = context.datasetIndex;
                 const dataIndex = context.dataIndex;
                 // Access the chartDatasets defined in the outer scope
                 const dataPoint = chartDatasets?.[datasetIndex]?.data?.[dataIndex] as any;
                 const company = dataPoint?.company;
                 const tsxCode = company?.tsx_code;
                 const rNormValue = dataPoint?.r_normalized; // Access normalized radius

                 // Optional: Re-introduce size threshold based on normalized value
                 // const sizeThreshold = 0.1; // Only show if normalized Z > 0.1
                 // if (rNormValue === undefined || rNormValue < sizeThreshold) return null;

                 if (tsxCode) { return tsxCode; }
                 return null; // Return null if no code, label won't render
             }
          } // End datalabels
        }; // End dataset init
      } // end if !acc[status]

      // 5. Add the data point to the correct group's data array
      // Store the NORMALIZED Z value (0-1) as 'r_normalized'
      // The actual pixel radius will be calculated in chartOptions using this
      acc[status].data.push({
        x: point.x as number,
        y: point.y as number,
        r_normalized: normalizedZ[i] || 0, // Store normalized value (0-1)
        company: point.company // Keep company data for tooltips/formatter lookup
      });

      return acc; // Return accumulator
    }, {} as Record<string, any>); // Initial empty object for accumulator

    // 6. Return the array of dataset objects
    return Object.values(groupedPoints);

  // Dependencies for re-calculating datasets
  }, [rawData, xMetricConfig, yMetricConfig, zMetricConfig, xScale, yScale, zScale]);


  // Memo for chart options
  const chartOptions = useMemo(() => {
    const options: ChartOptions<'scatter'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Better performance for interactive charts
        // *** Configure point elements for bubble size ***
        elements: {
            point: {
                // Scriptable option for radius based on data context
                radius: (context: ScriptableContext<'scatter'>) => {
                    const dataPoint = context.raw as any; // context.raw should be {x, y, r_normalized, company}
                    if (!dataPoint) return 5; // Default minimum size

                    const normalizedValue = dataPoint.r_normalized; // Get our stored 0-1 value
                    if (typeof normalizedValue !== 'number') return 5; // Default if value missing

                    // Apply the scaling function to get pixel radius
                    return chartSettingsFunctions.pointRadius(normalizedValue);
                },
                // Scriptable option for hover radius
                hoverRadius: (context: ScriptableContext<'scatter'>) => {
                     const dataPoint = context.raw as any;
                     if (!dataPoint) return 7; // Default minimum hover size
                     const normalizedValue = dataPoint.r_normalized;
                     if (typeof normalizedValue !== 'number') return 7;
                     // Apply the hover scaling function
                     return chartSettingsFunctions.pointHoverRadius(normalizedValue);
                },
                // Optional: Set a base hover background color if needed
                // hoverBackgroundColor: 'rgba(255, 255, 255, 0.3)'
            }
        },
        scales: { // Scales config remains the same
            x: {
                type: xScale === 'log' ? 'logarithmic' : 'linear',
                position: 'bottom',
                title: { display: true, text: xMetricConfig?.label ? `${xMetricConfig.label}${xScale === 'log' ? ' (Log Scale)' : ''}` : '', color: '#E5E7EB', font: { size: 12 } },
                ticks: { color: '#9CA3AF', font: { size: 10 }, callback: (value: number | string) => formatValueWrapper(typeof value === 'number' ? value : NaN, xMetricConfig?.format, currency as Currency), maxTicksLimit: 8 },
                grid: { color: 'rgba(75, 85, 99, 0.2)', borderColor: 'rgba(75, 85, 99, 0.5)' }
            },
            y: {
                type: yScale === 'log' ? 'logarithmic' : 'linear',
                position: 'left',
                title: { display: true, text: yMetricConfig?.label ? `${yMetricConfig.label}${yScale === 'log' ? ' (Log Scale)' : ''}` : '', color: '#E5E7EB', font: { size: 12 } },
                ticks: { color: '#9CA3AF', font: { size: 10 }, callback: (value: number | string) => formatValueWrapper(typeof value === 'number' ? value : NaN, yMetricConfig?.format, currency as Currency), maxTicksLimit: 8 },
                grid: { color: 'rgba(75, 85, 99, 0.2)', borderColor: 'rgba(75, 85, 99, 0.5)' }
            }
        },
        plugins: {
            legend: { // Legend config remains the same
                 position: 'bottom', labels: { color: '#E5E7EB', usePointStyle: true, pointStyle: 'circle', padding: 20, font: { family: 'Inter, sans-serif', size: 11 } }
            },
            tooltip: { // Tooltip config remains the same (uses external chartDatasets lookup)
                enabled: true, backgroundColor: 'rgba(17, 24, 39, 0.9)', titleColor: '#F3F4F6', bodyColor: '#D1D5DB', borderColor: 'rgba(75, 85, 99, 0.5)', borderWidth: 1, padding: 12, boxPadding: 4, usePointStyle: true,
                callbacks: {
                    label: (context: any) => {
                        const datasetIndex = context.datasetIndex;
                        const dataIndex = context.dataIndex;
                        const dataPoint = chartDatasets?.[datasetIndex]?.data?.[dataIndex] as any;

                        if (!dataPoint || !dataPoint.company) return '';

                        const lines = [];
                        lines.push(` ${dataPoint.company.company_name} (${dataPoint.company.tsx_code || 'N/A'})`);
                        if (xMetricConfig) lines.push(` ${xMetricConfig.label}: ${formatValueWrapper(dataPoint.x, xMetricConfig.format, currency as Currency)}`);
                        if (yMetricConfig) lines.push(` ${yMetricConfig.label}: ${formatValueWrapper(dataPoint.y, yMetricConfig.format, currency as Currency)}`);
                        if (zMetricConfig) {
                             const rawZ = getNestedValue(dataPoint.company, zMetricConfig.nested_path);
                             const pixelRadius = chartSettingsFunctions.pointRadius(dataPoint.r_normalized); // Calculate radius for display
                             lines.push(` ${zMetricConfig.label}: ${formatValueWrapper(rawZ, zMetricConfig.format, currency as Currency)} (Size: ${pixelRadius.toFixed(1)}px)`);
                         }
                        return lines;
                    }
                }
            },
            zoom: { // Zoom config remains the same
                 zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'xy' },
                 pan: { enabled: true, mode: 'xy', threshold: 5 }
            },
            datalabels: { // Global datalabels config (mostly disabled, handled per dataset)
                display: false
            }
        } // End plugins
    }; // End options object
    return options;
  // Dependencies for chart options - chartDatasets is NOT needed here now
  // as radius functions access context.raw, and tooltip/formatter use closure
  }, [xScale, yScale, xMetricConfig, yMetricConfig, zMetricConfig, currency]);


  // Handlers (remain the same)
  const handleZoomIn = useCallback(() => { chartRef.current?.zoom(1.2); }, []);
  const handleZoomOut = useCallback(() => { chartRef.current?.zoom(0.8); }, []);
  const handleResetZoom = useCallback(() => { chartRef.current?.resetZoom(); }, []);
  const handleExportCode = useCallback(() => {
       try { const code = exportChartCode(); downloadJson(code, 'scatter-chart-code.json'); }
       catch (exportError) { console.error("Failed to export code:", exportError); }
   }, []);

  // Page Actions (remain the same)
  const pageActions = (
     <> <Button variant="ghost" size="sm" onClick={handleExportCode} title="Download Code Snippets"> <Download className="h-4 w-4 mr-1" /> Code </Button> </>
   );

  // --- Render Logic ---
  return (
    <PageContainer
      title="Scatter Analysis"
      description={loading ? "Loading data..." : error ? "Error loading data" : `Comparing ${rawData.length} companies`}
      actions={pageActions}
    >
      <div className="space-y-6">
        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start bg-navy-400/10 p-4 rounded-lg">
           <FeatureAccess requiredTier={xMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                <div className="space-y-2"><MetricSelector label="X Axis" selectedMetric={xMetric} onMetricChange={setXMetric} metrics={accessibleMetrics} currentTier={currentUserTier}/><ScaleToggle scale={xScale} onChange={setXScale} label="X Scale"/></div>
           </FeatureAccess>
            <FeatureAccess requiredTier={yMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                 <div className="space-y-2"><MetricSelector label="Y Axis" selectedMetric={yMetric} onMetricChange={setYMetric} metrics={accessibleMetrics} currentTier={currentUserTier}/><ScaleToggle scale={yScale} onChange={setYScale} label="Y Scale"/></div>
            </FeatureAccess>
            <FeatureAccess requiredTier={zMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                 <div className="space-y-2"><MetricSelector label="Bubble Size" selectedMetric={zMetric} onMetricChange={setZMetric} metrics={accessibleMetrics} currentTier={currentUserTier}/><ScaleToggle scale={zScale} onChange={setZScale} label="Size Scale"/></div>
            </FeatureAccess>
        </div>

        {/* Chart Section */}
        <div className="relative bg-navy-400/20 rounded-lg p-4 shadow-lg border border-navy-300/10">
          {/* Toolbar */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
             <Button variant="outline" size="icon-sm" onClick={handleZoomIn} title="Zoom In"> <ZoomIn className="h-4 w-4" /> </Button>
             <Button variant="outline" size="icon-sm" onClick={handleZoomOut} title="Zoom Out"> <ZoomOut className="h-4 w-4" /> </Button>
             <Button variant="outline" size="icon-sm" onClick={handleResetZoom} title="Reset Zoom"> <RotateCcw className="h-4 w-4" /> </Button>
          </div>

          {/* Canvas Container */}
          <div className="h-[65vh] min-h-[500px]" ref={containerRef}>
            {loading ? ( <div className="h-full flex items-center justify-center text-surface-white/70"> <LoadingIndicator message="Loading chart data..." /> </div>
            ) : error ? ( <div className="h-full flex flex-col items-center justify-center text-red-400"> <p className="font-semibold mb-2">Error Loading Chart</p> <p className="text-sm">{error}</p> </div>
            ) : isMounted && containerRef.current ? (
                 <Scatter
                    ref={chartRef}
                    data={{ datasets: chartDatasets }}
                    options={chartOptions}
                  />
            ) : ( <div className="h-full flex items-center justify-center text-surface-white/50"> Initializing chart... </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
} // End ScatterChartPage Component