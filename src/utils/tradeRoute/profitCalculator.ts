import { getPlanet, getDistance } from '../../data/planets';
import type { BestTrade, TradeRoute, SimulatedLeg, LegTrade, SimulationParams } from './types';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export interface SimulationResult {
  simulatedLegs: SimulatedLeg[];
  actualTotalProfit: number;
  actualTotalInvestment: number;
  actualReturnRate: number;
  actualROI: number;
  isFeasible: boolean;
  infeasibleReason?: string;
}

export const simulateRoute = (
  cycle: string[],
  tradeMatrix: Map<string, BestTrade>,
  params: SimulationParams
): SimulationResult => {
  const { startingCash, cargoCapacity } = params;
  const routeLen = cycle.length;

  const simulatedLegs: SimulatedLeg[] = [];
  let currentCash = startingCash;
  let totalInvestment = 0;

  for (let i = 0; i < routeLen; i++) {
    const fromId = cycle[i];
    const toId = cycle[(i + 1) % routeLen];
    const key = `${fromId}->${toId}`;
    const trade = tradeMatrix.get(key);

    if (!trade) {
      return {
        simulatedLegs: [],
        actualTotalProfit: 0,
        actualTotalInvestment: 0,
        actualReturnRate: 0,
        actualROI: 0,
        isFeasible: false,
        infeasibleReason: `缺少 ${fromId} → ${toId} 的盈利交易`,
      };
    }

    if (trade.buyPrice <= 0) {
      return {
        simulatedLegs: [],
        actualTotalProfit: 0,
        actualTotalInvestment: 0,
        actualReturnRate: 0,
        actualROI: 0,
        isFeasible: false,
        infeasibleReason: `${fromId} 的 ${trade.goodName} 价格无效`,
      };
    }

    const maxAffordableQty = Math.floor(currentCash / trade.buyPrice);
    const maxCargoQty = cargoCapacity;
    const quantityBought = clamp(Math.min(maxAffordableQty, maxCargoQty), 0, cargoCapacity);

    if (quantityBought <= 0) {
      return {
        simulatedLegs,
        actualTotalProfit: 0,
        actualTotalInvestment: totalInvestment,
        actualReturnRate: totalInvestment > 0 ? (currentCash - totalInvestment) / totalInvestment : 0,
        actualROI: totalInvestment > 0 ? (currentCash - totalInvestment) / totalInvestment : 0,
        isFeasible: false,
        infeasibleReason: `在 ${fromId} 买不起 1 单位 ${trade.goodName} (需要 ₵${trade.buyPrice}，仅有 ₵${Math.round(currentCash)})`,
      };
    }

    const costBasis = quantityBought * trade.buyPrice;
    const saleProceeds = quantityBought * trade.sellPrice;
    const legProfit = saleProceeds - costBasis;

    if (i === 0) {
      totalInvestment = costBasis;
    }

    simulatedLegs.push({
      ...trade,
      fromPlanetId: fromId,
      toPlanetId: toId,
      quantityBought,
      costBasis,
      saleProceeds,
      legProfit,
      cargoUsed: quantityBought,
      cashRemaining: currentCash - costBasis + saleProceeds,
    });

    currentCash = currentCash - costBasis + saleProceeds;
  }

  const actualTotalProfit = currentCash - startingCash;
  const actualReturnRate = totalInvestment > 0 ? actualTotalProfit / totalInvestment : 0;
  const actualROI = totalInvestment > 0 ? actualTotalProfit / totalInvestment : 0;

  return {
    simulatedLegs,
    actualTotalProfit,
    actualTotalInvestment: totalInvestment,
    actualReturnRate,
    actualROI,
    isFeasible: true,
  };
};

export const buildRouteFromCycle = (
  cycle: string[],
  tradeMatrix: Map<string, BestTrade>,
  params: SimulationParams
): TradeRoute | null => {
  const routeLen = cycle.length;
  const legs: LegTrade[] = [];
  let theoreticalCompoundReturn = 1;
  let theoreticalTotalProfitPerUnit = 0;
  let totalDistance = 0;

  for (let i = 0; i < routeLen; i++) {
    const fromId = cycle[i];
    const toId = cycle[(i + 1) % routeLen];
    const key = `${fromId}->${toId}`;
    const trade = tradeMatrix.get(key);

    const fromPlanet = getPlanet(fromId);
    const toPlanet = getPlanet(toId);
    const dist = fromPlanet && toPlanet ? getDistance(fromPlanet, toPlanet) : 0.5;

    if (!trade) {
      return null;
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

    theoreticalCompoundReturn *= trade.returnRate;
    theoreticalTotalProfitPerUnit += trade.profitPerUnit;
    totalDistance += dist;
  }

  const simulation = simulateRoute(cycle, tradeMatrix, params);

  if (legs.length < 2) return null;

  const planetNames = cycle.map((pid) => {
    const p = getPlanet(pid);
    return p ? p.name : pid;
  });

  const profitPerDistance = totalDistance > 0 ? simulation.actualTotalProfit / totalDistance : 0;

  return {
    id: cycle.join('→'),
    planets: cycle,
    planetNames,
    legs,
    simulatedLegs: simulation.simulatedLegs,

    theoreticalTotalProfitPerUnit,
    theoreticalCompoundReturnRate: theoreticalCompoundReturn - 1,

    actualTotalProfit: simulation.actualTotalProfit,
    actualTotalInvestment: simulation.actualTotalInvestment,
    actualReturnRate: simulation.actualReturnRate,
    actualROI: simulation.actualROI,

    totalDistance,
    profitPerDistance,
    routeLength: routeLen,
    isFeasible: simulation.isFeasible,
    infeasibleReason: simulation.infeasibleReason,
  };
};
