import React, { useMemo, useCallback } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ArrowUpDown, ArrowUp, ArrowDown, HelpCircle, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Company, SortState, ColumnTier, ColumnAccess, ColumnDef, ColumnGroup, CompanyStatus } from '../lib/types';
import { TierBadge } from './ui/tier-badge';
import { cn, getNestedValue, formatNumber, formatCurrency, formatPercent } from '../lib/utils';
import { StatusBadge } from './status-badge';
import { CompanyNameBadge } from './company-name-badge';
import { MineralsList } from './mineral-badge';
import { getAccessibleMetrics, getMetricByKey } from '../lib/metric-types';
import { Button } from './ui/button';

interface CompanyDataTableProps {
  companies: Company[];
  onSort: (key: string, direction: 'asc' | 'desc') => void;
  currentSort: SortState;
  currentTier: ColumnTier;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const columnGroups: ColumnGroup[] = [
  {
    title: 'Company Profile',
    description: 'Core company information and classification',
    className: 'bg-navy-400/10',
    columns: [
      { key: 'company_name', label: 'Company', sortable: true, sortKey: 'company_name', description: 'Company name and trading symbol', access: { tier: 'free', description: 'Basic company identification' }, width: '210px' },
      { key: 'status', label: 'Status', sortable: true, sortKey: 'status', description: 'Company operational status', preferredValues: 'Producer, Developer, Explorer, or Royalty', access: { tier: 'free', description: 'Company classification' }, width: '100px' },
      { key: 'share_price', label: 'Share Price', sortable: true, sortKey: 'share_price', format: 'currency', description: 'Latest stock price (or calculated fallback)', access: { tier: 'free', description: 'Stock price information' }, width: '90px' },
      { key: 'minerals_of_interest', label: 'Minerals', sortable: false, description: 'Primary minerals being mined or explored', access: { tier: 'free', description: 'Resource focus' }, width: '70px' },
      { key: 'percent_gold', label: 'Gold %', sortable: true, sortKey: 'percent_gold', format: 'percent', description: 'Percentage of revenue/resources from gold', preferredValues: 'Higher percentages indicate greater focus on gold', access: { tier: 'free', description: 'Resource focus metrics' }, width: '80px' },
      { key: 'percent_silver', label: 'Silver %', sortable: true, sortKey: 'percent_silver', format: 'percent', description: 'Percentage of revenue/resources from silver', preferredValues: 'Higher percentages indicate greater focus on silver', access: { tier: 'free', description: 'Resource focus metrics' }, width: '80px' }
    ]
  },
  {
    title: 'Financial Health',
    description: 'Key financial indicators and metrics',
    className: 'bg-navy-400/10',
    columns: [
      { key: 'financials.market_cap_value', label: 'Market Cap', sortable: true, sortKey: 'f_market_cap_value', format: 'compact', description: 'Total market value of outstanding shares', access: { tier: 'free', description: 'Market valuation' } },
      { key: 'financials.enterprise_value_value', label: 'Enterprise Value', sortable: true, sortKey: 'f_enterprise_value_value', format: 'compact', description: 'Total company value (Market Cap + Debt - Cash)', access: { tier: 'free', description: 'Advanced valuation metrics' } },
      { key: 'financials.cash_value', label: 'Cash', sortable: true, sortKey: 'f_cash_value', format: 'compact', description: 'Available cash and highly liquid assets', access: { tier: 'free', description: 'Basic financial metrics' } },
      { key: 'financials.debt_value', label: 'Total Debt', sortable: true, sortKey: 'f_debt_value', format: 'compact', description: 'Total debt obligations', access: { tier: 'medium', description: 'Debt metrics' } },
      { key: 'financials.net_financial_assets', label: 'Net Assets', sortable: true, sortKey: 'f_net_financial_assets', format: 'compact', description: 'Financial assets minus liabilities', access: { tier: 'free', description: 'Balance sheet strength' } },
      { key: 'financials.free_cash_flow', label: 'Free Cash Flow', sortable: true, sortKey: 'f_free_cash_flow', format: 'compact', description: 'Operating cash flow minus capital expenditures', access: { tier: 'premium', description: 'Cash flow analysis' } }
    ]
  },
  {
    title: 'Operating Metrics',
    description: 'Revenue and profitability metrics',
    className: 'bg-navy-400/10',
    columns: [
      { key: 'financials.revenue_value', label: 'Revenue', sortable: true, sortKey: 'f_revenue_value', format: 'compact', description: 'Total income from metal sales', access: { tier: 'medium', description: 'Revenue metrics' } },
      { key: 'financials.ebitda', label: 'EBITDA', sortable: true, sortKey: 'f_ebitda', format: 'compact', description: 'Earnings Before Interest, Taxes, Depreciation, and Amortization', access: { tier: 'premium', description: 'Profitability metrics' } },
      { key: 'financials.net_income_value', label: 'Net Income', sortable: true, sortKey: 'f_net_income_value', format: 'compact', description: 'Bottom-line profit after all expenses', access: { tier: 'medium', description: 'Profitability metrics' } }
    ]
  },
  {
    title: 'Valuation Ratios',
    description: 'Key valuation metrics and multiples',
    className: 'bg-navy-400/10',
    columns: [
      { key: 'valuation_metrics.ev_per_resource_oz_all', label: 'EV/Resource oz', sortable: true, sortKey: 'vm_ev_per_resource_oz_all', format: 'decimal', description: 'Enterprise Value per total resource ounce', access: { tier: 'premium', description: 'Advanced valuation metrics' } },
      { key: 'valuation_metrics.ev_per_reserve_oz_all', label: 'EV/Reserve oz', sortable: true, sortKey: 'vm_ev_per_reserve_oz_all', format: 'decimal', description: 'Enterprise Value per reserve ounce', access: { tier: 'premium', description: 'Advanced valuation metrics' } },
      { key: 'valuation_metrics.mkt_cap_per_resource_oz_all', label: 'MC/Resource oz', sortable: true, sortKey: 'vm_mkt_cap_per_resource_oz_all', format: 'decimal', description: 'Market Cap per total resource ounce', access: { tier: 'medium', description: 'Resource valuation metrics' } },
      { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', label: 'MC/Reserve oz', sortable: true, sortKey: 'vm_mkt_cap_per_reserve_oz_all', format: 'decimal', description: 'Market Cap per reserve ounce', access: { tier: 'medium', description: 'Resource valuation metrics' } }
    ]
  },
  {
    title: 'Resources & Grade',
    description: 'Mineral resource estimates and grades',
    className: 'bg-navy-400/10',
    columns: [
      { key: 'mineral_estimates.reserves_total_aueq_moz', label: 'Total Reserves', sortable: true, sortKey: 'me_reserves_total_aueq_moz', format: 'moz', description: 'Total Proven & Probable gold equivalent ounces', access: { tier: 'medium', description: 'Resource estimates' } },
      { key: 'mineral_estimates.measured_indicated_total_aueq_moz', label: 'Total M&I', sortable: true, sortKey: 'me_measured_indicated_total_aueq_moz', format: 'moz', description: 'Total Measured & Indicated gold equivalent ounces', access: { tier: 'medium', description: 'Resource estimates' } },
      { key: 'mineral_estimates.resources_total_aueq_moz', label: 'Total Resources', sortable: true, sortKey: 'me_resources_total_aueq_moz', format: 'moz', description: 'Total Measured, Indicated, and Inferred gold equivalent ounces', access: { tier: 'medium', description: 'Resource estimates' } }
    ]
  },
  {
    title: 'Production & Costs',
    description: 'Production metrics and cost structure',
    className: 'bg-navy-400/10',
    columns: [
      { key: 'production.current_production_total_aueq_koz', label: 'Current Prod.', sortable: true, sortKey: 'p_current_production_total_aueq_koz', format: 'koz', description: 'Current annual gold equivalent production', access: { tier: 'premium', description: 'Production metrics' } },
      { key: 'production.future_production_total_aueq_koz', label: 'Future Prod.', sortable: true, sortKey: 'p_future_production_total_aueq_koz', format: 'koz', description: 'Estimated future annual gold equivalent production', access: { tier: 'premium', description: 'Production forecasts' } },
      { key: 'costs.aisc_future', label: 'AISC (Future)', sortable: true, sortKey: 'c_aisc_future', format: 'currency', description: 'Projected All-In Sustaining Cost per ounce', access: { tier: 'premium', description: 'Cost metrics' } }
    ]
  }
];

const pageSizeOptions = [10, 25, 50, 100];

const Pagination = React.memo(function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="pagination-container">
      <div className="flex items-center gap-4">
        <div className="pagination-info text-xs">
          Showing <span className="font-medium text-surface-white">{startItem}</span> to{' '}
          <span className="font-medium text-surface-white">{endItem}</span> of{' '}
          <span className="font-medium text-surface-white">{totalCount}</span> companies
        </div>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="page-size-select text-xs"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </div>
      <div className="pagination-controls">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="page-button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-surface-white/70">
          Page {page} of {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="page-button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

const TableCell = React.memo(function TableCell({ 
  column, 
  value, 
  company 
}: { 
  column: ColumnDef;
  value: any;
  company: Company;
}) {
  const getColumnClass = () => {
    switch (column.key) {
      case 'company_name':
        return 'col-company';
      case 'status':
        return 'col-status';
      case 'minerals_of_interest':
        return 'col-minerals';
      case 'percent_gold':
      case 'percent_silver':
        return 'col-percent';
      case 'share_price':
        return 'col-price';
      case 'financials.market_cap_value':
        return 'col-market-cap';
      case 'financials.enterprise_value_value':
        return 'col-enterprise-value';
      case 'financials.cash_value':
        return 'col-cash';
      case 'financials.debt_value':
        return 'col-debt';
      case 'financials.net_financial_assets':
        return 'col-net-assets';
      case 'financials.revenue_value':
        return 'col-revenue';
      case 'financials.ebitda':
        return 'col-ebitda';
      case 'financials.free_cash_flow':
        return 'col-fcf';
      case 'mineral_estimates.reserves_total_aueq_moz':
      case 'mineral_estimates.measured_indicated_total_aueq_moz':
        return 'col-reserves';
      case 'mineral_estimates.resources_total_aueq_moz':
        return 'col-resources';
      case 'production.current_production_total_aueq_koz':
      case 'production.future_production_total_aueq_koz':
        return 'col-production';
      case 'costs.aisc_future':
      case 'costs.construction_costs':
        return 'col-costs';
      default:
        return column.format ? 'col-ratios' : '';
    }
  };

  if (column.key === 'company_name') {
    return (
      <CompanyNameBadge
        name={company.company_name}
        code={company.tsx_code}
        headquarters={company.headquarters}
        description={company.description}
      />
    );
  }
  if (column.key === 'status') {
    return <StatusBadge status={value as CompanyStatus} />;
  }
  if (column.key === 'minerals_of_interest') {
    return <MineralsList minerals={value} />;
  }

  return (
    <div className={cn(
      "truncate",
      getColumnClass(),
      column.format && "text-right"
    )}>
      {formatValue(value, column.format)}
    </div>
  );
});

function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined) return '-';
  try {
    switch (format) {
      case 'currency':
        return formatCurrency(value, { decimals: 2 });
      case 'percent':
        return formatPercent(value);
      case 'number':
        return formatNumber(value, { decimals: 0 });
      case 'decimal':
        return formatNumber(value, { decimals: 2 });
      case 'compact':
        return formatNumber(value, { compact: true });
      case 'moz':
        return formatNumber(value, { decimals: 2, suffix: ' Moz' });
      case 'koz':
        return formatNumber(value, { decimals: 0, suffix: ' koz' });
      default:
        return String(value);
    }
  } catch (e) {
    console.error("Error formatting value:", value, format, e);
    return String(value);
  }
}

const TableRow = React.memo(function TableRow({
  company,
  columnGroups,
  isColumnAccessible
}: {
  company: Company;
  columnGroups: ColumnGroup[];
  isColumnAccessible: (column: ColumnDef) => boolean;
}) {
  const getRowBackground = (status: CompanyStatus | null) => {
    if (!status) return '';
    switch (status.toLowerCase()) {
      case 'producer':
        return 'hover:bg-emerald-950/10';
      case 'developer':
        return 'hover:bg-blue-950/10';
      case 'explorer':
        return 'hover:bg-purple-950/10';
      case 'royalty':
        return 'hover:bg-amber-950/10';
      default:
        return 'hover:bg-navy-400/10';
    }
  };

  return (
    <tr className={cn("border-b border-navy-400/10", getRowBackground(company.status))}>
      {columnGroups.flatMap((group, groupIndex) =>
        group.columns.map((column, columnIndex) => {
          const isAccessible = isColumnAccessible(column);
          const value = getNestedValue(company, column.key);

          return (
            <td
              key={`${column.key}-${groupIndex}-${columnIndex}`}
              className={cn(
                "table-cell relative text-xs p-2 border-r border-navy-400/10",
                !isAccessible && "text-muted-foreground/30",
                column.format ? "text-right" : "text-left",
                column.width && `w-[${column.width}]`
              )}
            >
              {!isAccessible ? (
                <div className="flex justify-center items-center h-full">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="tooltip-content">
                        Requires <span className="font-semibold capitalize">{column.access?.tier}</span> Tier
                        <Tooltip.Arrow className="fill-navy-400" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
              ) : (
                <TableCell column={column} value={value} company={company} />
              )}
            </td>
          );
        })
      )}
    </tr>
  );
});

export function CompanyDataTable({
  companies,
  onSort,
  currentSort,
  currentTier,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange
}: CompanyDataTableProps) {
  const handleSort = useCallback((key: string) => {
    const direction = currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';
    onSort(key, direction);
  }, [currentSort, onSort]);

  const getSortIcon = useCallback((key: string) => {
    if (currentSort.key !== key) {
      return <ArrowUpDown className="h-3 w-3 text-surface-white/40" />;
    }
    return currentSort.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-surface-white" />
    ) : (
      <ArrowDown className="h-3 w-3 text-surface-white" />
    );
  }, [currentSort.key, currentSort.direction]);

  const isColumnAccessible = useCallback((column: ColumnDef): boolean => {
    if (!column.access) return true;
    const tierLevels = { free: 0, medium: 1, premium: 2 };
    const userLevel = tierLevels[currentTier ?? 'free'];
    const requiredLevel = tierLevels[column.access.tier];
    if (userLevel === undefined || requiredLevel === undefined) {
      console.warn("Unknown tier encountered in isColumnAccessible:", currentTier, column.access.tier);
      return false;
    }
    return userLevel >= requiredLevel;
  }, [currentTier]);

  const tableHeader = useMemo(() => (
    <thead className="table-header sticky top-0 z-10">
      <tr>
        {columnGroups.map((group, groupIndex) => (
          <th
            key={`${group.title}-${groupIndex}`}
            colSpan={group.columns.length}
            className={cn(
              "table-cell text-center font-bold group-header text-xs whitespace-nowrap p-2 border-b border-navy-300/20",
              group.className
            )}
          >
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="flex items-center justify-center gap-1 cursor-help">
                  {group.title} <HelpCircle className="h-3 w-3 text-surface-white/60" />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="tooltip-content">
                  {group.description}
                  <Tooltip.Arrow className="fill-navy-400" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </th>
        ))}
      </tr>
      <tr>
        {columnGroups.flatMap((group, groupIndex) =>
          group.columns.map((column, columnIndex) => {
            const isAccessible = isColumnAccessible(column);
            return (
              <th
                key={`${column.key}-${groupIndex}-${columnIndex}`}
                className={cn(
                  "table-cell font-semibold relative group text-xs whitespace-nowrap p-2 border-b border-x border-navy-300/20",
                  column.sortable && isAccessible && "cursor-pointer hover:bg-navy-400/20",
                  group.className,
                  column.width && `w-[${column.width}]`
                )}
                onClick={() => isAccessible && column.sortable && column.sortKey && handleSort(column.sortKey)}
                title={isAccessible && column.sortable ? `Sort by ${column.label}` : (isAccessible ? column.label : `Requires ${column.access?.tier} tier`)}
              >
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div className={cn("flex items-center gap-1", column.format ? "justify-end" : "justify-start")}>
                      {!isAccessible && (<Lock className="h-3 w-3 text-surface-white/40 mr-1" />)}
                      <span className={cn(!isAccessible && "opacity-50")}>{column.label}</span>
                      {column.description && (<HelpCircle className="h-3 w-3 text-surface-white/40" />)}
                      {column.sortable && isAccessible && (<span className="ml-1">{getSortIcon(column.sortKey || column.key)}</span>)}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="tooltip-content">
                      {column.description}
                      {column.preferredValues && (
                        <div className="mt-1 text-xs text-surface-white/70">
                          {column.preferredValues}
                        </div>
                      )}
                      <Tooltip.Arrow className="fill-navy-400" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </th>
            );
          })
        )}
      </tr>
    </thead>
  ), [columnGroups, isColumnAccessible, handleSort, getSortIcon]);

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="space-y-4">
        <div className="table-container overflow-x-auto">
          <table className="table-bg w-full border-collapse">
            {tableHeader}
            <tbody>
              {companies.map((company) => (
                <TableRow
                  key={company.company_id}
                  company={company}
                  columnGroups={columnGroups}
                  isColumnAccessible={isColumnAccessible}
                />
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </Tooltip.Provider>
  );
}