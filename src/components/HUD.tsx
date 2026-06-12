import { useGameStore } from '../store/useGameStore';
import { getPlanet } from '../data/planets';

export default function HUD() {
  const credits = useGameStore((s) => s.credits);
  const ship = useGameStore((s) => s.ship);
  const cargo = useGameStore((s) => s.cargo);
  const currentPlanetId = useGameStore((s) => s.currentPlanetId);
  const statistics = useGameStore((s) => s.statistics);

  const planet = getPlanet(currentPlanetId);
  const cargoUsed = cargo.reduce((sum, c) => sum + c.quantity, 0);
  const shieldPercent = (ship.currentShield / ship.maxShield) * 100;

  const shieldColor =
    shieldPercent > 60
      ? 'bg-neon-cyan'
      : shieldPercent > 30
      ? 'bg-neon-yellow'
      : 'bg-neon-red';

  const cargoPercent = (cargoUsed / ship.cargoCapacity) * 100;
  const cargoColor =
    cargoPercent > 90
      ? 'bg-neon-red'
      : cargoPercent > 70
      ? 'bg-neon-orange'
      : 'bg-neon-green';

  return (
    <div className="w-full h-[60px] panel flex items-center px-4 gap-6 flex-shrink-0">
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span className="font-orbitron font-bold text-neon-yellow text-glow-yellow text-sm">
            ₵{credits.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2 w-40">
          <span className="text-sm">🛡️</span>
          <div className="flex-1 h-3 rounded-full bg-space-800 border border-white/10 overflow-hidden">
            <div
              className={`h-full ${shieldColor} transition-all duration-300`}
              style={{ width: `${shieldPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-300 w-14 text-right tabular-nums">
            {ship.currentShield}/{ship.maxShield}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">📦</span>
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-3 rounded-full bg-space-800 border border-white/10 overflow-hidden">
              <div
                className={`h-full ${cargoColor} transition-all duration-300`}
                style={{ width: `${cargoPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 tabular-nums">
              {cargoUsed}/{ship.cargoCapacity}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">⚔️</span>
          <span className="text-xs font-mono text-slate-300">
            击败海盗 <span className="text-neon-orange font-semibold">{statistics.piratesDefeated}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 px-4">
        <span className="text-sm">📍</span>
        <span className="font-orbitron font-semibold text-neon-cyan text-sm text-glow-cyan tracking-wide">
          {planet?.name ?? '未知星域'}
        </span>
      </div>

      <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
          </span>
          <span>存档已自动保存</span>
        </div>
      </div>
    </div>
  );
}
