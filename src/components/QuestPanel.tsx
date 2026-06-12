import { useGameStore } from '../store/useGameStore';
import { QUESTS } from '../data/quests';
import type { QuestStatus } from '../types/game';

const QuestPanel = () => {
  const { quests, claimQuest } = useGameStore();

  const getQuestState = (questId: string) => {
    return quests.find((q) => q.id === questId);
  };

  const getStatusConfig = (status: QuestStatus) => {
    switch (status) {
      case 'active':
        return {
          label: '进行中',
          text: 'text-neon-cyan',
          border: 'border-neon-cyan/50',
          bg: 'bg-neon-cyan/10',
          dot: 'bg-neon-cyan',
        };
      case 'completed':
        return {
          label: '已完成',
          text: 'text-neon-yellow',
          border: 'border-neon-yellow/50',
          bg: 'bg-neon-yellow/10',
          dot: 'bg-neon-yellow',
        };
      case 'claimed':
        return {
          label: '已领取',
          text: 'text-neon-green',
          border: 'border-neon-green/50',
          bg: 'bg-neon-green/10',
          dot: 'bg-neon-green',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return '💱';
      case 'deliver':
        return '📦';
      case 'defeat':
        return '⚔️';
      case 'visit':
        return '🧭';
      default:
        return '📜';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="title-section">📜 主线任务</h2>
        <span className="chip text-neon-cyan border-neon-cyan/40 font-orbitron">
          {quests.filter((q) => q.status === 'claimed').length}/{QUESTS.length} 已完成
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUESTS.map((quest) => {
          const state = getQuestState(quest.id);
          if (!state) return null;

          const progress = Math.min(state.progress, quest.target);
          const percent = (progress / quest.target) * 100;
          const status = getStatusConfig(state.status);
          const isClaimable = state.status === 'completed';

          return (
            <div
              key={quest.id}
              className={`panel corner-deco p-5 flex flex-col gap-4 transition-all duration-300 ${
                isClaimable ? 'ring-2 ring-neon-yellow/40 animate-pulse-glow' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getTypeIcon(quest.type)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-orbitron text-lg font-bold text-slate-100">
                      {quest.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      {quest.description}
                    </p>
                  </div>
                </div>
                <span
                  className={`chip flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                  />
                  {status.label}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">任务进度</span>
                  <span className={status.text}>
                    {progress} / {quest.target}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-space-800 overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 ${
                      state.status === 'claimed'
                        ? 'bg-neon-green'
                        : isClaimable
                        ? 'bg-neon-yellow shadow-neon-yellow'
                        : 'bg-neon-cyan'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="divider-glow" />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">奖励：</span>
                  <span className="chip text-neon-yellow border-neon-yellow/40 bg-neon-yellow/10">
                    💰 {quest.rewardCredits.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {quest.rewardDescription}
                  </span>
                </div>

                {isClaimable ? (
                  <button
                    onClick={() => claimQuest(quest.id)}
                    className="btn-gold"
                  >
                    <span>领取奖励</span>
                    <span>🎁</span>
                  </button>
                ) : state.status === 'claimed' ? (
                  <span className="text-sm text-neon-green font-orbitron font-semibold">
                    ✓ 已领取
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestPanel;
