import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PLANETS, getPlanet } from '../data/planets';
import type { Planet } from '../types/game';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const STAR_COUNT = 200;
const PLANET_RADIUS = 18;
const PLANET_GLOW = 30;

export default function StarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const hoveredPlanetRef = useRef<string | null>(null);

  const currentPlanetId = useGameStore((s) => s.currentPlanetId);
  const travelState = useGameStore((s) => s.travelState);
  const startTravel = useGameStore((s) => s.startTravel);

  useEffect(() => {
    starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      baseAlpha: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 2 + 1,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const getCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      return { w: rect.width, h: rect.height };
    };

    const toCanvasCoord = (px: number, py: number) => {
      const { w, h } = getCanvasSize();
      const padding = 60;
      return {
        x: padding + px * (w - padding * 2),
        y: padding + py * (h - padding * 2),
      };
    };

    const drawStars = (time: number) => {
      const { w, h } = getCanvasSize();
      for (const star of starsRef.current) {
        const twinkle = Math.sin(time * 0.001 * star.speed + star.phase) * 0.3 + 0.7;
        const alpha = star.baseAlpha * twinkle;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const drawRoutes = () => {
      for (let i = 0; i < PLANETS.length; i++) {
        for (let j = i + 1; j < PLANETS.length; j++) {
          const a = toCanvasCoord(PLANETS[i].x, PLANETS[i].y);
          const b = toCanvasCoord(PLANETS[j].x, PLANETS[j].y);
          ctx.beginPath();
          ctx.setLineDash([6, 10]);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    };

    const drawPlanet = (planet: Planet, time: number, isCurrent: boolean, isHovered: boolean) => {
      const pos = toCanvasCoord(planet.x, planet.y);
      const radius = PLANET_RADIUS * (isHovered ? 1.15 : 1);

      const glowRadius = PLANET_GLOW + (isCurrent ? 15 : 0) + Math.sin(time * 0.002) * 4;
      const glow = ctx.createRadialGradient(pos.x, pos.y, radius * 0.5, pos.x, pos.y, radius + glowRadius);
      glow.addColorStop(0, planet.color + 'cc');
      glow.addColorStop(0.4, planet.color + '44');
      glow.addColorStop(1, planet.color + '00');
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      if (isCurrent) {
        const pulseR = radius + 8 + Math.sin(time * 0.004) * 4;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf2480';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const bodyGrad = ctx.createRadialGradient(
        pos.x - radius * 0.35,
        pos.y - radius * 0.35,
        radius * 0.1,
        pos.x,
        pos.y,
        radius
      );
      bodyGrad.addColorStop(0, lightenColor(planet.color, 40));
      bodyGrad.addColorStop(1, planet.color);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(time * 0.0008);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.7, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.strokeStyle = planet.color + '55';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const textY = pos.y + radius + 12;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillText(planet.name, pos.x + 1, textY + 1);
      ctx.fillStyle = isCurrent ? '#fbbf24' : '#e2e8f0';
      ctx.fillText(planet.name, pos.x, textY);
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const getShipPos = (progress: number) => {
      if (!travelState) return null;
      const from = getPlanet(travelState.fromPlanet);
      const to = getPlanet(travelState.toPlanet);
      if (!from || !to) return null;
      const t = Math.min(1, progress / travelState.duration);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const fromPos = toCanvasCoord(from.x, from.y);
      const toPos = toCanvasCoord(to.x, to.y);
      return {
        x: lerp(fromPos.x, toPos.x, easeT),
        y: lerp(fromPos.y, toPos.y, easeT),
        angle: Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x),
        progress: easeT,
      };
    };

    const spawnParticles = (shipX: number, shipY: number, angle: number) => {
      for (let i = 0; i < 3; i++) {
        const spread = (Math.random() - 0.5) * 0.6;
        const speed = 1.5 + Math.random() * 2;
        particlesRef.current.push({
          x: shipX - Math.cos(angle) * 12,
          y: shipY - Math.sin(angle) * 12,
          vx: -Math.cos(angle + spread) * speed + (Math.random() - 0.5) * 0.5,
          vy: -Math.sin(angle + spread) * speed + (Math.random() - 0.5) * 0.5,
          life: 1,
          maxLife: 0.5 + Math.random() * 0.3,
          color: Math.random() > 0.5 ? '#f97316' : '#fbbf24',
          size: 2 + Math.random() * 3,
        });
      }
      if (particlesRef.current.length > 300) {
        particlesRef.current = particlesRef.current.slice(-300);
      }
    };

    const updateAndDrawParticles = (dt: number) => {
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= dt / (p.maxLife * 1000);
        if (p.life <= 0) continue;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
        alive.push(p);
      }
      particlesRef.current = alive;
    };

    const drawShip = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const shipGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
      shipGlow.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
      shipGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fillStyle = shipGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      ctx.restore();
    };

    const drawTravelRoute = (progress: number) => {
      if (!travelState) return;
      const from = getPlanet(travelState.fromPlanet);
      const to = getPlanet(travelState.toPlanet);
      if (!from || !to) return;
      const t = Math.min(1, progress / travelState.duration);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const fromPos = toCanvasCoord(from.x, from.y);
      const toPos = toCanvasCoord(to.x, to.y);

      ctx.beginPath();
      ctx.setLineDash([8, 8]);
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.lineTo(toPos.x, toPos.y);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      const endX = lerp(fromPos.x, toPos.x, easeT);
      const endY = lerp(fromPos.y, toPos.y, easeT);
      const traveledGrad = ctx.createLinearGradient(fromPos.x, fromPos.y, endX, endY);
      traveledGrad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
      traveledGrad.addColorStop(1, 'rgba(251, 191, 36, 0.2)');
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = traveledGrad;
      ctx.lineWidth = 3;
      ctx.stroke();
    };

    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      timeRef.current = now;

      const { w, h } = getCanvasSize();
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const nebulaGrad = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w * 0.6);
      nebulaGrad.addColorStop(0, 'rgba(59, 130, 246, 0.06)');
      nebulaGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, w, h);

      const nebulaGrad2 = ctx.createRadialGradient(w * 0.75, h * 0.7, 0, w * 0.75, h * 0.7, w * 0.5);
      nebulaGrad2.addColorStop(0, 'rgba(139, 92, 246, 0.06)');
      nebulaGrad2.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = nebulaGrad2;
      ctx.fillRect(0, 0, w, h);

      drawStars(now);
      drawRoutes();

      if (travelState) {
        drawTravelRoute(travelState.progress);
      }

      for (const planet of PLANETS) {
        const isCurrent = planet.id === currentPlanetId;
        const isHovered = hoveredPlanetRef.current === planet.id;
        drawPlanet(planet, now, isCurrent, isHovered);
      }

      if (travelState) {
        const ship = getShipPos(travelState.progress);
        if (ship) {
          spawnParticles(ship.x, ship.y, ship.angle);
          drawShip(ship.x, ship.y, ship.angle);
        }
      }

      updateAndDrawParticles(dt);

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    const handleClick = (e: MouseEvent) => {
      if (travelState?.isTraveling) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      for (const planet of PLANETS) {
        if (planet.id === currentPlanetId) continue;
        const pos = toCanvasCoord(planet.x, planet.y);
        const dist = Math.sqrt((cx - pos.x) ** 2 + (cy - pos.y) ** 2);
        if (dist <= PLANET_RADIUS + 8) {
          startTravel(planet.id);
          return;
        }
      }
    };

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let found: string | null = null;

      for (const planet of PLANETS) {
        if (planet.id === currentPlanetId) continue;
        const pos = toCanvasCoord(planet.x, planet.y);
        const dist = Math.sqrt((cx - pos.x) ** 2 + (cy - pos.y) ** 2);
        if (dist <= PLANET_RADIUS + 8) {
          found = planet.id;
          break;
        }
      }

      hoveredPlanetRef.current = found;
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMove);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMove);
    };
  }, [currentPlanetId, travelState, startTravel]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 text-xs text-slate-500">
        点击星球以出发
      </div>
    </div>
  );
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * (percent / 100)));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * (percent / 100)));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * (percent / 100)));
  return `rgb(${r}, ${g}, ${b})`;
}
