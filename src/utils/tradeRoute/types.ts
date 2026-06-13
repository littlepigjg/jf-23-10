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

  totalDistance: number;
  profitPerDistance: number;
  routeLength: number;
  isFeasible: boolean;
  infeasibleReason?: string;
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
