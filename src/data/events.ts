import type { GameEvent } from '../types/game';

export const EVENTS: GameEvent[] = [
  {
    id: 'distress-cargo',
    title: '遇险商船',
    description: '一艘商船发出求救信号，它的引擎已损坏，船上有一些货物。你可以选择救援或继续航行。',
    icon: '🆘',
    choices: [
      {
        id: 'rescue',
        label: '救援',
        description: '提供帮助，可能获得货物奖励',
        result: {
          credits: 200,
          cargo: [{ goodId: 'medicine', quantity: 3 }],
          message: '你成功救援了商船！船长赠送你 200 金币和 3 单位医疗物资作为感谢。',
        },
      },
      {
        id: 'ignore',
        label: '无视',
        description: '继续航行，不承担风险',
        result: {
          message: '你选择了继续航行，心中略感愧疚。',
        },
      },
    ],
  },
  {
    id: 'space-storm',
    title: '太空风暴',
    description: '突如其来的太空风暴席卷了你的飞船！护盾正在受到冲击。',
    icon: '🌪️',
    choices: [
      {
        id: 'shield',
        label: '全功率护盾',
        description: '消耗护盾值抵御风暴',
        result: {
          shield: -20,
          message: '护盾抵挡了大部分冲击，但损失了 20 点护盾值。',
        },
      },
      {
        id: 'evade',
        label: '紧急规避',
        description: '尝试机动躲避，可能损失货物',
        result: {
          removeCargo: true,
          message: '规避过程中部分货物从货仓甩出，损失了一些货物。',
        },
      },
    ],
  },
  {
    id: 'derelict-ship',
    title: '废弃飞船',
    description: '你发现一艘漂浮在太空中的废弃飞船，看起来已经很久没有人了...',
    icon: '🛸',
    choices: [
      {
        id: 'board',
        label: '登船搜索',
        description: '可能找到宝物，但也可能有危险',
        result: {
          credits: 800,
          shield: -10,
          message: '你找到了一些被遗忘的财物（+800金币），但飞船的自动防御系统损坏了你的护盾（-10）。',
        },
      },
      {
        id: 'salvage',
        label: '远程回收',
        description: '安全但收益较少',
        result: {
          credits: 250,
          message: '你远程回收了部分可用部件，获得了 250 金币。',
        },
      },
      {
        id: 'leave',
        label: '离开',
        description: '不冒险，继续前进',
        result: {
          message: '你谨慎地离开了废弃飞船。',
        },
      },
    ],
  },
  {
    id: 'friendly-trader',
    title: '友好商人',
    description: '一位独行商人邀请你进行一次私下交易，价格比市场更优惠。',
    icon: '🤝',
    choices: [
      {
        id: 'buy-food',
        label: '购买食品',
        description: '用 150 金币购买 5 单位食品',
        result: {
          credits: -150,
          cargo: [{ goodId: 'food', quantity: 5 }],
          message: '你用优惠的价格买到了 5 单位合成食品！',
        },
      },
      {
        id: 'buy-crystal',
        label: '购买水晶',
        description: '用 600 金币购买 3 单位水晶',
        result: {
          credits: -600,
          cargo: [{ goodId: 'crystal', quantity: 3 }],
          message: '这笔交易太划算了！你获得了 3 单位能量水晶。',
        },
      },
      {
        id: 'decline',
        label: '婉拒',
        description: '不参与交易',
        result: {
          message: '你婉拒了商人的邀请，继续航行。',
        },
      },
    ],
  },
  {
    id: 'asteroid-field',
    title: '小行星带',
    description: '航线前方出现了密集的小行星带，你需要做出选择。',
    icon: '☄️',
    choices: [
      {
        id: 'through',
        label: '穿越小行星带',
        description: '快速但有碰撞风险',
        result: {
          shield: -30,
          credits: 400,
          message: '你在小行星间穿梭时采集到了一些稀有矿物（+400金币），但护盾受到了损伤（-30）。',
        },
      },
      {
        id: 'around',
        label: '绕道而行',
        description: '安全但浪费时间',
        result: {
          credits: -50,
          message: '绕道消耗了更多燃料，损失了 50 金币。',
        },
      },
    ],
  },
];

export const getRandomEvent = (): GameEvent => {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
};
