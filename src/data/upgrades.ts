import type { UpgradeLevel } from '../types/game';

const calcCost = (base: number, level: number): number => {
  return Math.round(base * Math.pow(1.8, level - 1));
};

export const SHIELD_UPGRADES: UpgradeLevel[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    cost: calcCost(300, level),
    value: 50 + level * 25,
  };
});

export const CARGO_UPGRADES: UpgradeLevel[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    cost: calcCost(250, level),
    value: 20 + level * 15,
  };
});

export const WEAPON_UPGRADES: UpgradeLevel[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    cost: calcCost(400, level),
    value: 10 + level * 5,
  };
});

export const getShieldAtLevel = (level: number): number => {
  const idx = Math.min(level - 1, SHIELD_UPGRADES.length - 1);
  return SHIELD_UPGRADES[Math.max(0, idx)].value;
};

export const getCargoAtLevel = (level: number): number => {
  const idx = Math.min(level - 1, CARGO_UPGRADES.length - 1);
  return CARGO_UPGRADES[Math.max(0, idx)].value;
};

export const getDamageAtLevel = (level: number): number => {
  const idx = Math.min(level - 1, WEAPON_UPGRADES.length - 1);
  return WEAPON_UPGRADES[Math.max(0, idx)].value;
};
