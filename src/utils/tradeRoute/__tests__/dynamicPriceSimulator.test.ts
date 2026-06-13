import { describe, it, expect, beforeEach } from 'vitest';
import { DynamicPriceSimulator, createSimulatorFromSnapshot } from '../dynamicPriceSimulator';
import { createInitialMarketState, regeneratePlanetPricesFromMarket } from '../../priceEngine';
import type { PriceMarketState } from '../../priceEngine';
import { PLANETS } from '../../../data/planets';
import { GOODS } from '../../../data/goods';

describe('DynamicPriceSimulator', () => {
  let initialMarket: PriceMarketState;
  let initialPrices: Record<string, Record<string, number>>;

  beforeEach(() => {
    const fixedSeed = 12345;
    let seedState = fixedSeed;
    const deterministicRandom = () => {
      seedState = (seedState * 9301 + 49297) % 233280;
      return seedState / 233280;
    };
    const originalRandom = Math.random;
    Math.random = deterministicRandom;

    initialMarket = createInitialMarketState(Date.now());
    initialPrices = regeneratePlanetPricesFromMarket(initialMarket);

    Math.random = originalRandom;
  });

  it('should initialize with a deep clone of market state', () => {
    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const snapshot = sim.getSnapshot();

    expect(snapshot.market).not.toBe(initialMarket);
    expect(snapshot.market.globalTrends).not.toBe(initialMarket.globalTrends);
    expect(snapshot.market.planetSupplyDemand).not.toBe(initialMarket.planetSupplyDemand);

    for (const pid of Object.keys(initialMarket.planetSupplyDemand)) {
      expect(snapshot.market.planetSupplyDemand[pid]).not.toBe(
        initialMarket.planetSupplyDemand[pid]
      );
    }
  });

  it('should produce identical results with same deterministic seed', () => {
    const sim1 = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const sim2 = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);

    const fromPlanet = PLANETS[0].id;
    const toPlanet = PLANETS[1].id;
    const goodId = GOODS[0].id;

    sim1.advanceTravel(fromPlanet, toPlanet);
    sim2.advanceTravel(fromPlanet, toPlanet);

    sim1.applyTrade(toPlanet, goodId, 10, true);
    sim2.applyTrade(toPlanet, goodId, 10, true);

    const snap1 = sim1.getSnapshot();
    const snap2 = sim2.getSnapshot();

    expect(snap1.planetPrices[toPlanet][goodId]).toBe(snap2.planetPrices[toPlanet][goodId]);
    expect(snap1.market.planetSupplyDemand[toPlanet][goodId]).toBe(
      snap2.market.planetSupplyDemand[toPlanet][goodId]
    );
  });

  it('should produce different results with different deterministic seeds', () => {
    const sim1 = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const sim2 = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 12345);

    const fromPlanet = PLANETS[0].id;
    const toPlanet = PLANETS[1].id;

    sim1.advanceTravel(fromPlanet, toPlanet);
    sim2.advanceTravel(fromPlanet, toPlanet);

    const snap1 = sim1.getSnapshot();
    const snap2 = sim2.getSnapshot();

    let pricesDiffer = false;
    for (const g of GOODS) {
      if (snap1.planetPrices[toPlanet][g.id] !== snap2.planetPrices[toPlanet][g.id]) {
        pricesDiffer = true;
        break;
      }
    }
    expect(pricesDiffer).toBe(true);
  });

  it('buying should increase supply demand (SD) and price', () => {
    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const planetId = PLANETS[0].id;
    const goodId = GOODS[0].id;

    const result = sim.applyTrade(planetId, goodId, 10, true);

    expect(result.sdAfter).toBeGreaterThan(result.sdBefore);
    expect(result.sdDelta).toBeGreaterThan(0);
    expect(result.priceDelta).toBeGreaterThanOrEqual(0);
  });

  it('selling should decrease supply demand (SD) and price', () => {
    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const planetId = PLANETS[0].id;
    const goodId = GOODS[0].id;

    const result = sim.applyTrade(planetId, goodId, 10, false);

    expect(result.sdAfter).toBeLessThan(result.sdBefore);
    expect(result.sdDelta).toBeLessThan(0);
    expect(result.priceDelta).toBeLessThanOrEqual(0);
  });

  it('buying more quantity should have proportionally larger price impact', () => {
    const sim1 = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const sim2 = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const planetId = PLANETS[0].id;
    const goodId = GOODS[0].id;

    const resultSmall = sim1.applyTrade(planetId, goodId, 1, true);
    const resultLarge = sim2.applyTrade(planetId, goodId, 100, true);

    expect(resultLarge.sdDelta).toBeGreaterThan(resultSmall.sdDelta);
    expect(Math.abs(resultLarge.priceDelta)).toBeGreaterThanOrEqual(
      Math.abs(resultSmall.priceDelta)
    );
  });

  it('travel should advance market ticks and change prices', () => {
    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const fromPlanet = PLANETS[0].id;
    const toPlanet = PLANETS[1].id;

    const beforePrices = { ...sim.getSnapshot().planetPrices[toPlanet] };
    const result = sim.advanceTravel(fromPlanet, toPlanet);

    expect(result.ticksElapsed).toBeGreaterThan(0);
    const afterPrices = sim.getSnapshot().planetPrices[toPlanet];

    let pricesChanged = false;
    for (const g of GOODS) {
      if (beforePrices[g.id] !== afterPrices[g.id]) {
        pricesChanged = true;
        break;
      }
    }
    expect(pricesChanged).toBe(true);
  });

  it('getPrice should return current price from snapshot', () => {
    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const planetId = PLANETS[0].id;
    const goodId = GOODS[0].id;

    const snapPrice = sim.getSnapshot().planetPrices[planetId][goodId];
    const getPrice = sim.getPrice(planetId, goodId);

    expect(getPrice).toBe(snapPrice);
  });

  it('trade impact should persist in subsequent snapshots', () => {
    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    const planetId = PLANETS[0].id;
    const goodId = GOODS[0].id;

    const beforeSD = sim.getSnapshot().market.planetSupplyDemand[planetId][goodId];
    sim.applyTrade(planetId, goodId, 50, true);
    const afterSD = sim.getSnapshot().market.planetSupplyDemand[planetId][goodId];

    expect(afterSD).toBeGreaterThan(beforeSD);
  });

  it('should not mutate original input market state', () => {
    const beforeSD = JSON.stringify(initialMarket.planetSupplyDemand);
    const beforeTrends = JSON.stringify(initialMarket.globalTrends);

    const sim = createSimulatorFromSnapshot(initialMarket, initialPrices, true, 42);
    sim.applyTrade(PLANETS[0].id, GOODS[0].id, 100, true);
    sim.advanceTravel(PLANETS[0].id, PLANETS[1].id);

    expect(JSON.stringify(initialMarket.planetSupplyDemand)).toBe(beforeSD);
    expect(JSON.stringify(initialMarket.globalTrends)).toBe(beforeTrends);
  });
});
