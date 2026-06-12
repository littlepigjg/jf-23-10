import { useCallback } from 'react';
import type { PriceMarketState } from '../utils/priceEngine';
import {
  createInitialMarketState,
  tickMarketState,
  regeneratePlanetPricesFromMarket,
  regeneratePartialPrices,
  getTicksForOffline,
  computePrice,
} from '../utils/priceEngine';
import { PLANETS } from '../data/planets';
import type { GameState } from '../types/game';

export interface UseMarketPricesResult {
  createMarket: (now?: number) => PriceMarketState;
  simulateOffline: (market: PriceMarketState, now?: number) => PriceMarketState;
  tick: (market: PriceMarketState, ticks: number, now?: number) => PriceMarketState;
  pricesFromMarket: (market: PriceMarketState) => Record<string, Record<string, number>>;
  partialPrices: (
    existing: Record<string, Record<string, number>>,
    planetIds: string[],
    market: PriceMarketState
  ) => Record<string, Record<string, number>>;
  singlePrice: (goodId: string, planetId: string, market: PriceMarketState) => number;
  enrichFromSave: (state: GameState) => { marketState: PriceMarketState; planetPrices: Record<string, Record<string, number>> };
}

export function useMarketPrices(): UseMarketPricesResult {
  const createMarket = useCallback((now: number = Date.now()) => createInitialMarketState(now), []);

  const simulateOffline = useCallback(
    (market: PriceMarketState, now: number = Date.now()): PriceMarketState => {
      const ticks = getTicksForOffline(market.lastTickAt, now);
      if (ticks <= 0) return { ...market, lastTickAt: now };
      return tickMarketState(market, ticks, now);
    },
    []
  );

  const tick = useCallback(
    (market: PriceMarketState, ticks: number, now: number = Date.now()) =>
      tickMarketState(market, ticks, now),
    []
  );

  const pricesFromMarket = useCallback(
    (market: PriceMarketState) => regeneratePlanetPricesFromMarket(market),
    []
  );

  const partialPrices = useCallback(
    (
      existing: Record<string, Record<string, number>>,
      planetIds: string[],
      market: PriceMarketState
    ) => regeneratePartialPrices(existing, planetIds, market),
    []
  );

  const singlePrice = useCallback(
    (goodId: string, planetId: string, market: PriceMarketState) =>
      computePrice(goodId, planetId, market),
    []
  );

  const enrichFromSave = useCallback(
    (state: GameState) => {
      const now = Date.now();
      let market = state.marketState ?? createInitialMarketState(now);

      if (market.lastTickAt > 0) {
        const ticks = getTicksForOffline(market.lastTickAt, now);
        if (ticks > 0) market = tickMarketState(market, ticks, now);
      } else {
        market = createInitialMarketState(now);
      }

      return {
        marketState: market,
        planetPrices: regeneratePlanetPricesFromMarket(market),
      };
    },
    []
  );

  return {
    createMarket,
    simulateOffline,
    tick,
    pricesFromMarket,
    partialPrices,
    singlePrice,
    enrichFromSave,
  };
}
