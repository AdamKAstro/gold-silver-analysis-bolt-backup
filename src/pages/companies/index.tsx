//src/pages/companies/index.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Filter, LineChart, RotateCcw } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useFilters } from "../../contexts/filter-context";
import { CompanyDataTable } from "../../components/company-data-table";
import { CurrencySelector } from "../../components/currency-selector";
import { LoadingIndicator } from "../../components/ui/loading-indicator";
import { Button } from "../../components/ui/button";
import { PageContainer } from "../../components/ui/page-container";
import { useSubscription } from "../../contexts/subscription-context";
import { useCurrency } from "../../contexts/currency-context";
import { cn } from "../../lib/utils";
import type { Company, FilterState, SortState, ColumnTier, CompanyStatus } from "../../lib/types";

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];
const initialSortState: SortState = { key: 'company_name', direction: 'asc' };

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) { clearTimeout(timeout); timeout = null; }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced;
}

export function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getEffectiveTier } = useSubscription();
  const { currency } = useCurrency();

  const {
    displayData,
    loading: contextLoading,
    error: contextError,
    totalCount: contextTotalCount,
    filterSettings,
    setDevelopmentStatusFilter,
    setSearchTerm,
    resetFilters,
    currentUserTier
  } = useFilters();

  const companies = displayData;
  const loading = contextLoading;
  const error = contextError;
  const totalCount = contextTotalCount;

  const [isTableVisible, setIsTableVisible] = useState(false);
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || 25);
  const [sortState, setSortState] = useState<SortState>(() => ({
    key: searchParams.get('sortKey') || initialSortState.key,
    direction: (searchParams.get('sortDir') as 'asc' | 'desc') || initialSortState.direction,
  }));

  const [localSearchTerm, setLocalSearchTerm] = useState<string>(filterSettings.searchTerm || '');
  const selectedStatuses = useMemo(() => filterSettings.developmentStatus || [], [filterSettings.developmentStatus]);

  const updateUrlParams = useCallback((newParams: Record<string, string | number | null>) => {
    const current = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });
    setSearchParams(current, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!loading && !error) {
      setIsTableVisible(true);
    }
  }, [loading, error]);

  useEffect(() => {
    updateUrlParams({
      page,
      pageSize,
      sortKey: sortState.key,
      sortDir: sortState.direction,
      search: filterSettings.searchTerm || null,
      status: filterSettings.developmentStatus.join(','),
    });
  }, [page, pageSize, sortState, filterSettings, updateUrlParams]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortState({ key, direction });
    setPage(1);
  }, []);

  const handleStatusChange = (newStatuses: CompanyStatus[]) => {
    setDevelopmentStatusFilter(newStatuses);
    setPage(1);
  };

  const debouncedFilterUpdate = useMemo(
    () => debounce((value: string) => {
      setSearchTerm(value);
      setPage(1);
    }, 350),
    [setSearchTerm]
  );

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setLocalSearchTerm(newValue);
    debouncedFilterUpdate(newValue);
  };

  const effectiveTier = currentUserTier;

  const pageActions = (
    <>
      <CurrencySelector />
      <Link to="/filter">
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="mr-1 h-4 w-4"/> Advanced Filters
        </Button>
      </Link>
      <Link to="/scatter-chart">
        <Button variant="ghost" size="sm" className="text-surface-white/70 hover:text-surface-white" title="View Scatter Chart">
          <LineChart className="h-5 w-5" />
        </Button>
      </Link>
      <Button variant="outline" size="sm" onClick={resetFilters} title="Reset all shared filters" className="text-xs">
        <RotateCcw className="mr-1 h-4 w-4"/> Reset Filters
      </Button>
    </>
  );

  return (
    <PageContainer
      title="Mining Companies Database"
      description="Explore and filter company data"
      actions={pageActions}
    >
      <div className="space-y-4">
        <div className="flex items-center flex-wrap gap-3 bg-navy-400/20 p-3 rounded-lg">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[250px] md:max-w-md">
            <input
              type="text"
              placeholder="Search name, ticker..."
              className="w-full pl-3 pr-8 py-2 bg-navy-500 border border-navy-300/20 rounded-md text-xs text-surface-white placeholder-surface-white/50 focus:outline-none focus:ring-2 focus:ring-accent-teal"
              value={localSearchTerm}
              onChange={handleSearchInputChange}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {FILTERABLE_STATUSES.map(status => (
              <label key={status} className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => {
                    handleStatusChange(
                      selectedStatuses.includes(status)
                        ? selectedStatuses.filter(s => s !== status)
                        : [...selectedStatuses, status]
                    );
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs sm:text-sm text-surface-white/90">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </label>
            ))}
            <Button
              variant="link"
              size="xs"
              onClick={() => handleStatusChange([])}
              className="text-xs h-auto p-0 text-blue-400 hover:text-blue-300 disabled:text-muted-foreground/50 disabled:no-underline ml-2"
              disabled={selectedStatuses.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="bg-navy-500 rounded-lg shadow-lg border border-navy-400/20 min-h-[400px] flex flex-col">
          {loading && !error && (
            <div className="flex-grow flex items-center justify-center p-6">
              <LoadingIndicator message="Loading companies..." />
            </div>
          )}

          {error && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-red-400">
              <p className="font-semibold mb-2">Error Loading Data</p>
              <p className="text-xs">{error}</p>
              <Button onClick={resetFilters} variant="destructive" size="sm" className="mt-4">
                Clear Filters & Retry
              </Button>
            </div>
          )}

          <div className={cn(
            "transition-opacity duration-300 ease-in-out",
            !loading && !error && companies.length > 0 ? "opacity-100" : "opacity-0 invisible h-0"
          )}>
            {!loading && !error && companies.length > 0 && (
              <CompanyDataTable
                companies={companies}
                onSort={handleSort}
                currentSort={sortState}
                currentTier={effectiveTier}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                selectedStatuses={selectedStatuses}
                onStatusChange={handleStatusChange}
              />
            )}
          </div>

          {!loading && !error && companies.length === 0 && (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-surface-white/70 py-16 px-6">
              <p className="font-semibold">No companies found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters.</p>
              <Button onClick={resetFilters} variant="secondary" size="sm" className="mt-4">
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}