import { useCallback } from 'react';
import type { GameState } from '../types/game';

const SAVE_KEY = 'space_trader_save_v1';

export interface PersistenceAdapter {
  hasSave: () => boolean;
  loadSave: () => GameState | null;
  writeSave: (state: GameState) => void;
  clearSave: () => void;
}

export const localStorageAdapter: PersistenceAdapter = {
  hasSave: () => {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  },
  loadSave: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  },
  writeSave: (state: GameState) => {
    try {
      const toSave: GameState = {
        ...state,
        travelState: null,
        battleState: null,
        eventState: null,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore quota / serialization errors
    }
  },
  clearSave: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  },
};

export const buildSavePayload = (state: GameState): GameState => ({
  ...state,
  travelState: null,
  battleState: null,
  eventState: null,
});

export interface UsePersistenceResult {
  hasSave: () => boolean;
  loadSave: () => GameState | null;
  saveGame: (state: GameState) => void;
  clearSave: () => void;
}

export function usePersistence(
  adapter: PersistenceAdapter = localStorageAdapter
): UsePersistenceResult {
  const hasSave = useCallback(() => adapter.hasSave(), [adapter]);
  const loadSave = useCallback(() => adapter.loadSave(), [adapter]);
  const saveGame = useCallback(
    (state: GameState) => adapter.writeSave(buildSavePayload(state)),
    [adapter]
  );
  const clearSave = useCallback(() => adapter.clearSave(), [adapter]);

  return { hasSave, loadSave, saveGame, clearSave };
}
