import { PLANETS } from '../../data/planets';

export const generateCycles = (maxLength: number = 6): string[][] => {
  const planetIds = PLANETS.map((p) => p.id);
  const cycles: string[][] = [];
  const n = planetIds.length;

  const visited = new Set<string>();
  const path: string[] = [];

  const dfs = (start: string, depth: number, maxLen: number) => {
    if (depth > maxLen) return;

    if (depth >= 2) {
      cycles.push([...path]);
    }

    for (const pid of planetIds) {
      if (pid === start && depth >= 2) continue;
      if (visited.has(pid)) continue;

      visited.add(pid);
      path.push(pid);

      const nextMax = Math.min(maxLen, n);
      if (depth + 1 <= nextMax) {
        dfs(start, depth + 1, maxLen);
      }

      path.pop();
      visited.delete(pid);
    }
  };

  for (const start of planetIds) {
    visited.clear();
    path.length = 0;
    visited.add(start);
    path.push(start);
    dfs(start, 1, Math.min(n, maxLength));
  }

  return deduplicateCycles(cycles);
};

const deduplicateCycles = (cycles: string[][]): string[][] => {
  const seen = new Set<string>();
  const unique: string[][] = [];

  for (const cycle of cycles) {
    const key = normalizeCycleKey(cycle);

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cycle);
    }
  }

  return unique;
};

const normalizeCycleKey = (cycle: string[]): string => {
  if (cycle.length === 0) return '';
  const minIdx = cycle.indexOf(cycle.reduce((a, b) => (a < b ? a : b)));
  const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
  return rotated.join('-');
};
