import type { Good } from '../types/game';

export const GOODS: Good[] = [
  {
    id: 'ore',
    name: '精炼矿石',
    icon: '⛏️',
    basePrice: 80,
    volatility: 0.35,
    preferredPlanetType: 'industrial',
  },
  {
    id: 'crystal',
    name: '能量水晶',
    icon: '💎',
    basePrice: 220,
    volatility: 0.45,
    preferredPlanetType: 'trade',
  },
  {
    id: 'weapons',
    name: '武器装备',
    icon: '⚔️',
    basePrice: 350,
    volatility: 0.3,
    preferredPlanetType: 'home',
  },
  {
    id: 'medicine',
    name: '医疗物资',
    icon: '💊',
    basePrice: 180,
    volatility: 0.4,
    preferredPlanetType: 'resource',
  },
  {
    id: 'food',
    name: '合成食品',
    icon: '🍱',
    basePrice: 50,
    volatility: 0.25,
    preferredPlanetType: 'industrial',
  },
  {
    id: 'luxury',
    name: '奢侈品',
    icon: '👑',
    basePrice: 500,
    volatility: 0.55,
    preferredPlanetType: 'home',
  },
];

export const getGood = (id: string): Good | undefined => {
  return GOODS.find((g) => g.id === id);
};
