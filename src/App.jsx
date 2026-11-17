import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Dumbbell, House, LogOut, Moon, RefreshCw, Sun, TrendingUp, Upload, User, Users, Utensils } from 'lucide-react';
import { friendCodeOf, iso, todayRoutine } from './lib';
import { muted } from './ui';
import { useGym } from './store';
import { Diet, Friends, Home, Progress, Workout } from './screens';

const tabs = [['inicio', 'Inicio', House], ['amigos', 'Amigos', Users], ['entreno', 'Entreno', Dumbbell], ['progreso', 'Progreso', TrendingUp], ['dieta', 'Dieta', Utensils]];
const screens = { inicio: Home, amigos: Friends, entreno: Workout, progreso: Progress, dieta: Diet };
const btn = 'flex h-10 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-200 dark:hover:bg-zinc-800';
const row = 'flex h-13 w-full items-center gap-3.5 px-4 py-3.5 text-left text-sm font-semibold transition-colors active:bg-zinc-200/80 hover:bg-zinc-200/60 dark:active:bg-zinc-700/60 dark:hover:bg-zinc-800';

export default function App() {
  const { routines, user, logout, exportData, importData, draft, friendCode, regenerateFriendCode } = useGym();
  const [tab, setTab] = useState('inicio');
  const [routine, setRoutine] = useState(() => todayRoutine(routines));
  const [dark, setDark] = useState(() => localStorage.getItem('gym-theme') !== 'light');
  const [account, setAccount] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [draggingSheet, setDraggingSheet] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [notice, setNotice] = useState('');
  const [dateOffset, setDateOffset] = useState(0); // 0 = hoy, -1 = ayer, 1 = mañana...
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const sheetStartY = useRef(null);
  const fileRef = useRef(null);

  const myCode = friendCode || friendCodeOf(user);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('gym-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const openAccount = () => {
    setNotice('');
    setCopiedCode(false);
    setDragY(0);
    setDraggingSheet(false);
    setAccount(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetVisible(true));
    });
  };

  const closeAccount = () => {
    setDraggingSheet(false);
    setSheetVisible(false);
    setTimeout(() => {
      setAccount(false);
      setDragY(0);
    }, 300);
  };

  useEffect(() => {
    if (!account) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeAccount(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [account]);

  const onSheetTouchStart = (e) => {
    sheetStartY.current = e.touches[0].clientY;
    setDraggingSheet(true);
  };

  const onSheetTouchMove = (e) => {
    if (sheetStartY.current === null) return;
    const delta = e.touches[0].clientY - sheetStartY.current;
    // Seguimiento 1:1 hacia abajo y ligera resistencia elástica hacia arriba
    setDragY(delta > 0 ? delta : delta * 0.18);
  };

  const onSheetTouchEnd = () => {
    sheetStartY.current = null;
    setDraggingSheet(false);
    if (dragY > 90) {
      closeAccount();
    } else {
      setDragY(0);
    }
  };

  const copyFriendCode = async () => {
    try {
      await navigator.clipboard?.writeText(myCode);
    } catch { /* ignorar si el navegador bloquea el portapapeles */ }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const go = (next, r) => { if (r) setRoutine(r); setTab(next); };
  const Screen = screens[tab];
  const active = routines[routine] ? routine : Object.keys(routines)[0];

  const hasActiveDraft = draft && Array.isArray(draft.sets) && draft.sets.length > 0;
  const targetRoutine = hasActiveDraft && routines[draft.routine] ? draft.routine : active;
  const canStartWorkout = hasActiveDraft || (routines[targetRoutine]?.length > 0);

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

  const initials = (user?.name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-950 transition-colors dark:bg-black dark:text-white" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <main className={`mx-auto max-w-md px-5 pt-8 ${tab !== 'entreno' ? 'pb-28' : 'pb-12'}`}>
        {/* Cabecera con botón de cuenta a la izquierda */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={openAccount} aria-label="Mi cuenta" title="Mi cuenta" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
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

      {/* Botón fijo inferior para comenzar o continuar el entreno */}
      {tab !== 'entreno' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent pb-5 pt-6 dark:from-black dark:via-black/95">
          <div className="mx-auto max-w-md px-5">
            <button
              type="button"
              onClick={() => go('entreno', targetRoutine)}
              disabled={!canStartWorkout}
              className="pointer-events-auto flex h-14 w-full items-center justify-between rounded-full bg-zinc-950 px-5 text-white shadow-[0_8px_28px_rgba(0,0,0,0.22)] transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:shadow-[0_8px_28px_rgba(0,0,0,0.75)] dark:hover:bg-zinc-200"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base font-bold tracking-tight">
                  {hasActiveDraft ? 'Continuar entreno' : 'Comenzar entreno'}
                </span>
              </span>
              {targetRoutine && (
                <span className="max-w-[140px] truncate rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold dark:bg-zinc-950/10">
                  {targetRoutine} →
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sheet deslizable estilo iPhone para el perfil */}
      {account && (
        <div
          className={`fixed inset-0 z-[60] flex items-end justify-center transition-colors duration-300 ${sheetVisible ? 'bg-slate-950/45 backdrop-blur-[2px]' : 'bg-slate-950/0'}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeAccount(); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            style={{
              transform: sheetVisible ? `translateY(${dragY}px)` : 'translateY(100%)',
              transition: draggingSheet ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            className="w-full max-w-md rounded-t-[32px] bg-white px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] dark:bg-zinc-900 dark:shadow-[0_-12px_40px_rgba(0,0,0,0.75)]"
          >
            {/* Tirador superior (Grabber iOS) */}
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />

            {/* Cabecera del perfil */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-extrabold text-white dark:bg-white dark:text-zinc-950">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 id="account-title" className="truncate text-lg font-bold leading-tight">{user.name}</h2>
                  <p className={`truncate text-xs ${muted}`}>{user.email}</p>
                </div>
              </div>
            </div>

            {/* Código de amigo */}
            <div className="mt-4 flex items-center justify-between gap-2 rounded-3xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800/70">
              <div className="min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Tu código de amigo</p>
                <p className="mt-0.5 font-mono text-sm font-extrabold tracking-wider">{myCode}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {regenerateFriendCode && (
                  <button
                    type="button"
                    onClick={regenerateFriendCode}
                    aria-label="Generar nuevo código de amigo"
                    title="Generar nuevo código"
                    className="flex size-8 items-center justify-center rounded-full bg-white text-zinc-700 shadow-xs transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={copyFriendCode}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-950 px-3 text-[11px] font-extrabold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCode ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Grupo de opciones estilo iOS */}
            <div className="mt-3 overflow-hidden rounded-3xl bg-zinc-100 divide-y divide-zinc-200/80 dark:bg-zinc-800/70 dark:divide-zinc-700/70">
              <button type="button" onClick={() => setDark((d) => !d)} className={row}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white">
                  {dark ? <Sun size={16} /> : <Moon size={16} />}
                </span>
                <span className="flex-1">{dark ? 'Activar modo claro' : 'Activar modo oscuro'}</span>
              </button>
              <button type="button" onClick={exportData} className={row}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white">
                  <Download size={16} />
                </span>
                <span className="flex-1">Descargar copia de seguridad</span>
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className={row}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white">
                  <Upload size={16} />
                </span>
                <span className="flex-1">Importar copia</span>
              </button>
              <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" aria-label="Archivo de copia" />
            </div>

            {/* Botón separado de cerrar sesión */}
            <div className="mt-3 overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-800/70">
              <button type="button" onClick={logout} className={`${row} text-rose-600 dark:text-rose-400`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <LogOut size={16} />
                </span>
                <span className="flex-1">Cerrar sesión</span>
              </button>
            </div>

            {notice && <p role="status" className="mt-4 rounded-2xl bg-zinc-200 px-3.5 py-2.5 text-center text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{notice}</p>}
          </section>
        </div>
      )}
    </div>
  );
}