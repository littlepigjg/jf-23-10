import { useGameStore } from '../store/useGameStore';
import {
  SHIELD_UPGRADES,
  CARGO_UPGRADES,
  WEAPON_UPGRADES,
  getShieldAtLevel,
  getCargoAtLevel,
  getDamageAtLevel,
} from '../data/upgrades';

const UpgradePanel = () => {
  const {
    credits,
    ship,
    upgradeShield,
    upgradeCargo,
    upgradeWeapon,
    repairShield,
  } = useGameStore();

  const shieldMissing = ship.maxShield - ship.currentShield;
  const repairCost = shieldMissing * 2;
  const showRepair = shieldMissing > 0;

  const shieldNext = ship.shieldLevel < SHIELD_UPGRADES.length
    ? SHIELD_UPGRADES[ship.shieldLevel]
    : null;
  const cargoNext = ship.cargoLevel < CARGO_UPGRADES.length
    ? CARGO_UPGRADES[ship.cargoLevel]
    : null;
  const weaponNext = ship.weaponLevel < WEAPON_UPGRADES.length
    ? WEAPON_UPGRADES[ship.weaponLevel]
    : null;

  const upgrades = [
    {
      icon: '🛡️',
      title: '护盾',
      level: ship.shieldLevel,
      currentValue: ship.maxShield,
      nextValue: shieldNext ? getShieldAtLevel(ship.shieldLevel + 1) : null,
      nextCost: shieldNext?.cost ?? null,
      onUpgrade: upgradeShield,
      color: 'cyan',
    },
    {
      icon: '📦',
      title: '货仓',
      level: ship.cargoLevel,
      currentValue: ship.cargoCapacity,
      nextValue: cargoNext ? getCargoAtLevel(ship.cargoLevel + 1) : null,
      nextCost: cargoNext?.cost ?? null,
      onUpgrade: upgradeCargo,
      color: 'yellow',
    },
    {
      icon: '⚔️',
      title: '武器',
      level: ship.weaponLevel,
      currentValue: ship.damage,
      nextValue: weaponNext ? getDamageAtLevel(ship.weaponLevel + 1) : null,
      nextCost: weaponNext?.cost ?? null,
      onUpgrade: upgradeWeapon,
      color: 'orange',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'cyan':
        return {
          text: 'text-neon-cyan',
          border: 'border-neon-cyan/60',
          bg: 'bg-neon-cyan',
          glow: 'shadow-neon-cyan',
          btn: 'btn-neon',
        };
      case 'yellow':
        return {
          text: 'text-neon-yellow',
          border: 'border-neon-yellow/60',
          bg: 'bg-neon-yellow',
          glow: 'shadow-neon-yellow',
          btn: 'btn-gold',
        };
      case 'orange':
        return {
          text: 'text-neon-orange',
          border: 'border-neon-orange/60',
          bg: 'bg-neon-orange',
          glow: 'shadow-neon-orange',
          btn: 'btn-warn',
        };
      default:
        return {
          text: 'text-neon-cyan',
          border: 'border-neon-cyan/60',
          bg: 'bg-neon-cyan',
          glow: 'shadow-neon-cyan',
          btn: 'btn-neon',
        };
    }
  };

  const renderUpgradeCard = (upgrade: typeof upgrades[0]) => {
    const c = getColorClasses(upgrade.color);
    const progress = (upgrade.level / 10) * 100;
    const isMax = upgrade.level >= 10;
    const canAfford = upgrade.nextCost !== null && credits >= upgrade.nextCost;

    return (
      <div className="panel corner-deco p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{upgrade.icon}</span>
            <h3 className={`font-orbitron text-xl font-bold ${c.text} text-glow-${upgrade.color}`}>
              {upgrade.title}
            </h3>
          </div>
          <span className={`chip ${c.text} ${c.border}`}>
            Lv.{upgrade.level}/10
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>等级进度</span>
            <span>{upgrade.level}/10</span>
          </div>
          <div className="h-3 rounded-full bg-space-800 overflow-hidden border border-white/5">
            <div
              className={`h-full ${c.bg} transition-all duration-500 ${c.glow}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="rounded-md bg-space-800/60 p-3 border border-white/5">
            <div className="text-xs text-slate-400 mb-1">当前值</div>
            <div className={`font-orbitron text-lg font-bold ${c.text}`}>
              {upgrade.currentValue}
            </div>
          </div>
          <div className="rounded-md bg-space-800/60 p-3 border border-white/5">
            <div className="text-xs text-slate-400 mb-1">下一级</div>
            <div className={`font-orbitron text-lg font-bold ${isMax ? 'text-slate-500' : c.text}`}>
              {upgrade.nextValue ?? '—'}
            </div>
          </div>
        </div>

        <div className="divider-glow" />

        <button
          onClick={upgrade.onUpgrade}
          disabled={isMax || !canAfford}
          className={`${c.btn} w-full`}
        >
          {isMax ? (
            <span>已满级</span>
          ) : (
            <>
              <span>升级</span>
              <span className="text-sm opacity-80">💰 {upgrade.nextCost}</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="title-section">🚀 飞船升级</h2>
        <span className="chip text-neon-yellow border-neon-yellow/40 font-orbitron">
          💰 {credits.toLocaleString()} 金币
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {upgrades.map((u) => (
          <div key={u.title}>{renderUpgradeCard(u)}</div>
        ))}
      </div>

      {showRepair && (
        <div className="panel-warn p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <div className="font-orbitron font-semibold text-neon-orange text-glow-orange">
                护盾受损
              </div>
              <div className="text-sm text-slate-400">
                当前护盾 {ship.currentShield} / {ship.maxShield}（缺失 {shieldMissing} 点）
              </div>
            </div>
          </div>
          <button
            onClick={repairShield}
            disabled={credits < repairCost}
            className="btn-warn"
          >
            <span>修复护盾</span>
            <span className="text-sm opacity-80">💰 {repairCost}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UpgradePanel;
