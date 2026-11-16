import React, { useEffect, useRef, useState } from 'react';
import { Download, Dumbbell, House, LogOut, Moon, Sun, TrendingUp, Upload, User, Users, Utensils, X } from 'lucide-react';
import { iso, todayRoutine } from './lib';
import { muted } from './ui';
import { useGym } from './store';
import { Diet, Friends, Home, Progress, Workout } from './screens';

const tabs = [['inicio', 'Inicio', House], ['amigos', 'Amigos', Users], ['entreno', 'Entreno', Dumbbell], ['progreso', 'Progreso', TrendingUp], ['dieta', 'Dieta', Utensils]];
const screens = { inicio: Home, amigos: Friends, entreno: Workout, progreso: Progress, dieta: Diet };
const btn = 'flex h-10 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-200 dark:hover:bg-zinc-800';
const row = 'flex h-12 w-full items-center gap-3 rounded-2xl bg-zinc-200 px-4 text-sm font-semibold dark:bg-zinc-800';

export default function App() {
  const { routines, user, logout, exportData, importData } = useGym();
  const [tab, setTab] = useState('inicio');
  const [routine, setRoutine] = useState(() => todayRoutine(routines));
  const [dark, setDark] = useState(() => localStorage.getItem('gym-theme') !== 'light');
  const [account, setAccount] = useState(false);
  const [notice, setNotice] = useState('');
  const [dateOffset, setDateOffset] = useState(0); // 0 = hoy, -1 = ayer, 1 = mañana...
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('gym-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const go = (next, r) => { if (r) setRoutine(r); setTab(next); };
  const Screen = screens[tab];
  const active = routines[routine] ? routine : Object.keys(routines)[0];

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + dateOffset);
  const activeDate = iso(baseDate);
  let dayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).format(baseDate);
  if (dateOffset === 0) dayLabel = 'Hoy, ' + dayLabel;
  else if (dateOffset === -1) dayLabel = 'Ayer, ' + dayLabel;
  else if (dateOffset === 1) dayLabel = 'Mañana, ' + dayLabel;

  // El gesto no se activa dentro de ventanas, campos ni listas con scroll horizontal.
  const handleTouchStart = (e) => {
    touchEndX.current = null;
    touchStartX.current = e.target.closest?.('[role="dialog"], input, select, .overflow-x-auto') ? null : e.touches[0].clientX;
  };
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const start = touchStartX.current, end = touchEndX.current;
    touchStartX.current = null;
    touchEndX.current = null;
    if (start === null || end === null) return;
    const diff = start - end;
    if (diff > 50) setDateOffset((o) => o + 1);
    if (diff < -50) setDateOffset((o) => o - 1);
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      importData(await file.text());
      setNotice('Copia importada. Se han reemplazado los datos de tu cuenta.');
    } catch (err) {
      setNotice(err.message || 'No se pudo importar el archivo.');
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-950 transition-colors dark:bg-black dark:text-white" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <main className="mx-auto max-w-md px-5 pb-12 pt-8">
        {/* Cabecera con botón de cuenta a la izquierda */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => { setNotice(''); setAccount(true); }} aria-label="Mi cuenta" title="Mi cuenta" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
            <User size={20} />
          </button>
          <button type="button" onClick={() => setDateOffset(0)} disabled={dateOffset === 0} aria-label="Volver a hoy" className="min-w-0 flex-1 truncate text-center text-base font-semibold capitalize tracking-tight !text-2xl">{dayLabel}</button>
          <div className="size-10 shrink-0" />
        </div>

        {/* Menú de navegación */}
        <nav aria-label="Secciones" className="mt-5 flex items-center justify-between gap-1 rounded-full bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.14)] dark:bg-zinc-900 dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-label={label} aria-current={tab === key ? 'page' : undefined}
              className={`${btn} ${tab === key ? 'bg-zinc-950 px-3 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-300 sm:gap-2 sm:px-4' : 'size-10 flex-1 sm:flex-none'}`}>
              <Icon size={18} />
              {tab === key && <span className="hidden text-sm font-semibold sm:inline">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-5">
          <Screen key={`${tab}-${activeDate}`} go={go} routine={active} activeDate={activeDate} />
        </div>
      </main>

      {/* Modal de cuenta de usuario */}
      {account && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) setAccount(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="account-title" className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <button type="button" onClick={() => setAccount(false)} aria-label="Cerrar" className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-zinc-200 dark:text-slate-300 dark:hover:bg-zinc-800"><X size={17} /></button>
            <h2 id="account-title" className="text-lg font-semibold">{user.name}</h2>
            <p className={`text-sm ${muted}`}>{user.email}</p>

            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => setDark((d) => !d)} className={row}>
                {dark ? <Sun size={18} /> : <Moon size={18} />}
                {dark ? 'Activar modo claro' : 'Activar modo oscuro'}
              </button>
              <button type="button" onClick={exportData} className={row}><Download size={18} />Descargar copia de seguridad</button>
              <button type="button" onClick={() => fileRef.current?.click()} className={row}><Upload size={18} />Importar copia</button>
              <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" aria-label="Archivo de copia" />
              <button type="button" onClick={logout} className={`${row} text-rose-700 dark:text-rose-300`}><LogOut size={18} />Cerrar sesión</button>
            </div>

            {notice && <p role="status" className="mt-4 rounded-2xl bg-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{notice}</p>}
          </section>
        </div>
      )}
    </div>
  );
}