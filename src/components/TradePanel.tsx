import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { GOODS } from '../data/goods';
import { getPlanet } from '../data/planets';
import { describeTrend, describeSD } from '../utils/priceEngine';
import { cn } from '../lib/utils';

export default function TradePanel() {
  const {
    credits,
    currentPlanetId,
    planetPrices,
    cargo,
    ship,
    marketState,
    buyGood,
    sellGood,
    getCargoUsed,
  } = useGameStore();

  const [quantities, setQuantities] = React.useState<Record<string, number>>(
    () => Object.fromEntries(GOODS.map((g) => [g.id, 1]))
  );

  const planet = getPlanet(currentPlanetId);
  const currentPrices = planetPrices[currentPlanetId] || {};
  const cargoUsed = getCargoUsed();
  const cargoCapacity = ship.cargoCapacity;
  const cargoPercent = (cargoUsed / cargoCapacity) * 100;

  const setQuantity = (goodId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [goodId]: Math.max(1, value) }));
  };

  const getMaxBuy = (goodId: string) => {
    const price = currentPrices[goodId];
    if (!price) return 0;
    const byCredits = Math.floor(credits / price);
    const byCargo = cargoCapacity - cargoUsed;
    return Math.max(0, Math.min(byCredits, byCargo));
  };

  const getMaxSell = (goodId: string) => {
    const item = cargo.find((c) => c.goodId === goodId);
    return item?.quantity || 0;
  };

  const handleBuy = (goodId: string) => {
    const qty = quantities[goodId] || 1;
    buyGood(goodId, qty);
  };

  const handleSell = (goodId: string) => {
    const qty = quantities[goodId] || 1;
    sellGood(goodId, qty);
  };

  const handleQuickSell = (goodId: string) => {
    sellGood(goodId, 1);
  };

  const getPriceColor = (current: number, base: number) => {
    if (current > base) return 'text-red-400';
    if (current < base) return 'text-emerald-400';
    return 'text-slate-300';
  };

  const getPriceArrow = (current: number, base: number) => {
    if (current > base) return '↑';
    if (current < base) return '↓';
    return '→';
  };

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (cargoPercent / 100) * circumference;

  const getTrendInfo = (goodId: string) => {
    const trendValue = marketState.globalTrends[goodId]?.value ?? 0;
    return describeTrend(trendValue);
  };

  const getSDInfo = (goodId: string) => {
    const sdValue = marketState.planetSupplyDemand[currentPlanetId]?.[goodId] ?? 0;
    return describeSD(sdValue);
  };

  return (
    <div className="flex h-full w-full gap-6 p-6">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">星际贸易市场</h2>
          <div className="rounded-lg bg-yellow-500/10 px-4 py-2 text-yellow-400">
            <span className="text-sm opacity-80">信用点</span>
            <span className="ml-2 text-xl font-bold">₵{credits.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {GOODS.map((good) => {
            const price = currentPrices[good.id] || good.basePrice;
            const qty = quantities[good.id] || 1;
            const maxBuy = getMaxBuy(good.id);
            const maxSell = getMaxSell(good.id);
            const colorClass = getPriceColor(price, good.basePrice);
            const arrow = getPriceArrow(price, good.basePrice);
            const owned = cargo.find((c) => c.goodId === good.id)?.quantity || 0;
            const canBuy = maxBuy >= qty;
            const canSell = maxSell >= qty;
            const trendInfo = getTrendInfo(good.id);
            const sdInfo = getSDInfo(good.id);

            return (
              <div
                key={good.id}
                className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 backdrop-blur-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{good.icon}</div>
                    <div>
                      <div className="font-semibold text-white">{good.name}</div>
                      <div className="text-xs text-slate-400">持有: {owned}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-lg font-bold', colorClass)}>
                      <span className="mr-1">{arrow}</span>
                      ₵{price.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      基准 ₵{good.basePrice}
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2 text-xs">
                  <span className={cn('rounded px-1.5 py-0.5', trendInfo.color, 'bg-white/5')}>
                    {trendInfo.label}
                  </span>
                  <span className={cn('rounded px-1.5 py-0.5', sdInfo.color, 'bg-white/5')}>
                    {sdInfo.label}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(good.id, 1)}
                    className="rounded-md bg-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-600"
                  >
                    1
                  </button>
                  <button
                    onClick={() => setQuantity(good.id, 10)}
                    className="rounded-md bg-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-600"
                  >
                    10
                  </button>
                  <button
                    onClick={() => setQuantity(good.id, Math.max(1, maxBuy))}
                    className="rounded-md bg-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-600"
                  >
                    MAX
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) =>
                      setQuantity(good.id, parseInt(e.target.value) || 1)
                    }
                    className="w-20 rounded-md border border-slate-600 bg-slate-900 px-3 py-1 text-right text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleBuy(good.id)}
                    disabled={!canBuy}
                    className={cn(
                      'flex-1 rounded-lg py-2 font-semibold text-white transition',
                      canBuy
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'cursor-not-allowed bg-slate-700 opacity-50'
                    )}
                  >
                    买入 ₵{(price * qty).toLocaleString()}
                  </button>
                  <button
                    onClick={() => handleSell(good.id)}
                    disabled={!canSell}
                    className={cn(
                      'flex-1 rounded-lg py-2 font-semibold text-white transition',
                      canSell
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'cursor-not-allowed bg-slate-700 opacity-50'
                    )}
                  >
                    卖出 ₵{(price * qty).toLocaleString()}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-80 flex-shrink-0 space-y-4">
        {planet && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full shadow-lg"
                style={{
                  backgroundColor: planet.color,
                  boxShadow: `0 0 20px ${planet.color}40`,
                }}
              />
              <div>
                <h3 className="text-lg font-bold text-white">{planet.name}</h3>
                <div className="text-xs capitalize text-slate-400">
                  {planet.type === 'home' && '母星'}
                  {planet.type === 'resource' && '资源星'}
                  {planet.type === 'industrial' && '工业星'}
                  {planet.type === 'trade' && '贸易港'}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              {planet.description}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-white">货仓状态</h3>
          <div className="mb-4 flex items-center justify-center">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={cargoPercent > 90 ? '#f43f5e' : cargoPercent > 70 ? '#f59e0b' : '#10b981'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-white">{cargoUsed}</div>
                <div className="text-xs text-slate-400">/ {cargoCapacity}</div>
              </div>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                cargoPercent > 90
                  ? 'bg-rose-500'
                  : cargoPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              )}
              style={{ width: `${cargoPercent}%` }}
            />
          </div>
          <div className="mt-2 text-center text-sm text-slate-400">
            使用率 {cargoPercent.toFixed(1)}%
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-white">当前存货</h3>
          {cargo.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              货仓空空如也
            </div>
          ) : (
            <div className="space-y-2">
              {cargo.map((item) => {
                const good = GOODS.find((g) => g.id === item.goodId);
                if (!good) return null;
                const currentPrice = currentPrices[item.goodId] || good.basePrice;
                const profit = currentPrice - item.avgCost;
                const profitClass = profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-rose-400' : 'text-slate-400';

                return (
                  <div
                    key={item.goodId}
                    onClick={() => handleQuickSell(item.goodId)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-slate-900/50 p-3 transition hover:border-rose-500/30 hover:bg-slate-900/80"
                    title="点击快速卖出1个"
                  >
                    <div className="text-2xl">{good.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white truncate">{good.name}</span>
                        <span className="text-sm font-bold text-slate-300">×{item.quantity}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">均价 ₵{item.avgCost}</span>
                        <span className={profitClass}>
                          {profit > 0 ? '+' : ''}₵{profit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
