import type { PriceMarketState, PlanetSD } from '../utils/priceEngine';
import {
  createInitialMarketState,
  tickMarketState,
  regeneratePlanetPricesFromMarket,
  regeneratePartialPrices,
  getTicksForOffline,
  computePrice,
} from '../utils/priceEngine';
import { GOODS } from '../data/goods';

export interface TravelTickResult {
  market: PriceMarketState;
  planetPrices: Record<string, Record<string, number>>;
}

export interface TradeImpactResult {
  market: PriceMarketState;
  planetPrices: Record<string, Record<string, number>>;
  priceDelta: number;
}

export class MarketService {
  static createInitial(now: number = Date.now()): {
    market: PriceMarketState;
    prices: Record<string, Record<string, number>>;
  } {
    const market = createInitialMarketState(now);
    const prices = regeneratePlanetPricesFromMarket(market);
    return { market, prices };
  }

  static loadWithOfflineCatchup(
    savedMarket: PriceMarketState | undefined,
    now: number = Date.now()
  ): {
    market: PriceMarketState;
    prices: Record<string, Record<string, number>>;
    ticksApplied: number;
  } {
    let market = savedMarket ?? createInitialMarketState(now);

    if (!market.version || !market.lastTickAt || market.lastTickAt <= 0) {
      market = createInitialMarketState(now);
    }

    const ticks = getTicksForOffline(market.lastTickAt, now);
    let ticksApplied = 0;
    if (ticks > 0) {
      market = tickMarketState(market, ticks, now);
      ticksApplied = ticks;
    } else {
      market = { ...market, lastTickAt: now };
    }

    const prices = regeneratePlanetPricesFromMarket(market);
    return { market, prices, ticksApplied };
  }

  static advanceOnTravel(
    market: PriceMarketState,
    existingPrices: Record<string, Record<string, number>>,
    toPlanetId: string,
    distanceFactor: number,
    now: number = Date.now()
  ): TravelTickResult {
    const ticks = Math.max(2, Math.round(distanceFactor * 15));
    const nextMarket = tickMarketState(market, ticks, now);
    const prices = regeneratePartialPrices(existingPrices, [toPlanetId], nextMarket);
    return { market: nextMarket, planetPrices: prices };
  }

  static applyTradeImpact(
    market: PriceMarketState,
    existingPrices: Record<string, Record<string, number>>,
    planetId: string,
    goodId: string,
    quantity: number,
    isBuy: boolean,
    now: number = Date.now()
  ): TradeImpactResult {
    const sdMap = { ...market.planetSupplyDemand };
    const planetSD: PlanetSD = { ...(sdMap[planetId] ?? {}) };

    const good = GOODS.find((g) => g.id === goodId);
    const baseVolatility = good?.volatility ?? 0.3;
    const impactPerUnit = 0.025 * baseVolatility;
    const totalImpact = impactPerUnit * quantity * (isBuy ? 1 : -1);

    const prevSD = planetSD[goodId] ?? 0;
    const nextSD = Math.max(-1, Math.min(1, prevSD + totalImpact));
    planetSD[goodId] = nextSD;
    sdMap[planetId] = planetSD;

    const nextMarket: PriceMarketState = {
      ...market,
      lastTickAt: now,
      planetSupplyDemand: sdMap,
    };

    const prevPrice = computePrice(goodId, planetId, market, 0);
    const nextPrice = computePrice(goodId, planetId, nextMarket, 0);

    const prices = regeneratePartialPrices(existingPrices, [planetId], nextMarket);

    return {
      market: nextMarket,
      planetPrices: prices,
      priceDelta: nextPrice - prevPrice,
    };
  }

  static tickOne(
    market: PriceMarketState,
    existingPrices: Record<string, Record<string, number>>,
    now: number = Date.now()
  ): TravelTickResult {
    const nextMarket = tickMarketState(market, 1, now);
    const prices = regeneratePlanetPricesFromMarket(nextMarket);
    return { market: nextMarket, planetPrices: prices };
  }

  static getGoodTrendInfo(goodId: string, market: PriceMarketState): {
    value: number;
    label: string;
    color: string;
  } {
    const trend = market.globalTrends[goodId]?.value ?? 0;
    if (trend > 0.35) return { value: trend, label: '大涨 📈', color: 'text-rose-400' };
    if (trend > 0.12) return { value: trend, label: '上涨 ↗', color: 'text-rose-300' };
    if (trend > -0.12) return { value: trend, label: '平稳 →', color: 'text-slate-400' };
    if (trend > -0.35) return { value: trend, label: '下跌 ↘', color: 'text-emerald-300' };
    return { value: trend, label: '暴跌 📉', color: 'text-emerald-400' };
  }

  static getPlanetSDInfo(
    goodId: string,
    planetId: string,
    market: PriceMarketState
  ): { value: number; label: string; color: string } {
    const sd = market.planetSupplyDemand[planetId]?.[goodId] ?? 0;
    if (sd > 0.35) return { value: sd, label: '缺货 🔥', color: 'text-rose-400' };
    if (sd > 0.1) return { value: sd, label: '偏紧', color: 'text-amber-300' };
    if (sd > -0.1) return { value: sd, label: '正常', color: 'text-slate-400' };
    if (sd > -0.35) return { value: sd, label: '充足', color: 'text-cyan-300' };
    return { value: sd, label: '过剩 💧', color: 'text-emerald-400' };
  }

  static describeOfflineTicks(ticks: number): string {
    if (ticks <= 0) return '市场行情没有变化';
    if (ticks < 10) return `市场经历了 ${ticks} 个周期的波动`;
    if (ticks < 60) return `离线期间市场走了 ${ticks} 个周期，行情变化不小`;
    const hours = Math.round(ticks / 60);
    return `离线 ${hours} 小时，市场已经天翻地覆`;
  }
}
