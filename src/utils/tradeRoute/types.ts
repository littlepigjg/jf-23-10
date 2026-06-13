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

export interface SimulatedLeg extends LegTrade {
  quantityBought: number;
  costBasis: number;
  saleProceeds: number;
  legProfit: number;
  cargoUsed: number;
  cashRemaining: number;
  travelTicks: number;
  priceImpactOnBuy: number;
  priceImpactOnSell: number;
  sdBeforeBuy: number;
  sdAfterBuy: number;
  sdBeforeSell: number;
  sdAfterSell: number;
}

export interface TradeRoute {
  id: string;
  planets: string[];
  planetNames: string[];
  legs: LegTrade[];
  simulatedLegs: SimulatedLeg[];

  theoreticalTotalProfitPerUnit: number;
  theoreticalCompoundReturnRate: number;

  actualTotalProfit: number;
  actualTotalInvestment: number;
  actualReturnRate: number;
  actualROI: number;

  dynamicTotalProfit: number;
  dynamicTotalInvestment: number;
  dynamicReturnRate: number;
  dynamicROI: number;
  totalTravelTicks: number;

  totalDistance: number;
  profitPerDistance: number;
  routeLength: number;
  isFeasible: boolean;
  infeasibleReason?: string;
  priceDropWarning?: string;
}

export interface BestTrade {
  goodId: string;
  goodName: string;
  goodIcon: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  returnRate: number;
}

export interface SimulationParams {
  startingCash: number;
  cargoCapacity: number;
}
