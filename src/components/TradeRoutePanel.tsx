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

type SortKey = 'dynamicROI' | 'dynamicTotalProfit' | 'profitPerDistance' | 'staticROI' | 'theoretical';

export default function TradeRoutePanel() {
  const planetPrices = useGameStore((s) => s.planetPrices);
  const marketState = useGameStore((s) => s.marketState);
  const credits = useGameStore((s) => s.credits);
  const cargoCapacity = useGameStore((s) => s.ship.cargoCapacity);

  const [sortKey, setSortKey] = React.useState<SortKey>('dynamicROI');
  const [expandedRoute, setExpandedRoute] = React.useState<string | null>(null);
  const [showInfeasible, setShowInfeasible] = React.useState(false);

  const routes = React.useMemo(() => {
    return findOptimalTradeRoutes(
      planetPrices,
      { startingCash: credits, cargoCapacity },
      marketState,
      {
        topN: 20,
        maxCycleLength: 6,
        sortBy:
          sortKey === 'theoretical'
            ? 'theoreticalCompoundReturnRate'
            : sortKey === 'staticROI'
            ? 'staticROI'
            : sortKey,
        includeInfeasible: showInfeasible,
        deterministicSeed: 42,
      }
    );
  }, [planetPrices, marketState, credits, cargoCapacity, sortKey, showInfeasible]);

  const sortedRoutes = React.useMemo(() => {
    const copy = [...routes];
    copy.sort((a, b) => {
      if (a.isFeasible !== b.isFeasible) return a.isFeasible ? -1 : 1;
      switch (sortKey) {
        case 'dynamicROI':
          return b.dynamicROI - a.dynamicROI;
        case 'dynamicTotalProfit':
          return b.dynamicTotalProfit - a.dynamicTotalProfit;
        case 'profitPerDistance':
          return b.profitPerDistance - a.profitPerDistance;
        case 'staticROI':
          return b.actualROI - a.actualROI;
        case 'theoretical':
          return b.theoreticalCompoundReturnRate - a.theoreticalCompoundReturnRate;
        default:
          return b.dynamicROI - a.dynamicROI;
      }
    });
    return copy;
  }, [routes, sortKey]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'dynamicROI', label: '动态 ROI（推荐）' },
    { key: 'dynamicTotalProfit', label: '动态总利润' },
    { key: 'staticROI', label: '静态 ROI' },
    { key: 'profitPerDistance', label: '距离效率' },
    { key: 'theoretical', label: '理论复利' },
  ];

  const feasibleCount = routes.filter((r) => r.isFeasible).length;
  const infeasibleCount = routes.length - feasibleCount;
  const feasibleRoutes = routes.filter((r) => r.isFeasible);

  const avgDynamicROI =
    feasibleRoutes.length > 0
      ? feasibleRoutes.reduce((s, r) => s + r.dynamicROI, 0) / feasibleRoutes.length
      : 0;
  const avgStaticROI =
    feasibleRoutes.length > 0
      ? feasibleRoutes.reduce((s, r) => s + r.actualROI, 0) / feasibleRoutes.length
      : 0;
  const optimismBias = avgStaticROI - avgDynamicROI;

  return (
    <div className="flex h-full w-full gap-6 p-6">
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">贸易路线优化</h2>
            <p className="mt-1 text-sm text-slate-400">
              基于动态价格模拟 — 考虑买卖冲击、旅行时间波动，给出可实际执行的收益预估
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
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition whitespace-nowrap',
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

        {optimismBias > 0.03 && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <span className="text-xl">⚠️</span>
            <div className="text-sm">
              <div className="font-medium text-amber-400">静态预测普遍偏高</div>
              <div className="mt-1 text-amber-200/70">
                平均静态 ROI {formatReturnRate(avgStaticROI)} vs 动态 ROI{' '}
                {formatReturnRate(avgDynamicROI)}，
                静态预测平均虚高 {formatReturnRate(optimismBias)}。
                三四站以上路线价差随交易和时间波动显著，请以动态 ROI 为准。
              </div>
            </div>
          </div>
        )}

        {sortedRoutes.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/40">
            <div className="text-center">
              <div className="mb-2 text-4xl">📡</div>
              <div className="text-slate-400">暂无盈利贸易路线</div>
              <div className="text-xs text-slate-500">
                当前市场价格下没有发现可行的环形套利路线
              </div>
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
          <h3 className="mb-3 text-lg font-bold text-white">动态模拟引擎</h3>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">买卖价格冲击</div>
                <div className="text-xs">买入推高供给需求 → 价格上涨；卖出反之，完全复刻游戏内机制</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">旅行时间波动</div>
                <div className="text-xs">每段旅程触发市场 tick，供需回归自然值 + 随机扰动</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">连锁效应</div>
                <div className="text-xs">前面交易影响的价格会持续作用于后续所有站点</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-cyan-400">◈</span>
              <div>
                <div className="font-medium text-slate-300">确定性模拟</div>
                <div className="text-xs">使用固定种子保证结果可重复，便于对比不同路线</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-white">最优路线概览</h3>
          {feasibleRoutes.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">最高动态 ROI</span>
                <span
                  className={cn(
                    'font-bold',
                    getReturnRateColor(Math.max(...feasibleRoutes.map((r) => r.dynamicROI)))
                  )}
                >
                  {formatReturnRate(Math.max(...feasibleRoutes.map((r) => r.dynamicROI)))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">最高动态利润</span>
                <span className="font-bold text-emerald-400">
                  ₵{Math.max(...feasibleRoutes.map((r) => r.dynamicTotalProfit)).toLocaleString()}
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
                  {(feasibleRoutes.reduce((s, r) => s + r.routeLength, 0) / feasibleRoutes.length).toFixed(1)}
                </span>
              </div>
              <div className="border-t border-slate-700/50 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">静态 ROI 平均</span>
                  <span className={cn('font-bold', getReturnRateColor(avgStaticROI))}>
                    {formatReturnRate(avgStaticROI)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">动态 ROI 平均</span>
                  <span className={cn('font-bold', getReturnRateColor(avgDynamicROI))}>
                    {formatReturnRate(avgDynamicROI)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">静态高估</span>
                  <span
                    className={cn(
                      'font-bold',
                      optimismBias > 0.03 ? 'text-amber-400' : 'text-slate-400'
                    )}
                  >
                    {optimismBias >= 0 ? '+' : ''}
                    {formatReturnRate(optimismBias)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">暂无可行路线</div>
          )}
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 backdrop-blur-sm">
          <h3 className="mb-2 text-lg font-bold text-rose-400">⚠ 为什么动态 ROI 更低？</h3>
          <div className="space-y-2 text-xs text-rose-200/80">
            <ul className="space-y-1 list-disc list-inside">
              <li>大量买入立即推高买入价，实际成本高于静态报价</li>
              <li>大量卖出立即压低卖出价，实际收入低于预期</li>
              <li>旅行途中市场自然波动，价差可能收窄甚至反转</li>
              <li>前面站点操作改变的价格会持续影响后续所有交易</li>
              <li>长路线（4站+）波动累积效应极其显著</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-white">价差热力图</h3>
          <PriceHeatmap routes={feasibleRoutes} />
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
  const dynamicReturnColor = getReturnRateColor(route.dynamicROI);

  const dynamicVsStatic = route.dynamicROI - route.actualROI;
  const hasSignificantDrop = Math.abs(dynamicVsStatic) > 0.03;

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
                  {i < route.planets.length - 1 && <span className="text-slate-600">→</span>}
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
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{route.routeLength}站回路</span>
            <span>距离 {route.totalDistance.toFixed(2)}</span>
            <span>总 ticks {route.totalTravelTicks}</span>
            {route.isFeasible ? (
              <>
                <span className="text-emerald-400/70">
                  投资 ₵{route.dynamicTotalInvestment.toLocaleString()}
                </span>
                {hasSignificantDrop && (
                  <span className="text-amber-400/70">
                    动态比静态 {formatReturnRate(dynamicVsStatic)}
                  </span>
                )}
                {route.priceDropWarning && (
                  <span className="text-rose-400/70">⚠ {route.priceDropWarning}</span>
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
                <div className={cn('text-lg font-bold', dynamicReturnColor)}>
                  {formatReturnRate(route.dynamicROI)}
                </div>
                <div className="text-xs text-emerald-400">
                  利润 ₵{Math.round(route.dynamicTotalProfit).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  <span className="line-through">静态 {formatReturnRate(route.actualROI)}</span>
                  <span className="mx-1">·</span>
                  <span className="line-through">
                    理论 {formatReturnRate(route.theoreticalCompoundReturnRate)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-rose-400">不可行</div>
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
          <div className="mb-3 grid grid-cols-5 gap-3 text-center text-xs">
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">初始投资</div>
              <div className="font-bold text-white">
                ₵{route.dynamicTotalInvestment.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">动态利润</div>
              <div className="font-bold text-emerald-400">
                ₵{Math.round(route.dynamicTotalProfit).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">动态 ROI</div>
              <div className={cn('font-bold', dynamicReturnColor)}>
                {formatReturnRate(route.dynamicROI)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2">
              <div className="text-slate-500">静态 ROI</div>
              <div className="font-bold text-slate-500 line-through">
                {formatReturnRate(route.actualROI)}
              </div>
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

  const buyImpactPositive = leg.priceImpactOnBuy > 0;
  const sellImpactNegative = leg.priceImpactOnSell < 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900/50 p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
        {index + 1}
      </div>

      <div className="flex items-center gap-2 text-xs min-w-20">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: fromPlanet?.color ?? '#666' }}
        />
        <span className="text-slate-400">{fromPlanet?.name}</span>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
          <span>{leg.goodIcon}</span>
          <span>
            ×{leg.quantityBought} @₵{leg.buyPrice}
          </span>
          {buyImpactPositive && (
            <span className="text-rose-400 ml-1" title={`买入后价格上涨 ₵${leg.priceImpactOnBuy}`}>
              ▲₵{leg.priceImpactOnBuy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>SD {leg.sdBeforeBuy.toFixed(2)}→{leg.sdAfterBuy.toFixed(2)}</span>
        </div>
        <div className="flex-1 min-w-8 border-t border-dashed border-slate-700" />
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>⏱ {leg.travelTicks} ticks</span>
        </div>
        <div className="flex-1 min-w-8 border-t border-dashed border-slate-700" />
        <div className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
          <span>{leg.goodIcon}</span>
          <span>@₵{leg.sellPrice}</span>
          {sellImpactNegative && (
            <span className="text-rose-500 ml-1" title={`卖出后价格下跌 ₵${Math.abs(leg.priceImpactOnSell)}`}>
              ▼₵{Math.abs(leg.priceImpactOnSell)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>SD {leg.sdBeforeSell.toFixed(2)}→{leg.sdAfterSell.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs min-w-20">
        <span className="text-slate-400">{toPlanet?.name}</span>
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: toPlanet?.color ?? '#666' }}
        />
      </div>

      <div className="shrink-0 text-right min-w-28">
        <div
          className={cn(
            'text-sm font-bold',
            leg.legProfit > 0 ? 'text-emerald-400' : leg.legProfit < 0 ? 'text-rose-400' : 'text-slate-400'
          )}
        >
          {leg.legProfit > 0 ? '+' : ''}₵{Math.round(leg.legProfit).toLocaleString()}
        </div>
        <div className="text-xs text-slate-500">
          货仓 {leg.cargoUsed}
          {utilizationRate < 0.95 && utilizationRate > 0 && (
            <span className="text-amber-400 ml-1">利用率{Math.round(utilizationRate * 100)}%</span>
          )}
        </div>
        <div className="text-xs text-slate-600">
          剩余 ₵{Math.round(leg.cashRemaining).toLocaleString()}
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
  const maxProfit = Math.max(1, ...profits.filter(p => p > 0));
  const minLoss = Math.min(0, ...profits.filter(p => p < 0));

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

                const isProfit = leg.profit >= 0;
                const intensity = isProfit
                  ? Math.min(1, leg.profit / maxProfit)
                  : Math.min(1, Math.abs(leg.profit - minLoss) / Math.max(1, Math.abs(minLoss)));
                const bgOpacity = (intensity * 0.3).toFixed(2);
                const bgColor = isProfit
                  ? `rgba(16, 185, 129, ${bgOpacity})`
                  : `rgba(244, 63, 94, ${bgOpacity})`;

                return (
                  <td
                    key={toP.id}
                    className="p-1 text-center"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                      {leg.goodIcon}
                    </div>
                    <div className={isProfit ? 'text-emerald-300' : 'text-rose-300'}>
                      {isProfit ? '+' : ''}
                      {Math.round(leg.profit)}
                    </div>
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
