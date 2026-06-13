import { buildBestTradeMatrix } from './graphBuilder';
import { generateCycles } from './cycleFinder';
import { buildRouteFromCycle } from './profitCalculator';
import type { TradeRoute, SimulationParams } from './types';
import type { PriceMarketState } from '../priceEngine';
export type { TradeRoute, LegTrade, SimulatedLeg, BestTrade, SimulationParams } from './types';
export { formatReturnRate, getReturnRateColor, getRouteRankLabel } from './format';
export { DynamicPriceSimulator, createSimulatorFromSnapshot } from './dynamicPriceSimulator';
export type { DynamicPriceSnapshot, TradeOperationResult, TravelTickResult } from './dynamicPriceSimulator';

export interface OptimizeOptions {
  topN?: number;
  maxCycleLength?: number;
  sortBy?:
    | 'dynamicROI'
    | 'dynamicTotalProfit'
    | 'profitPerDistance'
    | 'staticROI'
    | 'theoreticalCompoundReturnRate';
  includeInfeasible?: boolean;
  deterministicSeed?: number;
}

export const findOptimalTradeRoutes = (
  planetPrices: Record<string, Record<string, number>>,
  params: SimulationParams,
  marketState?: PriceMarketState,
  options: OptimizeOptions = {}
): TradeRoute[] => {
  const {
    topN = 15,
    maxCycleLength = 6,
    sortBy = 'dynamicROI',
    includeInfeasible = false,
    deterministicSeed = 42,
  } = options;

  const matrix = buildBestTradeMatrix(planetPrices);
  const cycles = generateCycles(maxCycleLength);

  const routes: TradeRoute[] = [];

  for (const cycle of cycles) {
    const route = buildRouteFromCycle(
      cycle,
      matrix,
      params,
      marketState,
      planetPrices,
      deterministicSeed
    );
    if (!route) continue;
    if (!includeInfeasible && !route.isFeasible) continue;
    routes.push(route);
  }

  routes.sort((a, b) => {
    switch (sortBy) {
      case 'dynamicROI':
        return b.dynamicROI - a.dynamicROI;
      case 'dynamicTotalProfit':
        return b.dynamicTotalProfit - a.dynamicTotalProfit;
      case 'profitPerDistance':
        return b.profitPerDistance - a.profitPerDistance;
      case 'staticROI':
        return b.actualROI - a.actualROI;
      case 'theoreticalCompoundReturnRate':
        return b.theoreticalCompoundReturnRate - a.theoreticalCompoundReturnRate;
      default:
        return b.dynamicROI - a.dynamicROI;
    }
  });

  return routes.slice(0, topN);
};
