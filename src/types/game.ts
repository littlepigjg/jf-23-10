import type { PriceMarketState } from '../utils/priceEngine';

export type PlanetType = 'resource' | 'industrial' | 'trade' | 'home';

export interface Planet {
  id: string;
  name: string;
  type: PlanetType;
  x: number;
  y: number;
  color: string;
  description: string;
}

export interface Good {
  id: string;
  name: string;
  icon: string;
  basePrice: number;
  volatility: number;
  preferredPlanetType: PlanetType;
}

export interface UpgradeLevel {
  level: number;
  cost: number;
  value: number;
}

export type QuestStatus = 'active' | 'completed' | 'claimed';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'deliver' | 'defeat' | 'trade' | 'visit';
  target: number;
  targetGoodId?: string;
  targetPlanetId?: string;
  rewardCredits: number;
  rewardDescription: string;
}

export interface QuestState {
  id: string;
  status: QuestStatus;
  progress: number;
}

export interface CargoItem {
  goodId: string;
  quantity: number;
  avgCost: number;
}

export interface ShipState {
  shieldLevel: number;
  cargoLevel: number;
  weaponLevel: number;
  currentShield: number;
  maxShield: number;
  cargoCapacity: number;
  damage: number;
}

export interface TravelState {
  isTraveling: boolean;
  fromPlanet: string;
  toPlanet: string;
  progress: number;
  duration: number;
}

export interface BattleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  angle: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isPlayer: boolean;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface BattleState {
  player: BattleEntity;
  pirates: BattleEntity[];
  bullets: Bullet[];
  particles: Particle[];
  isPlayerTurn: boolean;
  result: 'ongoing' | 'win' | 'lose' | 'fled';
  countdown: number;
  difficulty: number;
  shakeTime: number;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  result: {
    credits?: number;
    shield?: number;
    cargo?: { goodId: string; quantity: number }[];
    removeCargo?: boolean;
    message: string;
  };
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  choices: EventChoice[];
}

export interface Statistics {
  piratesDefeated: number;
  tradesCompleted: number;
  questsCompleted: number;
  distanceTraveled: number;
}

export interface GameState {
  credits: number;
  currentPlanetId: string;
  ship: ShipState;
  cargo: CargoItem[];
  planetPrices: Record<string, Record<string, number>>;
  marketState: PriceMarketState;
  quests: QuestState[];
  statistics: Statistics;
  travelState: TravelState | null;
  battleState: BattleState | null;
  eventState: GameEvent | null;
  currentView: 'starmap' | 'trade' | 'upgrade' | 'quests';
}
