import { useCallback } from 'react';
import type { PriceMarketState } from '../utils/priceEngine';
import { MarketService } from '../services/marketService';
import type { GameState } from '../types/game';

export interface UseMarketServiceResult {
  createMarket: (now?: number) => {
    market: PriceMarketState;
    prices: Record<string, Record<string, number>>;
  };
  loadWithOffline: (
    savedMarket: PriceMarketState | undefined,
    now?: number
  ) => {
    market: PriceMarketState;
    prices: Record<string, Record<string, number>>;
    ticksApplied: number;
  };
  advanceOnTravel: (
    market: PriceMarketState,
    existingPrices: Record<string, Record<string, number>>,
    toPlanetId: string,
    distanceFactor: number,
    now?: number
  ) => { market: PriceMarketState; planetPrices: Record<string, Record<string, number>> };
  applyTradeImpact: (
    market: PriceMarketState,
    existingPrices: Record<string, Record<string, number>>,
    planetId: string,
    goodId: string,
    quantity: number,
    isBuy: boolean,
    now?: number
  ) => {
    market: PriceMarketState;
    planetPrices: Record<string, Record<string, number>>;
    priceDelta: number;
  };
  tick: (
    market: PriceMarketState,
    existingPrices: Record<string, Record<string, number>>,
    now?: number
  ) => { market: PriceMarketState; planetPrices: Record<string, Record<string, number>> };
  getGoodTrendInfo: (
    goodId: string,
    market: PriceMarketState
  ) => { value: number; label: string; color: string };
  getPlanetSDInfo: (
    goodId: string,
    planetId: string,
    market: PriceMarketState
  ) => { value: number; label: string; color: string };
  enrichFromSave: (state: GameState) => {
    marketState: PriceMarketState;
    planetPrices: Record<string, Record<string, number>>;
  };
  describeOfflineTicks: (ticks: number) => string;
}

export function useMarketService(): UseMarketServiceResult {
  const createMarket = useCallback(
    (now: number = Date.now()) => MarketService.createInitial(now),
    []
  );

  const loadWithOffline = useCallback(
    (savedMarket: PriceMarketState | undefined, now: number = Date.now()) =>
      MarketService.loadWithOfflineCatchup(savedMarket, now),
    []
  );

  const advanceOnTravel = useCallback(
    (
      market: PriceMarketState,
      existingPrices: Record<string, Record<string, number>>,
      toPlanetId: string,
      distanceFactor: number,
      now: number = Date.now()
    ) => MarketService.advanceOnTravel(market, existingPrices, toPlanetId, distanceFactor, now),
    []
  );

  const applyTradeImpact = useCallback(
    (
      market: PriceMarketState,
      existingPrices: Record<string, Record<string, number>>,
      planetId: string,
      goodId: string,
      quantity: number,
      isBuy: boolean,
      now: number = Date.now()
    ) => MarketService.applyTradeImpact(market, existingPrices, planetId, goodId, quantity, isBuy, now),
    []
  );

  const tick = useCallback(
    (
      market: PriceMarketState,
      existingPrices: Record<string, Record<string, number>>,
      now: number = Date.now()
    ) => MarketService.tickOne(market, existingPrices, now),
    []
  );

  const getGoodTrendInfo = useCallback(
    (goodId: string, market: PriceMarketState) =>
      MarketService.getGoodTrendInfo(goodId, market),
    []
  );

  const getPlanetSDInfo = useCallback(
    (goodId: string, planetId: string, market: PriceMarketState) =>
      MarketService.getPlanetSDInfo(goodId, planetId, market),
    []
  );

  const enrichFromSave = useCallback((state: GameState) => {
    const { market, prices } = MarketService.loadWithOfflineCatchup(state.marketState);
    return { marketState: market, planetPrices: prices };
  }, []);

  const describeOfflineTicks = useCallback(
    (ticks: number) => MarketService.describeOfflineTicks(ticks),
    []
  );

  return {
    createMarket,
    loadWithOffline,
    advanceOnTravel,
    applyTradeImpact,
    tick,
    getGoodTrendInfo,
    getPlanetSDInfo,
    enrichFromSave,
    describeOfflineTicks,
  };
}
