import { PLANETS, getPlanet, getDistance } from '../data/planets';
import { GOODS } from '../data/goods';
import type { Planet } from '../types/game';

export interface LegTrade {
  fromPlanetId: string;
  toPlanetId: string;
  goodId: string;
  goodName: string;
  goodIcon: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  returnRate: number;
}

export interface TradeRoute {
  id: string;
  planets: string[];
  planetNames: string[];
  legs: LegTrade[];
  totalProfitPerUnit: number;
  compoundReturnRate: number;
  totalInvestment: number;
  totalDistance: number;
  profitPerDistance: number;
  routeLength: number;
}

interface BestTrade {
  goodId: string;
  goodName: string;
  goodIcon: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  returnRate: number;
}

const buildBestTradeMatrix = (
  planetPrices: Record<string, Record<string, number>>
): Map<string, BestTrade> => {
  const matrix = new Map<string, BestTrade>();

  for (const from of PLANETS) {
    for (const to of PLANETS) {
      if (from.id === to.id) continue;

      let best: BestTrade | null = null;
      let bestReturnRate = -Infinity;

      for (const good of GOODS) {
        const buyPrice = planetPrices[from.id]?.[good.id] ?? good.basePrice;
        const sellPrice = planetPrices[to.id]?.[good.id] ?? good.basePrice;

        if (buyPrice <= 0) continue;

        const profitPerUnit = sellPrice - buyPrice;
        const returnRate = sellPrice / buyPrice;

        if (returnRate > bestReturnRate) {
          bestReturnRate = returnRate;
          best = {
            goodId: good.id,
            goodName: good.name,
            goodIcon: good.icon,
            buyPrice,
            sellPrice,
            profitPerUnit,
            returnRate,
          };
        }
      }

      if (best && best.returnRate > 1) {
        matrix.set(`${from.id}->${to.id}`, best);
      }
    }
  }

  return matrix;
};

const generateCycles = (planetIds: string[]): string[][] => {
  const cycles: string[][] = [];
  const n = planetIds.length;

  const visited = new Set<string>();
  const path: string[] = [];

  const dfs = (start: string, depth: number, maxLen: number) => {
    if (depth > maxLen) return;

    if (depth >= 2) {
      cycles.push([...path]);
    }

    for (const pid of planetIds) {
      if (pid === start && depth >= 2) continue;
      if (visited.has(pid)) continue;

      visited.add(pid);
      path.push(pid);

      const nextMax = Math.min(maxLen, n);
      if (depth + 1 <= nextMax) {
        dfs(start, depth + 1, maxLen);
      }

      path.pop();
      visited.delete(pid);
    }
  };

  for (const start of planetIds) {
    visited.clear();
    path.length = 0;
    visited.add(start);
    path.push(start);
    dfs(start, 1, Math.min(n, 6));
  }

  return cycles;
};

const deduplicateCycles = (cycles: string[][]): string[][] => {
  const seen = new Set<string>();
  const unique: string[][] = [];

  for (const cycle of cycles) {
    const minIdx = cycle.indexOf(
      cycle.reduce((a, b) => (a < b ? a : b))
    );
    const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
    const reversed = [...rotated].reverse();
    const rotatedLast = rotated.pop()!;
    rotated.unshift(rotatedLast);
    const reversedKey = reversed.join('-');
    const key = rotated.join('-');

    if (!seen.has(key) && !seen.has(reversedKey)) {
      seen.add(key);
      unique.push(cycle);
    }
  }

  return unique;
};

export const findOptimalTradeRoutes = (
  planetPrices: Record<string, Record<string, number>>,
  topN: number = 10
): TradeRoute[] => {
  const matrix = buildBestTradeMatrix(planetPrices);
  const planetIds = PLANETS.map((p) => p.id);

  const rawCycles = generateCycles(planetIds);
  const cycles = deduplicateCycles(rawCycles);

  const routes: TradeRoute[] = [];

  for (const cycle of cycles) {
    const routeLen = cycle.length;
    const legs: LegTrade[] = [];
    let compoundReturn = 1;
    let totalInvestment = 0;
    let totalDistance = 0;
    let allLegsProfitable = true;

    for (let i = 0; i < routeLen; i++) {
      const fromId = cycle[i];
      const toId = cycle[(i + 1) % routeLen];
      const key = `${fromId}->${toId}`;
      const trade = matrix.get(key);

      const fromPlanet = getPlanet(fromId);
      const toPlanet = getPlanet(toId);
      const dist = fromPlanet && toPlanet ? getDistance(fromPlanet, toPlanet) : 0.5;

      if (!trade) {
        allLegsProfitable = false;
        break;
      }

      legs.push({
        fromPlanetId: fromId,
        toPlanetId: toId,
        goodId: trade.goodId,
        goodName: trade.goodName,
        goodIcon: trade.goodIcon,
        buyPrice: trade.buyPrice,
        sellPrice: trade.sellPrice,
        profitPerUnit: trade.profitPerUnit,
        returnRate: trade.returnRate,
      });

      compoundReturn *= trade.returnRate;
      totalInvestment += trade.buyPrice;
      totalDistance += dist;
    }

    if (!allLegsProfitable || legs.length < 2) continue;

    const totalProfitPerUnit = legs.reduce((s, l) => s + l.profitPerUnit, 0);
    const profitPerDistance = totalDistance > 0 ? totalProfitPerUnit / totalDistance : 0;

    const planetNames = cycle.map((pid) => {
      const p = getPlanet(pid);
      return p ? p.name : pid;
    });

    routes.push({
      id: cycle.join('→'),
      planets: cycle,
      planetNames,
      legs,
      totalProfitPerUnit,
      compoundReturnRate: compoundReturn - 1,
      totalInvestment,
      totalDistance,
      profitPerDistance,
      routeLength: routeLen,
    });
  }

  routes.sort((a, b) => b.compoundReturnRate - a.compoundReturnRate);

  return routes.slice(0, topN);
};

export const formatReturnRate = (rate: number): string => {
  return `${(rate * 100).toFixed(1)}%`;
};

export const getReturnRateColor = (rate: number): string => {
  if (rate > 0.3) return 'text-emerald-400';
  if (rate > 0.15) return 'text-emerald-300';
  if (rate > 0.05) return 'text-cyan-300';
  if (rate > 0) return 'text-slate-300';
  return 'text-rose-400';
};

export const getRouteRankLabel = (index: number): { label: string; color: string } => {
  if (index === 0) return { label: '最优', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' };
  if (index === 1) return { label: '次优', color: 'text-slate-300 border-slate-400/30 bg-slate-400/10' };
  if (index === 2) return { label: '第三', color: 'text-amber-600 border-amber-600/30 bg-amber-600/10' };
  return { label: `#${index + 1}`, color: 'text-slate-500 border-slate-600/30 bg-slate-600/10' };
};
