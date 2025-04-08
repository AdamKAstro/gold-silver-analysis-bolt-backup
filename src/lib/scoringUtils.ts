//src/lib/scoringUtils.ts
import type { Company, ColumnTier } from './types';
import type { MetricConfig } from './metric-types';
import { getNestedValue, isValidNumber } from './utils';

// Define the structure for the result, including breakdown for transparency
export interface CompanyScore {
    companyId: number;
    companyName: string;
    score: number | null;
    breakdown: Record<string, ScoreComponent>;
}

interface ScoreComponent {
    metricLabel: string;
    rawValue: number | null;
    normalizedValue?: number;
    weight: number;
    weightedScore: number;
    isIncluded: boolean;
    isAccessible: boolean;
    error?: string;
}

interface MetricFullRanges { [db_column: string]: [number, number]; }

/**
 * Calculates scores for companies based on user weights and metric configurations.
 */
export function calculateScores(
    companies: Company[],
    weights: Record<string, number>,
    fullRanges: MetricFullRanges,
    metricConfigs: Record<string, MetricConfig>,
    currentUserTier: ColumnTier
): CompanyScore[] {
    const results: CompanyScore[] = [];
    const tierLevels: Record<ColumnTier, number> = { free: 0, medium: 1, premium: 2 };
    const userTierLevel = tierLevels[currentUserTier] ?? -1;

    for (const company of companies) {
        let totalWeightedScore = 0;
        let totalEffectiveWeight = 0;
        const scoreBreakdown: Record<string, ScoreComponent> = {};

        for (const [db_column, weight] of Object.entries(weights)) {
            if (weight <= 0) continue;

            const metricConfig = metricConfigs[db_column];

            const component: ScoreComponent = {
                metricLabel: metricConfig?.label || db_column,
                rawValue: null,
                weight: weight,
                weightedScore: 0,
                isIncluded: false,
                isAccessible: false,
            };

            if (!metricConfig) {
                component.error = "Metric config not found";
                scoreBreakdown[db_column] = component;
                continue;
            }

            const requiredTierLevel = tierLevels[metricConfig.tier] ?? 99;
            component.isAccessible = userTierLevel >= requiredTierLevel;
            if (!component.isAccessible) {
                component.error = `Requires ${metricConfig.tier} tier`;
                scoreBreakdown[db_column] = component;
                continue;
            }

            const rawValue = getNestedValue(company, metricConfig.nested_path);
            component.rawValue = isValidNumber(rawValue) ? rawValue : null;

            const range = fullRanges[db_column];

            if (component.rawValue === null) {
                component.error = "Null value";
                scoreBreakdown[db_column] = component;
                continue;
            }
            if (!range || !isValidNumber(range[0]) || !isValidNumber(range[1])) {
                component.error = "Invalid/Missing range";
                scoreBreakdown[db_column] = component;
                continue;
            }

            const [min, max] = range;
            const rangeWidth = max - min;

            let normalized = 0;
            if (rangeWidth > 1e-9) {
                normalized = (component.rawValue - min) / rangeWidth;
            } else if (component.rawValue >= min) {
                normalized = 0.5;
            }

            normalized = Math.max(0, Math.min(1, normalized));

            if (!metricConfig.higherIsBetter) {
                normalized = 1 - normalized;
            }
            component.normalizedValue = normalized;

            component.weightedScore = normalized * weight;
            totalWeightedScore += component.weightedScore;
            totalEffectiveWeight += weight;
            component.isIncluded = true;

            scoreBreakdown[db_column] = component;
        }

        const finalScore = totalEffectiveWeight > 0
            ? (totalWeightedScore / totalEffectiveWeight) * 1000
            : null;

        results.push({
            companyId: company.company_id,
            companyName: company.company_name,
            score: finalScore !== null ? Math.round(finalScore) : null,
            breakdown: scoreBreakdown
        });
    }

    results.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    return results;
}