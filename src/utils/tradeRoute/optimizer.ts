import { buildBestTradeMatrix } from './graphBuilder';
import { generateCycles } from './cycleFinder';
import { buildRouteFromCycle } from './profitCalculator';
import type { TradeRoute, SimulationParams } from './types';
export type { TradeRoute, LegTrade, SimulatedLeg, BestTrade, SimulationParams } from './types';
export { formatReturnRate, getReturnRateColor, getRouteRankLabel } from './format';

export interface OptimizeOptions {
  topN?: number;
  maxCycleLength?: number;
  sortBy?: 'actualROI' | 'actualTotalProfit' | 'profitPerDistance' | 'theoreticalCompoundReturnRate';
  includeInfeasible?: boolean;
}

export const findOptimalTradeRoutes = (
  planetPrices: Record<string, Record<string, number>>,
  params: SimulationParams,
  options: OptimizeOptions = {}
): TradeRoute[] => {
  const {
    topN = 15,
    maxCycleLength = 6,
    sortBy = 'actualROI',
    includeInfeasible = false,
  } = options;

  const matrix = buildBestTradeMatrix(planetPrices);
  const cycles = generateCycles(maxCycleLength);

  const routes: TradeRoute[] = [];

  for (const cycle of cycles) {
    const route = buildRouteFromCycle(cycle, matrix, params);
    if (!route) continue;
    if (!includeInfeasible && !route.isFeasible) continue;
    routes.push(route);
  }

  routes.sort((a, b) => {
    switch (sortBy) {
      case 'actualROI':
        return b.actualROI - a.actualROI;
      case 'actualTotalProfit':
        return b.actualTotalProfit - a.actualTotalProfit;
      case 'profitPerDistance':
        return b.profitPerDistance - a.profitPerDistance;
      case 'theoreticalCompoundReturnRate':
        return b.theoreticalCompoundReturnRate - a.theoreticalCompoundReturnRate;
      default:
        return b.actualROI - a.actualROI;
    }
  });

  return routes.slice(0, topN);
};
