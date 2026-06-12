import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function EventModal() {
  const eventState = useGameStore((s) => s.eventState);
  const resolveEventChoice = useGameStore((s) => s.resolveEventChoice);

  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'good' | 'bad'>('good');

  const visible = eventState !== null || resultMsg !== null;

  useEffect(() => {
    if (resultMsg !== null) {
      const timer = setTimeout(() => {
        setResultMsg(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [resultMsg]);

  if (!visible) return null;

  const handleChoice = (choiceId: string) => {
    if (!eventState || resultMsg !== null) return;
    const choice = eventState.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const r = choice.result;
    const isGood =
      (r.credits ?? 0) > 0 ||
      (r.shield ?? 0) > 0 ||
      (r.cargo && r.cargo.length > 0) ||
      false;
    const isBad =
      (r.credits ?? 0) < 0 ||
      (r.shield ?? 0) < 0 ||
      r.removeCargo === true ||
      false;

    const type: 'good' | 'bad' = isBad ? 'bad' : isGood ? 'good' : 'good';

    const message = resolveEventChoice(choiceId);
    setResultType(type);
    setResultMsg(message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md mx-4 panel corner-deco scanlines p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {eventState && resultMsg === null && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="text-6xl mb-4 animate-float">{eventState.icon}</div>
              <h2 className="font-orbitron text-2xl font-bold text-neon-cyan tracking-wider text-glow-cyan mb-3">
                {eventState.title}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {eventState.description}
              </p>
            </div>
            <div className="divider-glow mb-5" />
            <div className="space-y-3">
              {eventState.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-white/5
                    hover:bg-neon-cyan/10 hover:border-neon-cyan/50 transition-all duration-200
                    active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-orbitron font-semibold text-neon-cyan group-hover:text-glow-cyan">
                      {choice.label}
                    </span>
                    <span className="text-neon-cyan/60 text-xs group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{choice.description}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {resultMsg !== null && (
          <div
            className={`flex flex-col items-center text-center py-6 rounded-lg ${
              resultType === 'good'
                ? 'bg-neon-green/15 border border-neon-green/40'
                : 'bg-neon-orange/15 border border-neon-orange/40'
            }`}
          >
            <div className="text-5xl mb-4 animate-pulse-glow">
              {resultType === 'good' ? '✅' : '⚠️'}
            </div>
            <p
              className={`px-4 text-sm leading-relaxed ${
                resultType === 'good' ? 'text-green-300' : 'text-orange-300'
              }`}
            >
              {resultMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
