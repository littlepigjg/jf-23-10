import type {
  BattleState,
  BattleEntity,
  Bullet,
  Particle,
} from '../types/game';

export const createInitialBattleState = (
  maxHp: number,
  damage: number,
  difficulty: number
): BattleState => {
  const canvasW = 800;
  const canvasH = 500;

  const player: BattleEntity = {
    x: canvasW * 0.15,
    y: canvasH * 0.5,
    vx: 0,
    vy: 0,
    hp: maxHp,
    maxHp,
    angle: 0,
  };

  const pirateCount = Math.min(1 + Math.floor(difficulty / 2), 5);
  const pirates: BattleEntity[] = [];
  for (let i = 0; i < pirateCount; i++) {
    pirates.push({
      x: canvasW * (0.7 + Math.random() * 0.2),
      y: canvasH * (0.2 + Math.random() * 0.6),
      vx: 0,
      vy: 0,
      hp: 30 + difficulty * 15,
      maxHp: 30 + difficulty * 15,
      angle: Math.PI,
    });
  }

  return {
    player,
    pirates,
    bullets: [],
    particles: [],
    isPlayerTurn: true,
    result: 'ongoing',
    countdown: 3,
    difficulty,
    shakeTime: 0,
  };
};

export const createBullet = (
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  isPlayer: boolean
): Bullet => ({
  x,
  y,
  vx: Math.cos(angle) * speed,
  vy: Math.sin(angle) * speed,
  damage,
  isPlayer,
  life: 2,
});

export const createExplosion = (
  x: number,
  y: number,
  color: string,
  count: number = 15
): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 50 + Math.random() * 150;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1,
      color,
      size: 2 + Math.random() * 4,
    });
  }
  return particles;
};

export const updateBattle = (
  state: BattleState,
  keys: Record<string, boolean>,
  dt: number,
  canvasW: number,
  canvasH: number,
  playerDamage: number,
  shootCooldown: number
): { state: BattleState; shootCooldown: number } => {
  if (state.result !== 'ongoing' || state.countdown > 0) {
    return { state: { ...state, countdown: Math.max(0, state.countdown - dt) }, shootCooldown };
  }

  let shakeTime = Math.max(0, state.shakeTime - dt);

  const accel = 400;
  const maxSpeed = 350;
  const friction = 0.92;
  const rotSpeed = 4;

  let player = { ...state.player };

  if (keys['ArrowUp'] || keys['w'] || keys['W']) {
    player.vx += Math.cos(player.angle) * accel * dt;
    player.vy += Math.sin(player.angle) * accel * dt;
  }
  if (keys['ArrowDown'] || keys['s'] || keys['S']) {
    player.vx -= Math.cos(player.angle) * accel * 0.5 * dt;
    player.vy -= Math.sin(player.angle) * accel * 0.5 * dt;
  }
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    player.angle -= rotSpeed * dt;
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    player.angle += rotSpeed * dt;
  }

  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed;
    player.vy = (player.vy / speed) * maxSpeed;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vx *= friction;
  player.vy *= friction;

  player.x = Math.max(20, Math.min(canvasW - 20, player.x));
  player.y = Math.max(20, Math.min(canvasH - 20, player.y));

  let bullets = [...state.bullets];
  let particles = [...state.particles];
  let newShootCooldown = Math.max(0, shootCooldown - dt);

  if ((keys[' '] || keys['Space']) && newShootCooldown <= 0) {
    const noseX = player.x + Math.cos(player.angle) * 22;
    const noseY = player.y + Math.sin(player.angle) * 22;
    bullets.push(createBullet(noseX, noseY, player.angle, 600, playerDamage, true));
    newShootCooldown = 0.2;
  }

  let pirates = state.pirates.map((p) => {
    const pirate = { ...p };
    const dx = player.x - pirate.x;
    const dy = player.y - pirate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    let angleDiff = targetAngle - pirate.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    pirate.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 2.5 * dt);

    if (dist > 180) {
      pirate.vx += Math.cos(pirate.angle) * 200 * dt;
      pirate.vy += Math.sin(pirate.angle) * 200 * dt;
    } else if (dist < 120) {
      pirate.vx -= Math.cos(pirate.angle) * 100 * dt;
      pirate.vy -= Math.sin(pirate.angle) * 100 * dt;
    }

    if (Math.abs(angleDiff) < 0.3 && Math.random() < 0.02 + state.difficulty * 0.005) {
      const noseX = pirate.x + Math.cos(pirate.angle) * 18;
      const noseY = pirate.y + Math.sin(pirate.angle) * 18;
      bullets.push(createBullet(noseX, noseY, pirate.angle, 400, 8 + state.difficulty * 2, false));
    }

    const pSpeed = Math.sqrt(pirate.vx * pirate.vx + pirate.vy * pirate.vy);
    if (pSpeed > 220) {
      pirate.vx = (pirate.vx / pSpeed) * 220;
      pirate.vy = (pirate.vy / pSpeed) * 220;
    }

    pirate.x += pirate.vx * dt;
    pirate.y += pirate.vy * dt;
    pirate.vx *= 0.94;
    pirate.vy *= 0.94;

    pirate.x = Math.max(20, Math.min(canvasW - 20, pirate.x));
    pirate.y = Math.max(20, Math.min(canvasH - 20, pirate.y));

    return pirate;
  });

  bullets = bullets
    .map((b) => ({
      ...b,
      x: b.x + b.vx * dt,
      y: b.y + b.vy * dt,
      life: b.life - dt,
    }))
    .filter((b) => b.life > 0 && b.x > -10 && b.x < canvasW + 10 && b.y > -10 && b.y < canvasH + 10);

  const remainingBullets: Bullet[] = [];
  for (const b of bullets) {
    let hit = false;
    if (b.isPlayer) {
      for (let i = 0; i < pirates.length; i++) {
        const p = pirates[i];
        const ddx = b.x - p.x;
        const ddy = b.y - p.y;
        if (ddx * ddx + ddy * ddy < 18 * 18) {
          pirates[i] = { ...p, hp: p.hp - b.damage };
          particles = particles.concat(createExplosion(b.x, b.y, '#ff6b35', 8));
          shakeTime = 0.15;
          hit = true;
          break;
        }
      }
    } else {
      const ddx = b.x - player.x;
      const ddy = b.y - player.y;
      if (ddx * ddx + ddy * ddy < 18 * 18) {
        player = { ...player, hp: player.hp - b.damage };
        particles = particles.concat(createExplosion(b.x, b.y, '#60a5fa', 8));
        shakeTime = 0.2;
        hit = true;
      }
    }
    if (!hit) remainingBullets.push(b);
  }
  bullets = remainingBullets;

  const deadPirates = pirates.filter((p) => p.hp <= 0);
  for (const dead of deadPirates) {
    particles = particles.concat(createExplosion(dead.x, dead.y, '#ff6b35', 25));
    shakeTime = 0.3;
  }
  pirates = pirates.filter((p) => p.hp > 0);

  particles = particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      life: p.life - dt,
      vx: p.vx * 0.98,
      vy: p.vy * 0.98,
    }))
    .filter((p) => p.life > 0);

  let result: BattleState['result'] = 'ongoing';
  if (player.hp <= 0) {
    result = 'lose';
  } else if (pirates.length === 0) {
    result = 'win';
  }

  return {
    state: {
      player,
      pirates,
      bullets,
      particles,
      isPlayerTurn: state.isPlayerTurn,
      result,
      countdown: 0,
      difficulty: state.difficulty,
      shakeTime,
    },
    shootCooldown: newShootCooldown,
  };
};
