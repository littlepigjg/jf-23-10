import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { getPlanet, PLANETS } from '../data/planets';
import {
  findOptimalTradeRoutes,
  formatReturnRate,
  getReturnRateColor,
  getRouteRankLabel,
} from '../utils/tradeRoute/optimizer';
import type { TradeRoute, SimulatedLeg } from '../utils/tradeRoute/optimizer';
import { cn } from '../lib/utils';

type SortKey = 'actualROI' | 'actualTotalProfit' | 'profitPerDistance' | 'theoretical';

export default function TradeRoutePanel() {
  const planetPrices = useGameStore((s) => s.planetPrices);
  const credits = useGameStore((s) => s.credits);
  const cargoCapacity = useGameStore((s) => s.ship.cargoCapacity);

  const [sortKey, setSortKey] = React.useState<SortKey>('actualROI');
  const [expandedRoute, setExpandedRoute] = React.useState<string | null>(null);
  const [showInfeasible, setShowInfeasible] = React.useState(false);

  const routes = React.useMemo(() => {
    return findOptimalTradeRoutes(
      planetPrices,
      { startingCash: credits, cargoCapacity },
      { topN: 20, maxCycleLength: 6, sortBy: sortKey === 'theoretical' ? 'theoreticalCompoundReturnRate' : sortKey, includeInfeasible: showInfeasible }
    );
  }, [planetPrices, credits, cargoCapacity, sortKey, showInfeasible]);

  const sortedRoutes = React.useMemo(() => {
    const copy = [...routes];
    copy.sort((a, b) => {
      if (a.isFeasible !== b.isFeasible) return a.isFeasible ? -1 : 1;
      switch (sortKey) {
        case 'actualROI': return b.actualROI - a.actualROI;
        case 'actualTotalProfit': return b.actualTotalProfit - a.actualTotalProfit;
        case 'profitPerDistance': return b.profitPerDistance - a.profitPerDistance;
        case 'theoretical': return b.theoreticalCompoundReturnRate - a.theoreticalCompoundReturnRate;
        default: return b.actualROI - a.actualROI;
      }
    });
    return copy;
  }, [routes, sortKey]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'actualROI', label: '实际投资回报率' },
    { key: 'actualTotalProfit', label: '实际总利润' },
    { key: 'profitPerDistance', label: '距离效率' },
    { key: 'theoretical', label: '理论复利' },
  ];

  const feasibleCount = routes.filter((r) => r.isFeasible).length;
  const infeasibleCount = routes.length - feasibleCount;

  return (
    <div className="flex h-full w-full gap-6 p-6">
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">贸易路线优化</h2>
            <p className="mt-1 text-sm text-slate-400">
              基于当前资金 ₵{credits.toLocaleString()}、货仓 {cargoCapacity} 单位，计算可实际执行的套利路线
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showInfeasible}
                onChange={(e) => setShowInfeasible(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800"
              />
              显示不可行路线
            </label>
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
                <div className="font-medium text-slate-300">真实模拟引擎</div>
                <div className="text-xs">基于您当前的资金和货仓，逐站模拟实际买入卖出</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">货仓容量限制</div>
                <div className="text-xs">每站最多买入 {cargoCapacity} 单位，超额资金无法继续投资</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">资金连续性</div>
                <div className="text-xs">下一站投资 = 上一站卖出所得，严格追踪资金流转</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">实际投资回报率</div>
                <div className="text-xs">实际利润 / 初始投资，不再使用虚高的理论复利</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-white">最优路线概览</h3>
          {sortedRoutes.filter(r => r.isFeasible).length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">最高实际 ROI</span>
                <span className={cn(
                  'font-bold',
                  getReturnRateColor(Math.max(...sortedRoutes.filter(r => r.isFeasible).map(r => r.actualROI)))
                )}>
                  {formatReturnRate(Math.max(...sortedRoutes.filter(r => r.isFeasible).map(r => r.actualROI)))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">最高实际利润</span>
                <span className="font-bold text-emerald-400">
                  ₵{Math.max(...sortedRoutes.filter(r => r.isFeasible).map(r => r.actualTotalProfit)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">可行路线</span>
                <span className="font-bold text-emerald-400">{feasibleCount} 条</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">不可行路线</span>
                <span className="font-bold text-rose-400">{infeasibleCount} 条</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">平均站数</span>
                <span className="font-bold text-slate-300">
                  {(sortedRoutes.reduce((s, r) => s + r.routeLength, 0) / sortedRoutes.length).toFixed(1)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">暂无可行路线</div>
          )}
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 backdrop-blur-sm">
          <h3 className="mb-2 text-lg font-bold text-amber-400">⚠ 为什么收益比理论低？</h3>
          <div className="space-y-2 text-xs text-amber-200/80">
            <p>理论复利假设每站都能用全部资金无限买入，但实际上：</p>
            <ul className="space-y-1 list-disc list-inside text-amber-200/60">
              <li>货仓容量限制了每站买入数量</li>
              <li>多余资金闲置，无法参与下一轮投资</li>
              <li>三四站路线常因中间站资金不足中断</li>
            </ul>
          </div>
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
  const returnColor = getReturnRateColor(route.actualROI);

  const theoreticalVsActual = route.isFeasible
    ? route.theoreticalCompoundReturnRate - route.actualROI
    : 0;

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        !route.isFeasible && 'opacity-50',
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
            rankInfo.color,
            !route.isFeasible && 'opacity-50'
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
            {route.isFeasible ? (
              <>
                <span className="text-emerald-400/70">投资 ₵{route.actualTotalInvestment.toLocaleString()}</span>
                {theoreticalVsActual > 0.05 && (
                  <span className="text-amber-400/70">
                    理论值虚高 +{formatReturnRate(theoreticalVsActual)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-rose-400/70">不可行: {route.infeasibleReason}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            {route.isFeasible ? (
              <>
                <div className={cn('text-lg font-bold', returnColor)}>
                  {formatReturnRate(route.actualROI)}
                </div>
                <div className="text-xs text-emerald-400">
                  利润 ₵{Math.round(route.actualTotalProfit).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 line-through">
                  理论 {formatReturnRate(route.theoreticalCompoundReturnRate)}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-rose-400">
                  不可行
                </div>
                <div className="text-xs text-slate-500 line-through">
                  理论 {formatReturnRate(route.theoreticalCompoundReturnRate)}
                </div>
              </>
            )}
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
          <div className="mb-3 grid grid-cols-4 gap-3 text-center text-xs">
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">初始投资</div>
              <div className="font-bold text-white">₵{route.actualTotalInvestment.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">实际利润</div>
              <div className="font-bold text-emerald-400">₵{Math.round(route.actualTotalProfit).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">实际 ROI</div>
              <div className={cn('font-bold', returnColor)}>{formatReturnRate(route.actualROI)}</div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">理论复利</div>
              <div className="font-bold text-slate-500 line-through">
                {formatReturnRate(route.theoreticalCompoundReturnRate)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {route.simulatedLegs.map((leg, i) => (
              <SimulatedLegCard key={i} leg={leg} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SimulatedLegCard({ leg, index }: { leg: SimulatedLeg; index: number }) {
  const fromPlanet = getPlanet(leg.fromPlanetId);
  const toPlanet = getPlanet(leg.toPlanetId);

  const cashBeforeLeg = leg.cashRemaining + leg.costBasis - leg.saleProceeds;
  const utilizationRate = cashBeforeLeg > 0 ? leg.costBasis / cashBeforeLeg : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
        {index + 1}
      </div>

      <div className="flex items-center gap-2 text-xs min-w-16">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: fromPlanet?.color ?? '#666' }}
        />
        <span className="text-slate-400">{fromPlanet?.name}</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
          <span>{leg.goodIcon}</span>
          <span>×{leg.quantityBought} 买入 ₵{leg.buyPrice}</span>
        </div>
        <div className="flex-1 border-t border-dashed border-slate-700" />
        <div className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
          <span>{leg.goodIcon}</span>
          <span>卖出 ₵{leg.sellPrice}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs min-w-16">
        <span className="text-slate-400">{toPlanet?.name}</span>
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: toPlanet?.color ?? '#666' }}
        />
      </div>

      <div className="shrink-0 text-right min-w-20">
        <div
          className={cn(
            'text-sm font-bold',
            leg.legProfit > 0 ? 'text-emerald-400' : 'text-rose-400'
          )}
        >
          {leg.legProfit > 0 ? '+' : ''}₵{Math.round(leg.legProfit).toLocaleString()}
        </div>
        <div className="text-xs text-slate-500">
          货仓 {leg.cargoUsed} 单位
          {utilizationRate < 0.95 && utilizationRate > 0 && (
            <span className="text-amber-400 ml-1">
              资金利用率 {Math.round(utilizationRate * 100)}%
            </span>
          )}
        </div>
        <div className="text-xs text-slate-600">
          剩余资金 ₵{Math.round(leg.cashRemaining).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function PriceHeatmap({ routes }: { routes: TradeRoute[] }) {
  const bestLegs = React.useMemo(() => {
    const legMap = new Map<string, { from: string; to: string; profit: number; goodIcon: string }>();

    for (const route of routes) {
      if (!route.isFeasible) continue;
      for (const leg of route.simulatedLegs) {
        const key = `${leg.fromPlanetId}->${leg.toPlanetId}`;
        const existing = legMap.get(key);
        if (!existing || leg.legProfit > existing.profit) {
          legMap.set(key, {
            from: leg.fromPlanetId,
            to: leg.toPlanetId,
            profit: leg.legProfit,
            goodIcon: leg.goodIcon,
          });
        }
      }
    }

    return legMap;
  }, [routes]);

  const planets = PLANETS;
  const profits = Array.from(bestLegs.values()).map((l) => l.profit);
  const maxProfit = Math.max(1, ...profits);

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
                    <div className="text-emerald-300">+{Math.round(leg.profit)}</div>
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
