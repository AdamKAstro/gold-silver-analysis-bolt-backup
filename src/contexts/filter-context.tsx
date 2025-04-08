//src/contexts/filter-conte
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useMemo } from 'react';
import debounce from 'debounce';
import type { Company, RpcResponseRow, CompanyStatus, ColumnTier, Currency } from '../lib/types';
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs, MetricConfig } from '../lib/metric-types';

// --- State Types ---
interface MetricRanges { [db_column: string]: [number | null, number | null]; }
interface FilterSettings { 
  developmentStatus: CompanyStatus[]; 
  metricRanges: MetricRanges; 
  searchTerm?: string; 
}
interface MetricFullRanges { [db_column: string]: [number, number]; }

interface FilterContextType {
  currentUserTier: ColumnTier;
  currentCurrency: Currency;
  filterSettings: FilterSettings;
  metricFullRanges: MetricFullRanges;
  displayData: Company[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  setCurrentUserTier: (tier: ColumnTier) => void;
  setCurrentCurrency: (currency: Currency) => void;
  setDevelopmentStatusFilter: (statuses: CompanyStatus[]) => void;
  setMetricRange: (db_column: string, min: number | null, max: number | null) => void;
  setSearchTerm: (term: string) => void;
  resetFilters: () => void;
  getMetricConfigByDbColumn: (db_column: string) => MetricConfig | undefined;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  developmentStatus: ['producer', 'developer', 'explorer'],
  metricRanges: {},
  searchTerm: '',
};

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserTier, setCurrentUserTier] = useState<ColumnTier>('free');
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('USD');
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [metricFullRanges, setMetricFullRanges] = useState<MetricFullRanges>({});
  const [displayData, setDisplayData] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [rangeLoading, setRangeLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const loading = rangeLoading || dataLoading;
  const [error, setError] = useState<string | null>(null);

  // Fetch Full Metric Ranges
  useEffect(() => {
    const fetchFullRanges = async () => {
      setRangeLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_metrics_ranges');

        if (rpcError) {
          throw new Error(`Database error fetching ranges: ${rpcError.message}`);
        }

        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setMetricFullRanges(data as MetricFullRanges);
        } else {
          setMetricFullRanges({});
        }
      } catch (err: any) {
        console.error("Error fetching metric ranges:", err);
        setError(err.message || "Could not load metric range data.");
        setMetricFullRanges({});
      } finally {
        setRangeLoading(false);
      }
    };

    fetchFullRanges();
  }, []);

  // Fetch Data based on Filters
  const fetchData = useCallback(async (settings: FilterSettings, currency: Currency) => {
    setDataLoading(true);
    setError(null);

    const filtersJson: Record<string, any> = {};
    
    if (settings.developmentStatus?.length > 0) {
      filtersJson.status = settings.developmentStatus;
    }
    
    if (settings.searchTerm?.trim()) {
      filtersJson.searchTerm = settings.searchTerm.trim();
    }
    
    Object.entries(settings.metricRanges ?? {}).forEach(([db_column, range]) => {
      const [minVal, maxVal] = range;
      if (minVal !== null && typeof minVal === 'number' && Number.isFinite(minVal)) {
        filtersJson[`min_${db_column}`] = minVal;
      }
      if (maxVal !== null && typeof maxVal === 'number' && Number.isFinite(maxVal)) {
        filtersJson[`max_${db_column}`] = maxVal;
      }
    });

    try {
      const { data, error: rpcError } = await supabase.rpc('get_companies_paginated', {
        page_num: 1,
        page_size: 500,
        sort_column: 'company_name',
        sort_direction: 'asc',
        target_currency: currency,
        filters: filtersJson
      });

      if (rpcError) throw rpcError;

      if (!data) {
        setDisplayData([]);
        setTotalCount(0);
      } else {
        const companies = convertRpcRowsToCompanies(data);
        setDisplayData(companies);
        setTotalCount(data[0]?.total_rows ?? companies.length);
      }
    } catch (err: any) {
      console.error('Error fetching/processing companies:', err);
      setError(`Data fetch failed: ${err.message}`);
      setDisplayData([]);
      setTotalCount(0);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const debouncedFetchData = useMemo(() => debounce(fetchData, 350), [fetchData]);

  useEffect(() => {
    debouncedFetchData(filterSettings, currentCurrency);
    return () => {
      debouncedFetchData.clear();
    };
  }, [filterSettings, currentCurrency, debouncedFetchData]);

  const handleSetDevelopmentStatus = useCallback((statuses: CompanyStatus[]) => {
    setFilterSettings(prev => ({
      ...prev,
      developmentStatus: statuses
    }));
  }, []);

  const handleSetMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => {
    setFilterSettings(prev => {
      const newRanges = { ...prev.metricRanges, [db_column]: [min, max] };
      return { ...prev, metricRanges: newRanges };
    });
  }, []);

  const handleSetSearchTerm = useCallback((term: string) => {
    setFilterSettings(prev => ({
      ...prev,
      searchTerm: term
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
  }, []);

  const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => {
    return allMetricConfigs.find(m => m.db_column === db_column);
  }, []);

  const value = useMemo(() => ({
    currentUserTier,
    currentCurrency,
    filterSettings,
    metricFullRanges,
    displayData,
    totalCount,
    loading,
    error,
    setCurrentUserTier,
    setCurrentCurrency,
    setDevelopmentStatusFilter: handleSetDevelopmentStatus,
    setMetricRange: handleSetMetricRange,
    setSearchTerm: handleSetSearchTerm,
    resetFilters: handleResetFilters,
    getMetricConfigByDbColumn,
  }), [
    currentUserTier,
    currentCurrency,
    filterSettings,
    metricFullRanges,
    displayData,
    totalCount,
    loading,
    error,
    handleSetDevelopmentStatus,
    handleSetMetricRange,
    handleSetSearchTerm,
    handleResetFilters,
    getMetricConfigByDbColumn
  ]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};