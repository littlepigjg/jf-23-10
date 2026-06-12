import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { MarketService } from '@/services/marketService';

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

export default function MainMenu() {
  const navigate = useNavigate();
  const { newGame, loadGame, clearSave, hasSave } = useGameStore();

  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = [];
    for (let i = 0; i < 120; i++) {
      arr.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes titleGlow {
        0%, 100% {
          background-position: 0% 50%;
          filter: drop-shadow(0 0 8px rgba(0,229,255,0.6)) drop-shadow(0 0 20px rgba(124,58,237,0.4));
        }
        50% {
          background-position: 100% 50%;
          filter: drop-shadow(0 0 16px rgba(0,229,255,0.9)) drop-shadow(0 0 40px rgba(124,58,237,0.6));
        }
      }
      @keyframes twinkle {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
      }
      @keyframes shipFloat {
        0%, 100% { transform: translateY(0) rotate(-5deg); }
        50% { transform: translateY(-16px) rotate(5deg); }
      }
      @keyframes btnPulse {
        0%, 100% { box-shadow: 0 0 10px currentColor, 0 0 25px rgba(0,229,255,0.3); }
        50% { box-shadow: 0 0 20px currentColor, 0 0 50px rgba(0,229,255,0.5); }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const [toast, setToast] = useState<string | null>(null);

  const handleNewGame = () => {
    newGame();
    navigate('/game');
  };

  const handleContinue = () => {
    const result = loadGame();
    if (result.success) {
      const msg = MarketService.describeOfflineTicks(result.offlineTicks);
      if (result.offlineTicks > 0) {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
      }
      navigate('/game');
    }
  };

  const handleClearSave = () => {
    clearSave();
    setToast('存档已清除');
    setTimeout(() => setToast(null), 2000);
  };

  const canContinue = hasSave();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-space-950 via-space-900 to-space-950 flex flex-col items-center justify-center">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            boxShadow: s.size > 2 ? '0 0 4px #fff' : 'none',
          }}
        />
      ))}

      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 text-[120px] select-none opacity-30 pointer-events-none"
        style={{
          animation: 'shipFloat 5s ease-in-out infinite',
          filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.5))',
        }}
      >
        🚀
      </div>

      <div
        className="absolute top-1/5 right-[15%] text-[48px] select-none opacity-50 pointer-events-none"
        style={{
          animation: 'shipFloat 6s ease-in-out 1.5s infinite',
          filter: 'drop-shadow(0 0 12px rgba(255,107,53,0.6))',
        }}
      >
        🛸
      </div>

      <div
        className="absolute bottom-1/4 left-[12%] text-[36px] select-none opacity-40 pointer-events-none"
        style={{
          animation: 'shipFloat 4.5s ease-in-out 0.8s infinite reverse',
          filter: 'drop-shadow(0 0 10px rgba(255,209,102,0.5))',
        }}
      >
        ⭐
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 px-6">
        <div className="text-center">
          <h1
            className="font-orbitron font-black text-6xl md:text-8xl bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-orange tracking-widest"
            style={{
              backgroundSize: '200% 200%',
              animation: 'titleGlow 3s ease-in-out infinite',
            }}
          >
            星际商贸
          </h1>
          <p className="mt-3 font-mono text-neon-cyan/70 text-sm md:text-base tracking-[0.3em]">
            SPACE · TRADER · V1.0
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="h-[2px] w-16 bg-gradient-to-r from-transparent to-neon-cyan/60" />
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-blink" />
            <span className="h-[2px] w-16 bg-gradient-to-l from-transparent to-neon-cyan/60" />
          </div>
        </div>

        <div className="flex flex-col gap-5 w-full max-w-sm">
          <button
            onClick={handleNewGame}
            className="group relative w-full py-4 px-8 font-orbitron font-bold text-xl tracking-wider border-2 border-neon-cyan text-neon-cyan bg-space-800/50 backdrop-blur-sm hover:bg-neon-cyan/10 hover:text-neon-cyan transition-all duration-300 clip-path-polygon"
            style={{
              clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
              color: '#00e5ff',
              animation: 'btnPulse 2.5s ease-in-out infinite',
            }}
          >
            <span className="relative z-10">▶ 新游戏</span>
          </button>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`group relative w-full py-4 px-8 font-orbitron font-bold text-xl tracking-wider border-2 backdrop-blur-sm transition-all duration-300 ${
              canContinue
                ? 'border-neon-orange text-neon-orange bg-space-800/50 hover:bg-neon-orange/10'
                : 'border-gray-600 text-gray-600 bg-space-800/30 cursor-not-allowed'
            }`}
            style={{
              clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
              boxShadow: canContinue ? '0 0 10px rgba(255,107,53,0.4)' : 'none',
            }}
          >
            <span className="relative z-10">
              {canContinue ? '◆ 继续游戏' : '◇ 无存档'}
            </span>
          </button>

          <button
            onClick={handleClearSave}
            className="group relative w-full py-3 px-8 font-orbitron font-semibold text-lg tracking-wider border border-neon-red/60 text-neon-red/80 bg-space-800/30 backdrop-blur-sm hover:bg-neon-red/10 hover:text-neon-red hover:border-neon-red transition-all duration-300"
            style={{
              clipPath: 'polygon(5% 0, 100% 0, 95% 100%, 0 100%)',
            }}
          >
            <span className="relative z-10">✕ 清除存档</span>
          </button>
        </div>

        <div className="mt-4 text-center font-mono text-xs text-neon-cyan/40 space-y-1">
          <p>© 2077 NEBULA TRADING CO.</p>
          <p className="tracking-widest">SYSTEM ONLINE · READY TO LAUNCH</p>
        </div>
      </div>

      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg border border-neon-cyan/50 bg-space-800/90 backdrop-blur-md shadow-neon-cyan font-mono text-sm text-neon-cyan animate-float">
          📡 {toast}
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.15) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
