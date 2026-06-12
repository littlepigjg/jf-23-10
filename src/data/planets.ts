import type { Planet } from '../types/game';

export const PLANETS: Planet[] = [
  {
    id: 'terra-nova',
    name: '新地球',
    type: 'home',
    x: 0.15,
    y: 0.6,
    color: '#3b82f6',
    description: '人类殖民的首颗星球，繁荣的贸易中心，新手冒险者的起点。',
  },
  {
    id: 'oreon',
    name: '奥里昂',
    type: 'resource',
    x: 0.38,
    y: 0.35,
    color: '#a16207',
    description: '富含稀有矿石的矿业星球，金属和原材料价格低廉。',
  },
  {
    id: 'forge',
    name: '熔炉星',
    type: 'industrial',
    x: 0.62,
    y: 0.7,
    color: '#dc2626',
    description: '重工业基地，生产高科技武器和设备，需要大量原材料。',
  },
  {
    id: 'aurora',
    name: '极光港',
    type: 'trade',
    x: 0.82,
    y: 0.25,
    color: '#8b5cf6',
    description: '自由贸易港，各类奢侈品和消费品的集散地。',
  },
  {
    id: 'crystal',
    name: '水晶星',
    type: 'resource',
    x: 0.5,
    y: 0.15,
    color: '#06b6d4',
    description: '覆盖着能量水晶的神秘星球，能源价格极低。',
  },
  {
    id: 'nexus',
    name: '枢纽站',
    type: 'trade',
    x: 0.25,
    y: 0.85,
    color: '#f59e0b',
    description: '星际交通枢纽，信息灵通，各类货物中转频繁。',
  },
];

export const getPlanet = (id: string): Planet | undefined => {
  return PLANETS.find((p) => p.id === id);
};

export const getDistance = (a: Planet, b: Planet): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
