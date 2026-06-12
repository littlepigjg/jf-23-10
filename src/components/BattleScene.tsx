import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { createInitialBattleState, updateBattle } from '../utils/battleEngine';
import type { BattleState } from '../types/game';

interface BattleSceneProps {
  difficulty: number;
  onFinish: (won: boolean) => void;
}

const CANVAS_W = 800;
const CANVAS_H = 500;

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export default function BattleScene({ difficulty, onFinish }: BattleSceneProps) {
  const ship = useGameStore((s) => s.ship);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const battleStateRef = useRef<BattleState>(
    createInitialBattleState(ship.currentShield, ship.damage, difficulty)
  );
  const shootCooldownRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const finishTimerRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 30 + 10,
        brightness: Math.random() * 0.6 + 0.4,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) ||
        e.code === 'Space'
      ) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (state: BattleState) => {
      ctx.save();

      if (state.shakeTime > 0) {
        const intensity = state.shakeTime * 20;
        ctx.translate(
          (Math.random() - 0.5) * intensity,
          (Math.random() - 0.5) * intensity
        );
      }

      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.5, '#0d1030');
      gradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (const star of starsRef.current) {
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const particle of state.particles) {
        const alpha = particle.life / particle.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      for (const bullet of state.bullets) {
        const color = bullet.isPlayer ? '#22d3ee' : '#fb923c';
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = color;
        ctx.fillRect(-8, -2, 16, 4);
        ctx.restore();
      }
      ctx.shadowBlur = 0;

      for (const pirate of state.pirates) {
        ctx.save();
        ctx.translate(pirate.x, pirate.y);
        ctx.rotate(pirate.angle);

        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-14, -12);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-14, 12);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, -6);
        ctx.lineTo(-4, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        const hpRatio = Math.max(0, pirate.hp / pirate.maxHp);
        ctx.fillStyle = '#374151';
        ctx.fillRect(pirate.x - 20, pirate.y - 28, 40, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pirate.x - 20, pirate.y - 28, 40 * hpRatio, 5);
      }

      const player = state.player;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-14, -5);
        ctx.lineTo(-22 - Math.random() * 8, 0);
        ctx.lineTo(-14, 5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-16, -14);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-16, 14);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-4, -7);
      ctx.lineTo(-4, 7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(2, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();
    };

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      const result = updateBattle(
        battleStateRef.current,
        keysRef.current,
        dt,
        CANVAS_W,
        CANVAS_H,
        ship.damage,
        shootCooldownRef.current
      );

      battleStateRef.current = result.state;
      shootCooldownRef.current = result.shootCooldown;

      for (const star of starsRef.current) {
        star.x -= star.speed * dt;
        if (star.x < 0) {
          star.x = CANVAS_W;
          star.y = Math.random() * CANVAS_H;
        }
      }

      render(result.state);
      forceRender((n) => n + 1);

      if (result.state.result === 'win' || result.state.result === 'lose') {
        if (finishTimerRef.current === null) {
          finishTimerRef.current = window.setTimeout(() => {
            onFinish(result.state.result === 'win');
          }, 2000);
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (finishTimerRef.current !== null) {
        clearTimeout(finishTimerRef.current);
      }
    };
  }, [ship.damage, onFinish]);

  const state = battleStateRef.current;
  const playerHpRatio = Math.max(0, state.player.hp / state.player.maxHp);
  const piratesTotalHp = state.pirates.reduce((sum, p) => sum + p.hp, 0);
  const piratesTotalMaxHp = state.pirates.reduce((sum, p) => sum + p.maxHp, 0) || 1;
  const piratesHpRatio = piratesTotalHp / piratesTotalMaxHp;

  const countdownValue = Math.ceil(state.countdown);

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-slate-950">
      <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-lg border-2 border-slate-700 shadow-2xl shadow-blue-900/30"
        />

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
          <div className="w-64">
            <div className="text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">
              玩家护盾
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-200 rounded-full"
                style={{ width: `${playerHpRatio * 100}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {Math.max(0, Math.ceil(state.player.hp))} / {state.player.maxHp}
            </div>
          </div>

          <div className="w-64 text-right">
            <div className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wider">
              海盗总血量 ({state.pirates.length})
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-200 rounded-full ml-auto"
                style={{ width: `${piratesHpRatio * 100}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {Math.max(0, Math.ceil(piratesTotalHp))} / {piratesTotalMaxHp}
            </div>
          </div>
        </div>

        {state.countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] animate-pulse">
                {countdownValue > 0 ? countdownValue : '开始!'}
              </div>
              <div className="text-2xl font-bold text-blue-300 mt-4">准备战斗</div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700 text-sm text-slate-300">
            <span className="text-cyan-400 font-mono">↑↓←→ / WASD</span> 移动 ·{' '}
            <span className="text-orange-400 font-mono">空格</span> 射击
          </div>
        </div>

        {state.result === 'win' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-lg">
            <div className="text-center pointer-events-auto">
              <div className="text-6xl font-black text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)] mb-4">
                胜利!
              </div>
              <div className="text-xl text-slate-300 mb-6">你击败了所有海盗!</div>
              <button
                onClick={() => onFinish(true)}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/50 hover:scale-105"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {state.result === 'lose' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-lg">
            <div className="text-center pointer-events-auto">
              <div className="text-6xl font-black text-red-400 drop-shadow-[0_0_30px_rgba(248,113,113,0.6)] mb-4">
                失败
              </div>
              <div className="text-xl text-slate-300 mb-6">你的飞船被击毁了...</div>
              <button
                onClick={() => onFinish(false)}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-900/50 hover:scale-105"
              >
                返回
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
