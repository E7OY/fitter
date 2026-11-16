import React from 'react';

export const Card = ({ className = '', ...props }) => (
  <div className={`rounded-[28px] bg-zinc-100 p-5 dark:bg-zinc-900 ${className}`} {...props} />
);
export const Bar = ({ value, color = 'bg-zinc-950 dark:bg-white' }) => (
  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700">
    <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);
// Anillo de progreso: el contenido va en el centro.
export const Ring = ({ value, size = 180, stroke = 16, children }) => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.min(100, Math.max(0, value || 0));
  const circle = { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke };
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle {...circle} className="stroke-zinc-300 dark:stroke-zinc-700" />
        <circle {...circle} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="stroke-zinc-950 transition-all duration-500 dark:stroke-white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};
export const chip = (on) => `h-9 rounded-full px-5 text-sm font-semibold transition-colors ${on ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`;
export const muted = 'text-zinc-500 dark:text-zinc-400';
export const field = 'h-11 rounded-2xl border-0 bg-zinc-200 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-950 dark:bg-zinc-800 dark:focus:ring-white';
export const primary = 'h-14 w-full rounded-full bg-zinc-950 text-base font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200';