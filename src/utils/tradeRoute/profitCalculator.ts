import { getPlanet, getDistance } from '../../data/planets';
import type { PriceMarketState } from '../../utils/priceEngine';
import type { BestTrade, TradeRoute, SimulatedLeg, LegTrade, SimulationParams } from './types';
import {
  DynamicPriceSimulator,
  createSimulatorFromSnapshot,
} from './dynamicPriceSimulator';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export interface StaticSimulationResult {
  simulatedLegs: SimulatedLeg[];
  actualTotalProfit: number;
  actualTotalInvestment: number;
  actualReturnRate: number;
  actualROI: number;
  isFeasible: boolean;
  infeasibleReason?: string;
}

export interface DynamicSimulationResult extends StaticSimulationResult {
  totalTravelTicks: number;
  priceDropWarning?: string;
}

export const simulateRouteStatic = (
  cycle: string[],
  tradeMatrix: Map<string, BestTrade>,
  params: SimulationParams
): StaticSimulationResult => {
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
      travelTicks: 0,
      priceImpactOnBuy: 0,
      priceImpactOnSell: 0,
      sdBeforeBuy: 0,
      sdAfterBuy: 0,
      sdBeforeSell: 0,
      sdAfterSell: 0,
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

export const simulateRouteDynamic = (
  cycle: string[],
  tradeMatrix: Map<string, BestTrade>,
  params: SimulationParams,
  initialMarket: PriceMarketState,
  initialPrices: Record<string, Record<string, number>>,
  deterministicSeed: number = 42
): DynamicSimulationResult => {
  const { startingCash, cargoCapacity } = params;
  const routeLen = cycle.length;

  const simulator = createSimulatorFromSnapshot(
    initialMarket,
    initialPrices,
    true,
    deterministicSeed
  );

  const simulatedLegs: SimulatedLeg[] = [];
  let currentCash = startingCash;
  let totalInvestment = 0;
  let totalTravelTicks = 0;
  let maxPriceDropRatio = 0;

  for (let i = 0; i < routeLen; i++) {
    const fromId = cycle[i];
    const toId = cycle[(i + 1) % routeLen];
    const key = `${fromId}->${toId}`;
    const staticTrade = tradeMatrix.get(key);

    if (!staticTrade) {
      return {
        simulatedLegs: [],
        actualTotalProfit: 0,
        actualTotalInvestment: 0,
        actualReturnRate: 0,
        actualROI: 0,
        isFeasible: false,
        totalTravelTicks,
        infeasibleReason: `缺少 ${fromId} → ${toId} 的盈利交易`,
      };
    }

    if (i > 0) {
      const travelResult = simulator.advanceTravel(cycle[i - 1], fromId);
      totalTravelTicks += travelResult.ticksElapsed;
    }

    const buyPrice = simulator.getPrice(fromId, staticTrade.goodId);

    if (buyPrice <= 0) {
      return {
        simulatedLegs,
        actualTotalProfit: 0,
        actualTotalInvestment: totalInvestment,
        actualReturnRate: totalInvestment > 0 ? (currentCash - totalInvestment) / totalInvestment : 0,
        actualROI: totalInvestment > 0 ? (currentCash - totalInvestment) / totalInvestment : 0,
        isFeasible: false,
        totalTravelTicks,
        infeasibleReason: `${fromId} 的 ${staticTrade.goodName} 价格无效`,
      };
    }

    const maxAffordableQty = Math.floor(currentCash / buyPrice);
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
        totalTravelTicks,
        infeasibleReason: `在 ${fromId} 买不起 1 单位 ${staticTrade.goodName} (需要 ₵${buyPrice}，仅有 ₵${Math.round(currentCash)})`,
      };
    }

    const buyImpact = simulator.applyTrade(
      fromId,
      staticTrade.goodId,
      quantityBought,
      true
    );

    const costBasis = quantityBought * buyPrice;
    currentCash -= costBasis;

    if (i === 0) {
      totalInvestment = costBasis;
    }

    const travelToSell = simulator.advanceTravel(fromId, toId);
    totalTravelTicks += travelToSell.ticksElapsed;

    const sellPrice = simulator.getPrice(toId, staticTrade.goodId);

    if (sellPrice < buyPrice) {
      const dropRatio = 1 - sellPrice / buyPrice;
      maxPriceDropRatio = Math.max(maxPriceDropRatio, dropRatio);
    }

    const sellImpact = simulator.applyTrade(
      toId,
      staticTrade.goodId,
      quantityBought,
      false
    );

    const saleProceeds = quantityBought * sellPrice;
    const legProfit = saleProceeds - costBasis;
    currentCash += saleProceeds;

    simulatedLegs.push({
      fromPlanetId: fromId,
      toPlanetId: toId,
      goodId: staticTrade.goodId,
      goodName: staticTrade.goodName,
      goodIcon: staticTrade.goodIcon,
      buyPrice,
      sellPrice,
      profitPerUnit: sellPrice - buyPrice,
      returnRate: sellPrice / buyPrice,
      quantityBought,
      costBasis,
      saleProceeds,
      legProfit,
      cargoUsed: quantityBought,
      cashRemaining: currentCash,
      travelTicks: travelToSell.ticksElapsed,
      priceImpactOnBuy: buyImpact.priceDelta,
      priceImpactOnSell: sellImpact.priceDelta,
      sdBeforeBuy: buyImpact.sdBefore,
      sdAfterBuy: buyImpact.sdAfter,
      sdBeforeSell: sellImpact.sdBefore,
      sdAfterSell: sellImpact.sdAfter,
    });
  }

  const actualTotalProfit = currentCash - startingCash;
  const actualReturnRate = totalInvestment > 0 ? actualTotalProfit / totalInvestment : 0;
  const actualROI = totalInvestment > 0 ? actualTotalProfit / totalInvestment : 0;

  let priceDropWarning: string | undefined;
  if (maxPriceDropRatio > 0.05) {
    priceDropWarning = `动态模拟中出现价格下跌，最大跌幅 ${(maxPriceDropRatio * 100).toFixed(1)}%，静态预测不可靠`;
  }

  return {
    simulatedLegs,
    actualTotalProfit,
    actualTotalInvestment: totalInvestment,
    actualReturnRate,
    actualROI,
    isFeasible: true,
    totalTravelTicks,
    priceDropWarning,
  };
};

export const buildRouteFromCycle = (
  cycle: string[],
  tradeMatrix: Map<string, BestTrade>,
  params: SimulationParams,
  initialMarket?: PriceMarketState,
  initialPrices?: Record<string, Record<string, number>>,
  deterministicSeed: number = 42
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

  if (legs.length < 2) return null;

  const staticSim = simulateRouteStatic(cycle, tradeMatrix, params);

  let dynamicSim: DynamicSimulationResult | null = null;
  if (initialMarket && initialPrices) {
    dynamicSim = simulateRouteDynamic(
      cycle,
      tradeMatrix,
      params,
      initialMarket,
      initialPrices,
      deterministicSeed
    );
  }

  const planetNames = cycle.map((pid) => {
    const p = getPlanet(pid);
    return p ? p.name : pid;
  });

  const profitToUse = dynamicSim ? dynamicSim.actualTotalProfit : staticSim.actualTotalProfit;
  const profitPerDistance = totalDistance > 0 ? profitToUse / totalDistance : 0;

  return {
    id: cycle.join('→'),
    planets: cycle,
    planetNames,
    legs,
    simulatedLegs: dynamicSim ? dynamicSim.simulatedLegs : staticSim.simulatedLegs,

    theoreticalTotalProfitPerUnit,
    theoreticalCompoundReturnRate: theoreticalCompoundReturn - 1,

    actualTotalProfit: staticSim.actualTotalProfit,
    actualTotalInvestment: staticSim.actualTotalInvestment,
    actualReturnRate: staticSim.actualReturnRate,
    actualROI: staticSim.actualROI,

    dynamicTotalProfit: dynamicSim?.actualTotalProfit ?? staticSim.actualTotalProfit,
    dynamicTotalInvestment: dynamicSim?.actualTotalInvestment ?? staticSim.actualTotalInvestment,
    dynamicReturnRate: dynamicSim?.actualReturnRate ?? staticSim.actualReturnRate,
    dynamicROI: dynamicSim?.actualROI ?? staticSim.actualROI,
    totalTravelTicks: dynamicSim?.totalTravelTicks ?? 0,

    totalDistance,
    profitPerDistance,
    routeLength: routeLen,
    isFeasible: dynamicSim ? dynamicSim.isFeasible : staticSim.isFeasible,
    infeasibleReason: dynamicSim?.infeasibleReason ?? staticSim.infeasibleReason,
    priceDropWarning: dynamicSim?.priceDropWarning,
  };
};
