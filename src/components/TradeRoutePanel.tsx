import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { getPlanet, PLANETS } from '../data/planets';
import {
  findOptimalTradeRoutes,
  formatReturnRate,
  getReturnRateColor,
  getRouteRankLabel,
} from '../utils/tradeRouteOptimizer';
import type { TradeRoute } from '../utils/tradeRouteOptimizer';
import { cn } from '../lib/utils';

type SortKey = 'compoundReturnRate' | 'totalProfitPerUnit' | 'profitPerDistance';

export default function TradeRoutePanel() {
  const planetPrices = useGameStore((s) => s.planetPrices);

  const [sortKey, setSortKey] = React.useState<SortKey>('compoundReturnRate');
  const [expandedRoute, setExpandedRoute] = React.useState<string | null>(null);

  const routes = React.useMemo(
    () => findOptimalTradeRoutes(planetPrices, 15),
    [planetPrices]
  );

  const sortedRoutes = React.useMemo(() => {
    const copy = [...routes];
    copy.sort((a, b) => {
      if (sortKey === 'compoundReturnRate') return b.compoundReturnRate - a.compoundReturnRate;
      if (sortKey === 'totalProfitPerUnit') return b.totalProfitPerUnit - a.totalProfitPerUnit;
      return b.profitPerDistance - a.profitPerDistance;
    });
    return copy;
  }, [routes, sortKey]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'compoundReturnRate', label: '复利收益率' },
    { key: 'totalProfitPerUnit', label: '单位总利润' },
    { key: 'profitPerDistance', label: '距离效率' },
  ];

  return (
    <div className="flex h-full w-full gap-6 p-6">
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">贸易路线优化</h2>
            <p className="mt-1 text-sm text-slate-400">
              基于全星系价格差分析，发现利润最高的环形贸易路线
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">排序:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  sortKey === opt.key
                    ? 'bg-cyan-600/20 text-cyan-400 ring-1 ring-cyan-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {sortedRoutes.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/40">
            <div className="text-center">
              <div className="mb-2 text-4xl">📡</div>
              <div className="text-slate-400">暂无盈利贸易路线</div>
              <div className="text-xs text-slate-500">当前市场价格下没有发现可行的环形套利路线</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRoutes.map((route, idx) => (
              <RouteCard
                key={route.id}
                route={route}
                rank={idx}
                isExpanded={expandedRoute === route.id}
                onToggle={() =>
                  setExpandedRoute(expandedRoute === route.id ? null : route.id)
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-80 flex-shrink-0 space-y-4">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-white">算法说明</h3>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">图论建模</div>
                <div className="text-xs">将星球作为节点，商品价差作为边权重建图</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">环形路线搜索</div>
                <div className="text-xs">遍历所有2-6站环形回路，找出最优套利路径</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">复利收益模型</div>
                <div className="text-xs">每站利润再投资，计算完整回路的复合收益率</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">距离效率</div>
                <div className="text-xs">综合考虑航行距离，评估单位距离利润率</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-white">最优路线概览</h3>
          {sortedRoutes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">最优收益率</span>
                <span className={cn('font-bold', getReturnRateColor(sortedRoutes[0].compoundReturnRate))}>
                  {formatReturnRate(sortedRoutes[0].compoundReturnRate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">最高单位利润</span>
                <span className="font-bold text-emerald-400">
                  ₵{Math.max(...sortedRoutes.map((r) => r.totalProfitPerUnit)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">可用路线数</span>
                <span className="font-bold text-slate-300">{sortedRoutes.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">平均站数</span>
                <span className="font-bold text-slate-300">
                  {(sortedRoutes.reduce((s, r) => s + r.routeLength, 0) / sortedRoutes.length).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-white">价差热力图</h3>
          <PriceHeatmap routes={sortedRoutes} />
        </div>
      </div>
    </div>
  );
}

function RouteCard({
  route,
  rank,
  isExpanded,
  onToggle,
}: {
  route: TradeRoute;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const rankInfo = getRouteRankLabel(rank);
  const returnColor = getReturnRateColor(route.compoundReturnRate);

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isExpanded
          ? 'border-cyan-500/40 bg-slate-800/80 shadow-lg shadow-cyan-500/5'
          : 'border-slate-700/50 bg-slate-800/60 hover:border-slate-600/60'
      )}
    >
      <div
        className="flex cursor-pointer items-center gap-4 p-4"
        onClick={onToggle}
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-bold',
            rankInfo.color
          )}
        >
          {rankInfo.label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {route.planets.map((pid, i) => {
              const planet = getPlanet(pid);
              return (
                <React.Fragment key={pid}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: planet?.color ?? '#666' }}
                    />
                    <span className="text-sm font-medium text-white">
                      {route.planetNames[i]}
                    </span>
                  </div>
                  {i < route.planets.length - 1 && (
                    <span className="text-slate-600">→</span>
                  )}
                </React.Fragment>
              );
            })}
            <span className="text-slate-600">→</span>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getPlanet(route.planets[0])?.color ?? '#666' }}
              />
              <span className="text-sm font-medium text-slate-500">
                {route.planetNames[0]}
              </span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span>{route.routeLength}站回路</span>
            <span>距离 {route.totalDistance.toFixed(2)}</span>
            <span>投资 ₵{route.totalInvestment.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <div className={cn('text-lg font-bold', returnColor)}>
              {formatReturnRate(route.compoundReturnRate)}
            </div>
            <div className="text-xs text-slate-500">
              利润 ₵{route.totalProfitPerUnit.toLocaleString()}
            </div>
          </div>
          <div
            className={cn(
              'text-slate-500 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          >
            ▼
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-700/50 px-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            {route.legs.map((leg, i) => {
              const fromPlanet = getPlanet(leg.fromPlanetId);
              const toPlanet = getPlanet(leg.toPlanetId);

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: fromPlanet?.color ?? '#666' }}
                    />
                    <span className="text-slate-400">{fromPlanet?.name}</span>
                  </div>

                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                      <span>{leg.goodIcon}</span>
                      <span>买入 ₵{leg.buyPrice}</span>
                    </div>
                    <div className="flex-1 border-t border-dashed border-slate-700" />
                    <div className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
                      <span>{leg.goodIcon}</span>
                      <span>卖出 ₵{leg.sellPrice}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">{toPlanet?.name}</span>
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: toPlanet?.color ?? '#666' }}
                    />
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={cn(
                        'text-sm font-bold',
                        leg.profitPerUnit > 0 ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {leg.profitPerUnit > 0 ? '+' : ''}₵{leg.profitPerUnit}
                    </div>
                    <div className="text-xs text-slate-500">
                      ×{(leg.returnRate).toFixed(3)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900/30 px-4 py-2.5">
            <div className="flex gap-6 text-xs">
              <div>
                <span className="text-slate-500">复利收益率 </span>
                <span className={cn('font-bold', returnColor)}>
                  {formatReturnRate(route.compoundReturnRate)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">单位总利润 </span>
                <span className="font-bold text-emerald-400">₵{route.totalProfitPerUnit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">距离效率 </span>
                <span className="font-bold text-cyan-300">₵{route.profitPerDistance.toFixed(1)}/单位</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceHeatmap({ routes }: { routes: TradeRoute[] }) {
  const bestLegs = React.useMemo(() => {
    const legMap = new Map<string, { from: string; to: string; profit: number; goodIcon: string }>();

    for (const route of routes) {
      for (const leg of route.legs) {
        const key = `${leg.fromPlanetId}->${leg.toPlanetId}`;
        const existing = legMap.get(key);
        if (!existing || leg.profitPerUnit > existing.profit) {
          legMap.set(key, {
            from: leg.fromPlanetId,
            to: leg.toPlanetId,
            profit: leg.profitPerUnit,
            goodIcon: leg.goodIcon,
          });
        }
      }
    }

    return legMap;
  }, [routes]);

  const planets = PLANETS;
  const maxProfit = Math.max(1, ...Array.from(bestLegs.values()).map((l) => l.profit));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-slate-500">买↓ 卖→</th>
            {planets.map((p) => (
              <th key={p.id} className="p-1 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-400">{p.name.slice(0, 2)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {planets.map((fromP) => (
            <tr key={fromP.id}>
              <td className="p-1">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: fromP.color }} />
                  <span className="text-slate-400">{fromP.name.slice(0, 2)}</span>
                </div>
              </td>
              {planets.map((toP) => {
                if (fromP.id === toP.id) {
                  return (
                    <td key={toP.id} className="p-1 text-center text-slate-700">
                      —
                    </td>
                  );
                }

                const key = `${fromP.id}->${toP.id}`;
                const leg = bestLegs.get(key);

                if (!leg) {
                  return (
                    <td key={toP.id} className="p-1 text-center text-slate-600">
                      ·
                    </td>
                  );
                }

                const intensity = Math.min(1, Math.max(0, leg.profit / maxProfit));
                const bgOpacity = (intensity * 0.3).toFixed(2);

                return (
                  <td
                    key={toP.id}
                    className="p-1 text-center"
                    style={{ backgroundColor: `rgba(16, 185, 129, ${bgOpacity})` }}
                  >
                    <div className="text-emerald-400">{leg.goodIcon}</div>
                    <div className="text-emerald-300">+{leg.profit}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
