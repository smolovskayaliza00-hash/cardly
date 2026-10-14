import { useMemo } from 'react';

/**
 * ДЕКОРАТИВНЫЙ «QR-код» для прототипа. Это не настоящий QR и он не кодирует
 * платёжные данные — просто узор, детерминированный от строки.
 * В продакшене здесь будет QR из payload, выданного платёжным партнёром (НСПК СБП).
 */
export function FakeQr({ seed, size = 200 }: { seed: string; size?: number }) {
  const N = 25;
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rand = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 1000) / 1000;
    };
    const out: [number, number][] = [];
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rand() > 0.52) out.push([x, y]);
    return out;
  }, [seed]);

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} rx={1.6} fill="#111" />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={1.1} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill="#111" />
    </g>
  );

  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} width={size} height={size} className="rounded-2xl bg-white" aria-label="Демо QR">
      {cells.map(([x, y]) => (
        <rect key={`${x}:${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.25} fill="#111" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}
