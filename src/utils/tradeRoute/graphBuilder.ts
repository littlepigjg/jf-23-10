import { PLANETS } from '../../data/planets';
import { GOODS } from '../../data/goods';
import type { BestTrade } from './types';

export const buildBestTradeMatrix = (
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
