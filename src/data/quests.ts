import type { Quest } from '../types/game';

export const QUESTS: Quest[] = [
  {
    id: 'q1-first-trade',
    title: '第一桶金',
    description: '完成你的第一笔贸易交易。',
    type: 'trade',
    target: 1,
    rewardCredits: 500,
    rewardDescription: '+500 金币',
  },
  {
    id: 'q2-deliver-ore',
    title: '熔炉星的订单',
    description: '运送 10 单位精炼矿石到熔炉星。',
    type: 'deliver',
    target: 10,
    targetGoodId: 'ore',
    targetPlanetId: 'forge',
    rewardCredits: 1500,
    rewardDescription: '+1500 金币',
  },
  {
    id: 'q3-defeat-pirates',
    title: '清剿海盗',
    description: '击败 3 波海盗来证明你的实力。',
    type: 'defeat',
    target: 3,
    rewardCredits: 2000,
    rewardDescription: '+2000 金币',
  },
  {
    id: 'q4-visit-crystal',
    title: '探索水晶星',
    description: '前往神秘的水晶星进行探索。',
    type: 'visit',
    target: 1,
    targetPlanetId: 'crystal',
    rewardCredits: 800,
    rewardDescription: '+800 金币',
  },
  {
    id: 'q5-trade-master',
    title: '贸易大师',
    description: '累计完成 20 笔成功交易。',
    type: 'trade',
    target: 20,
    rewardCredits: 5000,
    rewardDescription: '+5000 金币',
  },
  {
    id: 'q6-deliver-luxury',
    title: '新地球的盛宴',
    description: '运送 5 单位奢侈品到新地球。',
    type: 'deliver',
    target: 5,
    targetGoodId: 'luxury',
    targetPlanetId: 'terra-nova',
    rewardCredits: 3500,
    rewardDescription: '+3500 金币',
  },
];

export const getQuest = (id: string): Quest | undefined => {
  return QUESTS.find((q) => q.id === id);
};
