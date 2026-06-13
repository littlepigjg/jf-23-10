import type { PriceMarketState, PlanetSD } from '../priceEngine';
import { tickMarketState, computePrice } from '../priceEngine';
import { PLANETS, getPlanet, getDistance } from '../../data/planets';
import { GOODS } from '../../data/goods';

export interface DynamicPriceSnapshot {
  market: PriceMarketState;
  planetPrices: Record<string, Record<string, number>>;
}

export interface TradeOperationResult {
  snapshot: DynamicPriceSnapshot;
  priceBefore: number;
  priceAfter: number;
  priceDelta: number;
  sdBefore: number;
  sdAfter: number;
  sdDelta: number;
}

export interface TravelTickResult {
  snapshot: DynamicPriceSnapshot;
  ticksElapsed: number;
}

const deepCloneMarket = (market: PriceMarketState): PriceMarketState => ({
  ...market,
  globalTrends: Object.fromEntries(
    Object.entries(market.globalTrends).map(([k, v]) => [k, { ...v }])
  ),
  planetSupplyDemand: Object.fromEntries(
    Object.entries(market.planetSupplyDemand).map(([pid, sd]) => [
      pid,
      { ...sd },
    ])
  ),
});

const regenerateAllPrices = (
  market: PriceMarketState,
  jitter: number = 0
): Record<string, Record<string, number>> => {
  const out: Record<string, Record<string, number>> = {};
  for (const p of PLANETS) {
    out[p.id] = {};
    for (const g of GOODS) {
      out[p.id][g.id] = computePrice(g.id, p.id, market, jitter);
    }
  }
  return out;
};

const regeneratePlanetPrices = (
  existing: Record<string, Record<string, number>>,
  planetIds: string[],
  market: PriceMarketState,
  jitter: number = 0
): Record<string, Record<string, number>> => {
  const result = { ...existing };
  for (const pid of planetIds) {
    result[pid] = {};
    for (const g of GOODS) {
      result[pid][g.id] = computePrice(g.id, pid, market, jitter);
    }
  }
  return result;
};

export class DynamicPriceSimulator {
  private snapshot: DynamicPriceSnapshot;
  private deterministicSeed: number;
  private useDeterministic: boolean;

  constructor(
    initialMarket: PriceMarketState,
    initialPrices: Record<string, Record<string, number>>,
    deterministic: boolean = true,
    seed: number = 42
  ) {
    this.snapshot = {
      market: deepCloneMarket(initialMarket),
      planetPrices: JSON.parse(JSON.stringify(initialPrices)),
    };
    this.useDeterministic = deterministic;
    this.deterministicSeed = seed;
  }

  private nextRand(): number {
    if (!this.useDeterministic) return Math.random();
    this.deterministicSeed = (this.deterministicSeed * 9301 + 49297) % 233280;
    return this.deterministicSeed / 233280;
  }

  private withRandomness<T>(fn: () => T): T {
    if (!this.useDeterministic) return fn();

    const originalRandom = Math.random;
    Math.random = () => this.nextRand();
    try {
      return fn();
    } finally {
      Math.random = originalRandom;
    }
  }

  getSnapshot(): DynamicPriceSnapshot {
    return {
      market: deepCloneMarket(this.snapshot.market),
      planetPrices: JSON.parse(JSON.stringify(this.snapshot.planetPrices)),
    };
  }

  getPrice(planetId: string, goodId: string): number {
    return this.snapshot.planetPrices[planetId]?.[goodId] ?? 0;
  }

  advanceTravel(
    fromPlanetId: string,
    toPlanetId: string,
    now: number = Date.now()
  ): TravelTickResult {
    const fromPlanet = getPlanet(fromPlanetId);
    const toPlanet = getPlanet(toPlanetId);
    const distance =
      fromPlanet && toPlanet ? getDistance(fromPlanet, toPlanet) : 0.5;

    const ticks = Math.max(2, Math.round(distance * 15));

    const nextMarket = this.withRandomness(() =>
      tickMarketState(this.snapshot.market, ticks, now)
    );

    const nextPrices = this.withRandomness(() =>
      regeneratePlanetPrices(
        this.snapshot.planetPrices,
        [toPlanetId, fromPlanetId],
        nextMarket
      )
    );

    this.snapshot = { market: nextMarket, planetPrices: nextPrices };

    return {
      snapshot: this.getSnapshot(),
      ticksElapsed: ticks,
    };
  }

  applyTrade(
    planetId: string,
    goodId: string,
    quantity: number,
    isBuy: boolean,
    now: number = Date.now()
  ): TradeOperationResult {
    const good = GOODS.find((g) => g.id === goodId);
    const baseVolatility = good?.volatility ?? 0.3;
    const impactPerUnit = 0.025 * baseVolatility;
    const totalImpact = impactPerUnit * quantity * (isBuy ? 1 : -1);

    const sdMap = { ...this.snapshot.market.planetSupplyDemand };
    const planetSD: PlanetSD = { ...(sdMap[planetId] ?? {}) };

    const prevSD = planetSD[goodId] ?? 0;
    const nextSD = Math.max(-1, Math.min(1, prevSD + totalImpact));
    const sdDelta = nextSD - prevSD;
    planetSD[goodId] = nextSD;
    sdMap[planetId] = planetSD;

    const prevPrice = this.withRandomness(() =>
      computePrice(goodId, planetId, this.snapshot.market, 0)
    );

    const nextMarket: PriceMarketState = {
      ...this.snapshot.market,
      lastTickAt: now,
      planetSupplyDemand: sdMap,
    };

    const nextPrice = this.withRandomness(() =>
      computePrice(goodId, planetId, nextMarket, 0)
    );

    const nextPrices = regeneratePlanetPrices(
      this.snapshot.planetPrices,
      [planetId],
      nextMarket
    );

    this.snapshot = { market: nextMarket, planetPrices: nextPrices };

    return {
      snapshot: this.getSnapshot(),
      priceBefore: prevPrice,
      priceAfter: nextPrice,
      priceDelta: nextPrice - prevPrice,
      sdBefore: prevSD,
      sdAfter: nextSD,
      sdDelta,
    };
  }

  static cloneInitialState(
    market: PriceMarketState,
    prices: Record<string, Record<string, number>>
  ): { market: PriceMarketState; prices: Record<string, Record<string, number>> } {
    return {
      market: deepCloneMarket(market),
      prices: JSON.parse(JSON.stringify(prices)),
    };
  }
}

export const createSimulatorFromSnapshot = (
  market: PriceMarketState,
  prices: Record<string, Record<string, number>>,
  deterministic: boolean = true,
  seed?: number
): DynamicPriceSimulator => {
  return new DynamicPriceSimulator(market, prices, deterministic, seed);
};
