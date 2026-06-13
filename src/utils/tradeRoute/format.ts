export const formatReturnRate = (rate: number): string => {
  return `${(rate * 100).toFixed(1)}%`;
};

export const getReturnRateColor = (rate: number): string => {
  if (rate > 0.3) return 'text-emerald-400';
  if (rate > 0.15) return 'text-emerald-300';
  if (rate > 0.05) return 'text-cyan-300';
  if (rate > 0) return 'text-slate-300';
  return 'text-rose-400';
};

export const getRouteRankLabel = (index: number): { label: string; color: string } => {
  if (index === 0) return { label: '最优', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' };
  if (index === 1) return { label: '次优', color: 'text-slate-300 border-slate-400/30 bg-slate-400/10' };
  if (index === 2) return { label: '第三', color: 'text-amber-600 border-amber-600/30 bg-amber-600/10' };
  return { label: `#${index + 1}`, color: 'text-slate-500 border-slate-600/30 bg-slate-600/10' };
};
