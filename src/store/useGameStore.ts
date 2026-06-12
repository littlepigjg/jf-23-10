import { create } from 'zustand';
import type { GameState, CargoItem, QuestState, BattleState, QuestStatus } from '../types/game';
import { PLANETS, getDistance } from '../data/planets';
import { QUESTS, getQuest } from '../data/quests';
import {
  SHIELD_UPGRADES,
  CARGO_UPGRADES,
  WEAPON_UPGRADES,
  getShieldAtLevel,
  getCargoAtLevel,
  getDamageAtLevel,
} from '../data/upgrades';
import { MarketService } from '../services/marketService';
import { getGood } from '../data/goods';
import { getRandomEvent } from '../data/events';
import { localStorageAdapter, buildSavePayload } from '../hooks/usePersistence';

export interface GameStore extends GameState {
  hasSave: () => boolean;
  newGame: () => void;
  loadGame: () => { success: boolean; offlineTicks: number };
  saveGame: () => void;
  clearSave: () => void;
  setView: (view: GameState['currentView']) => void;

  advanceMarketOnTravel: (toPlanetId: string, distanceFactor: number) => void;
  applyTradeImpact: (goodId: string, quantity: number, isBuy: boolean) => number;

  getGoodTrendInfo: (goodId: string) => { value: number; label: string; color: string };
  getPlanetSDInfo: (goodId: string) => { value: number; label: string; color: string };

  buyGood: (goodId: string, quantity: number) => boolean;
  sellGood: (goodId: string, quantity: number) => boolean;
  getCargoUsed: () => number;

  upgradeShield: () => boolean;
  upgradeCargo: () => boolean;
  upgradeWeapon: () => boolean;
  repairShield: () => boolean;

  startTravel: (toPlanetId: string) => void;
  updateTravel: (dt: number) => void;

  setBattleState: (state: BattleState | null) => void;
  completeBattle: (won: boolean) => void;

  triggerEvent: () => void;
  resolveEventChoice: (choiceId: string) => string;

  completeQuest: (questId: string) => void;
  claimQuest: (questId: string) => boolean;

  updateQuestProgress: (
    type: 'trade' | 'defeat' | 'deliver' | 'visit',
    amount?: number,
    goodId?: string,
    planetId?: string
  ) => void;
}

const initFromMarket = () => {
  const { market, prices } = MarketService.createInitial();
  return { marketState: market, planetPrices: prices };
};

const createInitialState = (): GameState => {
  const { marketState, planetPrices } = initFromMarket();
  const quests: QuestState[] = QUESTS.map((q) => ({
    id: q.id,
    status: 'active' as QuestStatus,
    progress: 0,
  }));

  return {
    credits: 1000,
    currentPlanetId: PLANETS[0].id,
    ship: {
      shieldLevel: 1,
      cargoLevel: 1,
      weaponLevel: 1,
      currentShield: getShieldAtLevel(1),
      maxShield: getShieldAtLevel(1),
      cargoCapacity: getCargoAtLevel(1),
      damage: getDamageAtLevel(1),
    },
    cargo: [],
    planetPrices,
    marketState,
    quests,
    statistics: {
      piratesDefeated: 0,
      tradesCompleted: 0,
      questsCompleted: 0,
      distanceTraveled: 0,
    },
    travelState: null,
    battleState: null,
    eventState: null,
    currentView: 'starmap',
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  hasSave: () => localStorageAdapter.hasSave(),

  newGame: () => {
    set(createInitialState());
  },

  loadGame: () => {
    const parsed = localStorageAdapter.loadSave();
    if (!parsed) return { success: false, offlineTicks: 0 };

    const { market, prices, ticksApplied } = MarketService.loadWithOfflineCatchup(
      parsed.marketState
    );

    set({
      ...parsed,
      marketState: market,
      planetPrices: prices,
    });
    return { success: true, offlineTicks: ticksApplied };
  },

  saveGame: () => {
    localStorageAdapter.writeSave(buildSavePayload(get()));
  },

  clearSave: () => localStorageAdapter.clearSave(),

  advanceMarketOnTravel: (toPlanetId, distanceFactor) => {
    const state = get();
    const { market, planetPrices } = MarketService.advanceOnTravel(
      state.marketState,
      state.planetPrices,
      toPlanetId,
      distanceFactor
    );
    set({ marketState: market, planetPrices });
  },

  applyTradeImpact: (goodId, quantity, isBuy) => {
    const state = get();
    const { market, planetPrices, priceDelta } = MarketService.applyTradeImpact(
      state.marketState,
      state.planetPrices,
      state.currentPlanetId,
      goodId,
      quantity,
      isBuy
    );
    set({ marketState: market, planetPrices });
    return priceDelta;
  },

  getGoodTrendInfo: (goodId) => {
    return MarketService.getGoodTrendInfo(goodId, get().marketState);
  },

  getPlanetSDInfo: (goodId) => {
    return MarketService.getPlanetSDInfo(goodId, get().currentPlanetId, get().marketState);
  },

  setView: (view) => set({ currentView: view }),

  getCargoUsed: () => {
    const state = get();
    return state.cargo.reduce((sum, c) => sum + c.quantity, 0);
  },

  buyGood: (goodId, quantity) => {
    const state = get();
    const price = state.planetPrices[state.currentPlanetId]?.[goodId];
    if (!price || quantity <= 0) return false;

    const totalCost = price * quantity;
    if (totalCost > state.credits) return false;

    const used = state.cargo.reduce((s, c) => s + c.quantity, 0);
    if (used + quantity > state.ship.cargoCapacity) return false;

    const newCredits = state.credits - totalCost;
    let newCargo = [...state.cargo];
    const existing = newCargo.find((c) => c.goodId === goodId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = (existing.avgCost * existing.quantity + price * quantity) / newQty;
      newCargo = newCargo.map((c) =>
        c.goodId === goodId ? { ...c, quantity: newQty, avgCost: Math.round(newAvg) } : c
      );
    } else {
      newCargo.push({ goodId, quantity, avgCost: price });
    }

    const { market, planetPrices } = MarketService.applyTradeImpact(
      state.marketState,
      state.planetPrices,
      state.currentPlanetId,
      goodId,
      quantity,
      true
    );

    set({ credits: newCredits, cargo: newCargo, marketState: market, planetPrices });
    get().saveGame();
    return true;
  },

  sellGood: (goodId, quantity) => {
    const state = get();
    const price = state.planetPrices[state.currentPlanetId]?.[goodId];
    const cargoItem = state.cargo.find((c) => c.goodId === goodId);
    if (!price || !cargoItem || quantity <= 0 || quantity > cargoItem.quantity) return false;

    const totalRevenue = price * quantity;
    const newCredits = state.credits + totalRevenue;
    let newCargo: CargoItem[];
    if (cargoItem.quantity === quantity) {
      newCargo = state.cargo.filter((c) => c.goodId !== goodId);
    } else {
      newCargo = state.cargo.map((c) =>
        c.goodId === goodId ? { ...c, quantity: c.quantity - quantity } : c
      );
    }

    const stats = { ...state.statistics, tradesCompleted: state.statistics.tradesCompleted + 1 };

    const { market, planetPrices } = MarketService.applyTradeImpact(
      state.marketState,
      state.planetPrices,
      state.currentPlanetId,
      goodId,
      quantity,
      false
    );

    set({
      credits: newCredits,
      cargo: newCargo,
      statistics: stats,
      marketState: market,
      planetPrices,
    });

    const store = get();
    store.updateQuestProgress('trade', 1);

    const quest = QUESTS.find(
      (q) =>
        q.type === 'deliver' && q.targetGoodId === goodId && q.targetPlanetId === state.currentPlanetId
    );
    if (quest) {
      store.updateQuestProgress('deliver', quantity, goodId, state.currentPlanetId);
    }

    store.saveGame();
    return true;
  },

  upgradeShield: () => {
    const state = get();
    const nextLevel = state.ship.shieldLevel + 1;
    if (nextLevel > SHIELD_UPGRADES.length) return false;
    const cost = SHIELD_UPGRADES[nextLevel - 1].cost;
    if (state.credits < cost) return false;

    const newMaxShield = getShieldAtLevel(nextLevel);
    set({
      credits: state.credits - cost,
      ship: {
        ...state.ship,
        shieldLevel: nextLevel,
        maxShield: newMaxShield,
        currentShield: newMaxShield,
      },
    });
    get().saveGame();
    return true;
  },

  upgradeCargo: () => {
    const state = get();
    const nextLevel = state.ship.cargoLevel + 1;
    if (nextLevel > CARGO_UPGRADES.length) return false;
    const cost = CARGO_UPGRADES[nextLevel - 1].cost;
    if (state.credits < cost) return false;

    set({
      credits: state.credits - cost,
      ship: {
        ...state.ship,
        cargoLevel: nextLevel,
        cargoCapacity: getCargoAtLevel(nextLevel),
      },
    });
    get().saveGame();
    return true;
  },

  upgradeWeapon: () => {
    const state = get();
    const nextLevel = state.ship.weaponLevel + 1;
    if (nextLevel > WEAPON_UPGRADES.length) return false;
    const cost = WEAPON_UPGRADES[nextLevel - 1].cost;
    if (state.credits < cost) return false;

    set({
      credits: state.credits - cost,
      ship: {
        ...state.ship,
        weaponLevel: nextLevel,
        damage: getDamageAtLevel(nextLevel),
      },
    });
    get().saveGame();
    return true;
  },

  repairShield: () => {
    const state = get();
    const missing = state.ship.maxShield - state.ship.currentShield;
    if (missing <= 0) return false;
    const cost = missing * 2;
    if (state.credits < cost) return false;

    set({
      credits: state.credits - cost,
      ship: { ...state.ship, currentShield: state.ship.maxShield },
    });
    get().saveGame();
    return true;
  },

  startTravel: (toPlanetId) => {
    const state = get();
    if (state.travelState || toPlanetId === state.currentPlanetId) return;

    const duration = 3000;
    set({
      travelState: {
        isTraveling: true,
        fromPlanet: state.currentPlanetId,
        toPlanet: toPlanetId,
        progress: 0,
        duration,
      },
      currentView: 'starmap',
    });
  },

  updateTravel: (dt) => {
    const state = get();
    if (!state.travelState?.isTraveling) return;

    const newProgress = state.travelState.progress + dt * 1000;
    if (newProgress >= state.travelState.duration) {
      const toPlanet = state.travelState.toPlanet;
      const fromPlanet = state.travelState.fromPlanet;
      const fromP = PLANETS.find((p) => p.id === fromPlanet);
      const toP = PLANETS.find((p) => p.id === toPlanet);
      const dist = fromP && toP ? getDistance(fromP, toP) : 0.5;

      const { market, planetPrices } = MarketService.advanceOnTravel(
        state.marketState,
        state.planetPrices,
        toPlanet,
        dist
      );

      set({
        travelState: null,
        currentPlanetId: toPlanet,
        marketState: market,
        planetPrices,
      });

      const store = get();
      store.updateQuestProgress('visit', 1, undefined, toPlanet);
      store.saveGame();
    } else {
      set({
        travelState: { ...state.travelState, progress: newProgress },
      });
    }
  },

  setBattleState: (s) => set({ battleState: s }),

  completeBattle: (won) => {
    const state = get();
    let credits = state.credits;
    let currentShield = state.ship.currentShield;
    let cargo = state.cargo;

    if (won) {
      const reward = 200 + (state.battleState?.difficulty ?? 1) * 150;
      credits += reward;
      const stats = {
        ...state.statistics,
        piratesDefeated: state.statistics.piratesDefeated + 1,
      };

      const store = get() as GameStore;
      store.updateQuestProgress('defeat', 1);

      if (state.battleState?.player.hp !== undefined) {
        currentShield = Math.max(0, Math.min(state.ship.maxShield, state.battleState.player.hp));
      }

      set({
        credits,
        battleState: null,
        statistics: stats,
        ship: { ...state.ship, currentShield },
      });
    } else {
      const lostCredits = Math.floor(credits * 0.3);
      credits -= lostCredits;
      if (cargo.length > 0) {
        cargo = cargo.map((c) => ({ ...c, quantity: Math.max(0, Math.floor(c.quantity * 0.6)) }))
          .filter((c) => c.quantity > 0);
      }
      currentShield = Math.max(0, Math.floor(state.ship.maxShield * 0.3));

      set({
        credits,
        battleState: null,
        cargo,
        ship: { ...state.ship, currentShield },
      });
    }
    get().saveGame();
  },

  triggerEvent: () => {
    set({ eventState: getRandomEvent() });
  },

  resolveEventChoice: (choiceId) => {
    const state = get();
    const event = state.eventState;
    if (!event) return '';

    const choice = event.choices.find((c) => c.id === choiceId);
    if (!choice) return '';

    let credits = state.credits + (choice.result.credits ?? 0);
    let currentShield = state.ship.currentShield + (choice.result.shield ?? 0);
    let cargo = [...state.cargo];
    const capacity = state.ship.cargoCapacity;

    if (choice.result.cargo) {
      let used = cargo.reduce((s, c) => s + c.quantity, 0);
      for (const item of choice.result.cargo) {
        if (used >= capacity) break;
        const space = capacity - used;
        const qty = Math.min(item.quantity, space);
        if (qty <= 0) continue;
        const existing = cargo.find((c) => c.goodId === item.goodId);
        const good = getGood(item.goodId);
        const cost = good?.basePrice ?? 0;
        if (existing) {
          const newQty = existing.quantity + qty;
          const newAvg = (existing.avgCost * existing.quantity + cost * qty) / newQty;
          cargo = cargo.map((c) =>
            c.goodId === item.goodId ? { ...c, quantity: newQty, avgCost: Math.round(newAvg) } : c
          );
        } else {
          cargo.push({ goodId: item.goodId, quantity: qty, avgCost: cost });
        }
        used += qty;
      }
    }

    if (choice.result.removeCargo && cargo.length > 0) {
      const idx = Math.floor(Math.random() * cargo.length);
      const item = cargo[idx];
      const lost = Math.ceil(item.quantity * 0.4);
      if (lost >= item.quantity) {
        cargo = cargo.filter((_, i) => i !== idx);
      } else {
        cargo = cargo.map((c, i) => (i === idx ? { ...c, quantity: c.quantity - lost } : c));
      }
    }

    credits = Math.max(0, credits);
    currentShield = Math.max(0, Math.min(state.ship.maxShield, currentShield));

    set({
      credits,
      ship: { ...state.ship, currentShield },
      cargo,
      eventState: null,
    });
    get().saveGame();
    return choice.result.message;
  },

  updateQuestProgress: (type, amount = 1, goodId, planetId) => {
    const state = get();
    const newQuests = state.quests.map((qs) => {
      if (qs.status !== 'active') return qs;
      const q = getQuest(qs.id);
      if (!q || q.type !== type) return qs;

      if (type === 'deliver') {
        if (q.targetGoodId !== goodId || q.targetPlanetId !== planetId) return qs;
      }
      if (type === 'visit') {
        if (q.targetPlanetId !== planetId) return qs;
      }

      const newProgress = Math.min(qs.progress + amount, q.target);
      const newStatus: QuestStatus = newProgress >= q.target ? 'completed' : 'active';
      return { ...qs, progress: newProgress, status: newStatus };
    });
    set({ quests: newQuests });
  },

  completeQuest: (_questId) => {
    // legacy helper
  },

  claimQuest: (questId) => {
    const state = get();
    const qs = state.quests.find((q) => q.id === questId);
    const q = getQuest(questId);
    if (!qs || !q || qs.status !== 'completed') return false;

    const newCredits = state.credits + q.rewardCredits;
    const newQuests = state.quests.map((qq) =>
      qq.id === questId ? { ...qq, status: 'claimed' as QuestStatus } : qq
    );
    const stats = {
      ...state.statistics,
      questsCompleted: state.statistics.questsCompleted + 1,
    };
    set({ credits: newCredits, quests: newQuests, statistics: stats });
    get().saveGame();
    return true;
  },
}));
