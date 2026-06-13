import { describe, it, expect, beforeEach } from 'vitest';
import { simulateRouteStatic, simulateRouteDynamic, buildRouteFromCycle } from '../profitCalculator';
import { buildBestTradeMatrix } from '../graphBuilder';
import { generateCycles } from '../cycleFinder';
import { findOptimalTradeRoutes } from '../optimizer';
import { createInitialMarketState, regeneratePlanetPricesFromMarket } from '../../priceEngine';
import type { PriceMarketState } from '../../priceEngine';
import { PLANETS } from '../../../data/planets';
import { GOODS } from '../../../data/goods';

const setupDeterministicMarket = (seed: number = 12345) => {
  let seedState = seed;
  const deterministicRandom = () => {
    seedState = (seedState * 9301 + 49297) % 233280;
    return seedState / 233280;
  };
  const originalRandom = Math.random;
  Math.random = deterministicRandom;

  const market = createInitialMarketState(Date.now());
  const prices = regeneratePlanetPricesFromMarket(market);

  Math.random = originalRandom;
  return { market, prices };
};

describe('profitCalculator - Static Simulation', () => {
  let initialMarket: PriceMarketState;
  let initialPrices: Record<string, Record<string, number>>;
  let tradeMatrix: Map<string, any>;

  beforeEach(() => {
    const setup = setupDeterministicMarket(42);
    initialMarket = setup.market;
    initialPrices = setup.prices;
    tradeMatrix = buildBestTradeMatrix(initialPrices);
  });

  it('should calculate positive profit for a valid 2-planet cycle', () => {
    const cycles = generateCycles(2).filter((c) => c.length === 2);
    expect(cycles.length).toBeGreaterThan(0);

    let anyProfitable = false;
    for (const cycle of cycles) {
      const result = simulateRouteStatic(cycle, tradeMatrix, {
        startingCash: 100000,
        cargoCapacity: 50,
      });
      if (result.isFeasible && result.actualTotalProfit > 0) {
        anyProfitable = true;
        break;
      }
    }
    expect(anyProfitable).toBe(true);
  });

  it('should mark route as infeasible when starting cash is too low', () => {
    const cycles = generateCycles(2).filter((c) => c.length === 2);

    let anyInfeasible = false;
    for (const cycle of cycles) {
      const result = simulateRouteStatic(cycle, tradeMatrix, {
        startingCash: 1,
        cargoCapacity: 50,
      });
      if (!result.isFeasible) {
        anyInfeasible = true;
        expect(result.infeasibleReason).toBeDefined();
        break;
      }
    }
    expect(anyInfeasible).toBe(true);
  });

  it('should respect cargo capacity limit', () => {
    const cycles = generateCycles(2).filter((c) => c.length === 2);

    for (const cycle of cycles) {
      const result = simulateRouteStatic(cycle, tradeMatrix, {
        startingCash: 9999999,
        cargoCapacity: 25,
      });
      if (!result.isFeasible) continue;
      for (const leg of result.simulatedLegs) {
        expect(leg.quantityBought).toBeLessThanOrEqual(25);
        expect(leg.cargoUsed).toBeLessThanOrEqual(25);
      }
    }
  });

  it('should track cash flow correctly', () => {
    const cycles = generateCycles(2).filter((c) => c.length === 2);
    const startCash = 100000;

    for (const cycle of cycles) {
      const result = simulateRouteStatic(cycle, tradeMatrix, {
        startingCash: startCash,
        cargoCapacity: 50,
      });
      if (!result.isFeasible) continue;

      const finalCash = result.simulatedLegs[result.simulatedLegs.length - 1].cashRemaining;
      const expectedProfit = finalCash - startCash;
      expect(Math.round(result.actualTotalProfit)).toBe(Math.round(expectedProfit));
    }
  });
});

describe('profitCalculator - Dynamic Simulation', () => {
  let initialMarket: PriceMarketState;
  let initialPrices: Record<string, Record<string, number>>;
  let tradeMatrix: Map<string, any>;

  beforeEach(() => {
    const setup = setupDeterministicMarket(42);
    initialMarket = setup.market;
    initialPrices = setup.prices;
    tradeMatrix = buildBestTradeMatrix(initialPrices);
  });

  it('should produce deterministic results with same seed', () => {
    const cycles = generateCycles(3).filter((c) => c.length === 3);

    for (const cycle of cycles.slice(0, 5)) {
      const result1 = simulateRouteDynamic(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );
      const result2 = simulateRouteDynamic(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );

      expect(result1.isFeasible).toBe(result2.isFeasible);
      expect(result1.actualTotalProfit).toBeCloseTo(result2.actualTotalProfit, 5);
      expect(result1.simulatedLegs.length).toBe(result2.simulatedLegs.length);
    }
  });

  it('dynamic ROI should be different from static ROI', () => {
    const cycles = generateCycles(4).filter((c) => c.length === 4);

    let anyDifferent = false;
    for (const cycle of cycles.slice(0, 20)) {
      const staticResult = simulateRouteStatic(cycle, tradeMatrix, {
        startingCash: 100000,
        cargoCapacity: 50,
      });
      const dynamicResult = simulateRouteDynamic(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );

      if (
        staticResult.isFeasible &&
        dynamicResult.isFeasible &&
        Math.abs(staticResult.actualROI - dynamicResult.actualROI) > 0.001
      ) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);
  });

  it('should track travel ticks for each leg', () => {
    const cycles = generateCycles(3).filter((c) => c.length === 3);

    for (const cycle of cycles.slice(0, 5)) {
      const result = simulateRouteDynamic(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );
      if (!result.isFeasible) continue;

      expect(result.totalTravelTicks).toBeGreaterThan(0);
      for (const leg of result.simulatedLegs) {
        expect(leg.travelTicks).toBeGreaterThan(0);
      }
    }
  });

  it('should track supply demand changes before and after trades', () => {
    const cycles = generateCycles(2).filter((c) => c.length === 2);

    let found = false;
    for (const cycle of cycles) {
      const result = simulateRouteDynamic(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );
      if (!result.isFeasible) continue;

      for (const leg of result.simulatedLegs) {
        expect(typeof leg.sdBeforeBuy).toBe('number');
        expect(typeof leg.sdAfterBuy).toBe('number');
        expect(typeof leg.sdBeforeSell).toBe('number');
        expect(typeof leg.sdAfterSell).toBe('number');
        expect(leg.sdAfterBuy).toBeGreaterThan(leg.sdBeforeBuy);
        expect(leg.sdAfterSell).toBeLessThan(leg.sdBeforeSell);
      }
      found = true;
      break;
    }
    expect(found).toBe(true);
  });

  it('should track price impact of buy and sell', () => {
    const cycles = generateCycles(2).filter((c) => c.length === 2);

    let found = false;
    for (const cycle of cycles) {
      const result = simulateRouteDynamic(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );
      if (!result.isFeasible) continue;

      for (const leg of result.simulatedLegs) {
        expect(typeof leg.priceImpactOnBuy).toBe('number');
        expect(typeof leg.priceImpactOnSell).toBe('number');
        expect(leg.priceImpactOnBuy).toBeGreaterThanOrEqual(0);
        expect(leg.priceImpactOnSell).toBeLessThanOrEqual(0);
      }
      found = true;
      break;
    }
    expect(found).toBe(true);
  });
});

describe('buildRouteFromCycle', () => {
  let initialMarket: PriceMarketState;
  let initialPrices: Record<string, Record<string, number>>;
  let tradeMatrix: Map<string, any>;

  beforeEach(() => {
    const setup = setupDeterministicMarket(42);
    initialMarket = setup.market;
    initialPrices = setup.prices;
    tradeMatrix = buildBestTradeMatrix(initialPrices);
  });

  it('should build route with both static and dynamic metrics', () => {
    const cycles = generateCycles(3).filter((c) => c.length === 3);

    let found = false;
    for (const cycle of cycles) {
      const route = buildRouteFromCycle(
        cycle,
        tradeMatrix,
        { startingCash: 100000, cargoCapacity: 50 },
        initialMarket,
        initialPrices,
        42
      );
      if (!route || !route.isFeasible) continue;

      expect(typeof route.theoreticalCompoundReturnRate).toBe('number');
      expect(typeof route.actualROI).toBe('number');
      expect(typeof route.dynamicROI).toBe('number');
      expect(typeof route.dynamicTotalProfit).toBe('number');
      expect(typeof route.totalTravelTicks).toBe('number');
      expect(route.totalTravelTicks).toBeGreaterThan(0);

      expect(route.simulatedLegs.length).toBe(cycle.length);
      for (const leg of route.simulatedLegs) {
        expect(typeof leg.travelTicks).toBe('number');
        expect(typeof leg.priceImpactOnBuy).toBe('number');
      }
      found = true;
      break;
    }
    expect(found).toBe(true);
  });

  it('should return null for invalid cycle', () => {
    const route = buildRouteFromCycle(
      ['nonexistent1', 'nonexistent2'],
      tradeMatrix,
      { startingCash: 100000, cargoCapacity: 50 }
    );
    expect(route).toBeNull();
  });

  it('should return null for cycle with fewer than 2 legs', () => {
    const route = buildRouteFromCycle(
      [PLANETS[0].id],
      tradeMatrix,
      { startingCash: 100000, cargoCapacity: 50 }
    );
    expect(route).toBeNull();
  });
});

describe('findOptimalTradeRoutes', () => {
  let initialMarket: PriceMarketState;
  let initialPrices: Record<string, Record<string, number>>;

  beforeEach(() => {
    const setup = setupDeterministicMarket(42);
    initialMarket = setup.market;
    initialPrices = setup.prices;
  });

  it('should return top N routes sorted by dynamic ROI by default', () => {
    const routes = findOptimalTradeRoutes(
      initialPrices,
      { startingCash: 100000, cargoCapacity: 50 },
      initialMarket,
      { topN: 10 }
    );

    expect(routes.length).toBeLessThanOrEqual(10);
    expect(routes.length).toBeGreaterThan(0);

    for (let i = 1; i < routes.length; i++) {
      expect(routes[i - 1].dynamicROI).toBeGreaterThanOrEqual(routes[i].dynamicROI);
    }
  });

  it('should support sorting by dynamicTotalProfit', () => {
    const routes = findOptimalTradeRoutes(
      initialPrices,
      { startingCash: 100000, cargoCapacity: 50 },
      initialMarket,
      { topN: 10, sortBy: 'dynamicTotalProfit' }
    );

    expect(routes.length).toBeGreaterThan(0);
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i - 1].dynamicTotalProfit).toBeGreaterThanOrEqual(
        routes[i].dynamicTotalProfit
      );
    }
  });

  it('should exclude infeasible routes by default', () => {
    const routes = findOptimalTradeRoutes(
      initialPrices,
      { startingCash: 100000, cargoCapacity: 50 },
      initialMarket,
      { topN: 100 }
    );

    for (const r of routes) {
      expect(r.isFeasible).toBe(true);
    }
  });

  it('should include infeasible routes when requested', () => {
    const routes = findOptimalTradeRoutes(
      initialPrices,
      { startingCash: 10, cargoCapacity: 1 },
      initialMarket,
      { topN: 100, includeInfeasible: true }
    );

    expect(routes.some((r) => !r.isFeasible)).toBe(true);
  });

  it('dynamic ROI should generally be lower than theoretical compound return', () => {
    const routes = findOptimalTradeRoutes(
      initialPrices,
      { startingCash: 100000, cargoCapacity: 50 },
      initialMarket,
      { topN: 20 }
    );

    const routesWithSignificantDiff = routes.filter(
      (r) => r.theoreticalCompoundReturnRate - r.dynamicROI > 0.01
    );
    expect(routesWithSignificantDiff.length).toBeGreaterThan(0);
  });
});
