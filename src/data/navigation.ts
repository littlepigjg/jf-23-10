import type { GameState } from '../types/game';

export interface NavItem {
  key: GameState['currentView'];
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'starmap', label: '星图', icon: '🗺️' },
  { key: 'trade', label: '贸易', icon: '💹' },
  { key: 'upgrade', label: '升级', icon: '🔧' },
  { key: 'quests', label: '任务', icon: '📋' },
];
