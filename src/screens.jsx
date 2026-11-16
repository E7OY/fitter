import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, FileText, Pencil, Plus, Repeat, Trash2, Trophy, Utensils, X } from 'lucide-react';
import { useGym } from './store';
import { MUSCLES, calcStreak, e1rm, fmt, iso, parseRoutines, weekSets, weekVol } from './lib';
import { Bar, Card, Ring, chip, field, muted, primary } from './ui';

const good = 'text-zinc-950 dark:text-white';
const bad = 'text-rose-600 dark:text-rose-400';
const shortDate = (d) => new Date(`${d}T00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const trash = 'flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-300';
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

function RoutineEditor({ routine, onSelect }) {
  const { routines, saveRoutines } = useGym();
  const [name, setName] = useState(routine);
  const [exName, setExName] = useState('');
  const [muscle, setMuscle] = useState(MUSCLES[0]);
  const [targetReps, setTargetReps] = useState('');
  const [defaultWeight, setDefaultWeight] = useState('');

  useEffect(() => setName(routine), [routine]);
  const list = routines[routine] || [];
  const update = (next) => saveRoutines({ ...routines, [routine]: next });
  
  const addExercise = (event) => {
    event.preventDefault();
    if (!exName.trim()) return;
    update([...list, { 
      name: exName.trim(), 
      muscle,
      targetReps: targetReps.trim(),
      defaultWeight: defaultWeight.trim() !== '' ? Number(defaultWeight.replace(',', '.')) : ''
    }]);
    setExName(''); setTargetReps(''); setDefaultWeight('');
  };
  
  const rename = () => {
    const next = name.trim();
    if (!next || next === routine || routines[next]) { setName(routine); return; }
    saveRoutines(Object.fromEntries(Object.entries(routines).map(([k, v]) => [k === routine ? next : k, v])));
    onSelect(next);
  };
  
  const remove = () => {
    const rest = { ...routines };
    delete rest[routine];
    saveRoutines(rest);
    onSelect(Object.keys(rest)[0]);
  };
  
  return (
    <div className="mt-4 space-y-3">
      <input aria-label="Nombre de la rutina" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} onBlur={rename} className={`${field} w-full font-bold`} />
      <ul className="space-y-1">
        {list.map((e, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span>
              {e.name} <span className={muted}>· {e.muscle}</span>
              {e.targetReps && <span className="ml-2 text-xs font-semibold text-zinc-950 dark:text-white">[{e.targetReps}]</span>}
            </span>
            <button type="button" onClick={() => update(list.filter((_, j) => j !== i))} aria-label={`Quitar ${e.name}`} className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"><X size={15} /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={addExercise} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input aria-label="Nuevo ejercicio" placeholder="Nuevo ejercicio" value={exName} onChange={(e) => setExName(e.target.value)} className={`${field} w-full min-w-0`} />
          <select aria-label="Músculo" value={muscle} onChange={(e) => setMuscle(e.target.value)} className={`${field} shrink-0 px-2`}>{MUSCLES.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        <div className="flex gap-2">
          <input aria-label="Baremo" placeholder="Reps (ej: 8-12)" value={targetReps} onChange={(e) => setTargetReps(e.target.value)} className={`${field} w-full min-w-0`} />
          <input inputMode="decimal" aria-label="Peso base" placeholder="Peso base (kg)" value={defaultWeight} onChange={(e) => setDefaultWeight(e.target.value)} className={`${field} w-full min-w-0`} />
          <button type="submit" aria-label="Añadir ejercicio" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white"><Plus size={18} /></button>
        </div>
      </form>
      <button type="button" onClick={remove} disabled={Object.keys(routines).length < 2} className={`inline-flex items-center gap-1 text-sm font-semibold disabled:opacity-40 ${bad}`}><Trash2 size={15} />Eliminar rutina</button>
    </div>
  );
}

function ImportRoutines({ onDone }) {
  const { routines, saveRoutines } = useGym();
  const [text, setText] = useState('');
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [replace, setReplace] = useState(false);

  const analyze = () => {
    const result = parseRoutines(text);
    setError(result.length ? '' : 'No he encontrado ejercicios. Pon un ejercicio por línea, por ejemplo: Press banca 4x8 80kg.');
    setFound(result.length ? result : null);
  };
  const setMuscle = (r, i, muscle) => setFound((f) => f.map((x, a) => (a !== r ? x : { ...x, exercises: x.exercises.map((e, b) => (b !== i ? e : { ...e, muscle, review: false })) })));
  const save = () => {
    const base = replace ? {} : { ...routines };
    let first = null;
    found.forEach(({ name, exercises }) => {
      let n = name, k = 2;
      while (base[n]) { n = `${name} ${k}`; k += 1; }
      base[n] = exercises.map(({ review, ...e }) => e);
      first = first || n;
    });
    saveRoutines(base);
    onDone(first);
  };

  if (!found) {
    return (
      <div className="mt-4 space-y-3">
        <textarea aria-label="Texto de tu rutina" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Empuje:\nPress banca 4x8 80kg\nPress militar 3x10\n\nTirón:\nDominadas 4x6'} className={`${field} h-auto w-full py-3`} />
        <p className={`text-xs ${muted}`}>Pega tu rutina de Notas. Pon cada día como título (termina en «:» o deja una línea en blanco antes) y un ejercicio por línea, con series×reps y kilos si quieres.</p>
        {error && <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <button type="button" onClick={analyze} disabled={!text.trim()} className={`${primary} !h-12`}>Reconocer rutina</button>
      </div>
    );
  }
  const total = found.reduce((t, r) => t + r.exercises.length, 0);
  return (
    <div className="mt-4 space-y-4">
      {found.map((r, ri) => (
        <div key={ri}>
          <p className="font-bold">{r.name}</p>
          <ul className="mt-2 space-y-2">
            {r.exercises.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{e.name}</span>
                  <span className={`text-xs ${muted}`}>{[e.targetReps, e.defaultWeight !== '' && `${e.defaultWeight} kg`].filter(Boolean).join(' · ') || 'Sin series ni peso'}</span>
                </span>
                <select aria-label={`Músculo de ${e.name}`} value={e.muscle} onChange={(ev) => setMuscle(ri, i, ev.target.value)} className={`${field} h-9 shrink-0 px-2 ${e.review ? 'ring-2 ring-amber-400' : ''}`}>{MUSCLES.map((m) => <option key={m}>{m}</option>)}</select>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className={`text-xs ${muted}`}>Revisa los músculos marcados en ámbar: no he podido deducirlos.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4 accent-zinc-950" />Reemplazar mis rutinas actuales</label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setFound(null)} className="h-12 shrink-0 rounded-full bg-zinc-200 px-5 text-sm font-semibold dark:bg-zinc-800">Volver</button>
        <button type="button" onClick={save} className={`${primary} !h-12`}>Añadir {found.length} {found.length === 1 ? 'rutina' : 'rutinas'} ({total})</button>
      </div>
    </div>
  );
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
function Activity({ sessions, activeDate }) {
  const [range, setRange] = useState('1S');
  const vol = (list) => list.reduce((t, s) => t + s.sets.reduce((u, x) => u + x.kg * x.reps, 0), 0);
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const bars = range === '1S'
    ? DAYS.map((label, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const k = iso(d);
        return { label, v: vol(sessions.filter((s) => s.date === k)), on: k === activeDate };
      })
    : [3, 2, 1, 0].map((off) => ({ label: off ? `−${off} sem` : 'Esta', v: weekVol(sessions, off), on: off === 0 }));
  const top = Math.max(...bars.map((b) => b.v), 1);
  const avg = bars.reduce((t, b) => t + b.v, 0) / bars.length;
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">Actividad</h2>
        <span className={`text-sm ${muted}`}>Media {fmt(avg)} kg</span>
      </div>
      <div className="mt-3 flex gap-2">
        {[['1S', '1 semana'], ['1M', '1 mes']].map(([r, label]) => <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={`${chip(range === r)} flex-1`}>{label}</button>)}
      </div>
      <div className="mt-5">
        <div className="relative flex h-36 items-end gap-2">
          {avg > 0 && <div className="absolute inset-x-0 border-t border-dashed border-zinc-400" style={{ bottom: `${(avg / top) * 100}%` }} />}
          {bars.map((b) => <div key={b.label} title={`${fmt(b.v)} kg`} className={`relative flex-1 rounded-xl ${b.on ? 'bg-zinc-950 dark:bg-white' : 'bg-zinc-400 dark:bg-zinc-600'}`} style={{ height: `${Math.max(4, (b.v / top) * 100)}%` }} />)}
        </div>
        <div className="mt-2 flex gap-2">{bars.map((b) => <span key={b.label} className={`flex-1 text-center text-[11px] ${muted}`}>{b.label}</span>)}</div>
      </div>
    </section>
  );
}

export function Home({ go, routine, activeDate }) {
  const { sessions, routines, saveRoutines } = useGym();
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const mySessions = sessions;
  const done = mySessions.filter((x) => x.date === activeDate);
  const week = weekVol(mySessions, 0), prev = weekVol(mySessions, 1);
  const delta = prev ? ((week - prev) / prev) * 100 : null;
  const exercises = routines[routine];
  const create = () => {
    let n = 'Nueva rutina', i = 2;
    while (routines[n]) { n = `Nueva rutina ${i}`; i += 1; }
    saveRoutines({ ...routines, [n]: [] });
    go('inicio', n);
  };
  return (
    <div className="space-y-4">
      <Activity sessions={mySessions} activeDate={activeDate} />
      <Card>
        <div className={`flex items-center justify-between text-sm font-medium ${muted}`}>
          <span>Entrenamiento de hoy</span>
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => { setEditing(false); setImporting((v) => !v); }} aria-label="Importar rutina desde texto" aria-pressed={importing} className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">{importing ? <X size={16} /> : <FileText size={16} />}</button>
            <button type="button" onClick={() => { setImporting(false); setEditing((v) => !v); }} aria-label="Editar rutinas" aria-pressed={editing} className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">{editing ? <X size={16} /> : <Pencil size={16} />}</button>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(routines).map((r) => (
            <button key={r} type="button" onClick={() => go('inicio', r)} aria-pressed={r === routine}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${r === routine ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800'}`}>{r}</button>
          ))}
          {editing && <button type="button" onClick={create} aria-label="Nueva rutina" className="flex size-8 items-center justify-center rounded-full bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white"><Plus size={16} /></button>}
        </div>
        {importing ? <ImportRoutines onDone={(r) => { setImporting(false); go('inicio', r); }} /> : editing ? <RoutineEditor routine={routine} onSelect={(r) => go('inicio', r)} /> : (
          <>
            <p className="mt-4 text-3xl font-extrabold tracking-tight">{routine}</p>
            <p className={`mt-1 text-sm ${muted}`}>{exercises.length} ejercicios</p>
            {exercises.length === 0 && <p className={`mt-3 text-sm ${muted}`}>Pulsa el lápiz para añadir ejercicios.</p>}
            <ul className="mt-4 space-y-2 text-sm">
              {exercises.map((e) => (
                <li key={e.name} className="flex justify-between">
                  <span>{e.name} {e.targetReps && <span className="ml-1 text-xs text-zinc-950 dark:text-white">[{e.targetReps}]</span>}</span>
                  <b>{e.muscle}</b>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => go('entreno')} disabled={!exercises.length} className={`${primary} mt-5 !h-12`}>Empezar entreno</button>
          </>
        )}
      </Card>
      <section>
        <h2 className="text-xl font-bold tracking-tight">Entrenos realizados</h2>
        <div className="mt-3 space-y-2">
          {done.length === 0 && <p className={`text-sm ${muted}`}>Sin entrenos este día.</p>}
          {done.map((x) => (
            <button key={x.id} type="button" onClick={() => go('progreso')} className="flex h-14 w-full items-center justify-between rounded-2xl bg-zinc-200 px-5 text-left text-sm font-semibold dark:bg-zinc-800">
              <span>{x.name}</span><ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold tracking-tight">Métricas</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card className="!rounded-3xl !bg-zinc-700 !p-4 text-white dark:!bg-zinc-800">
            <p className="text-sm text-zinc-300">Racha</p>
            <p className="mt-2 text-2xl font-extrabold">{calcStreak(mySessions)} días</p>
          </Card>
          <Card className="!rounded-3xl !bg-zinc-700 !p-4 text-white dark:!bg-zinc-800">
            <p className="text-sm text-zinc-300">Volumen semanal</p>
            <p className="mt-2 text-2xl font-extrabold">{fmt(week)} kg</p>
            {delta !== null && <p className={`text-xs font-semibold ${delta < 0 ? 'text-rose-300' : 'text-zinc-300'}`}>{delta < 0 ? '−' : '+'}{fmt(Math.abs(delta), 1)} % vs. anterior</p>}
          </Card>
        </div>
      </section>
    </div>
  );
}

// Valores que se rellenan solos al elegir un ejercicio: lo configurado en la rutina y, si no hay, lo último que hiciste.
const startValues = (ex, last) => ({
  kg: ex && ex.defaultWeight !== '' && ex.defaultWeight !== undefined ? String(ex.defaultWeight) : last ? String(last.kg) : '',
  reps: ex?.targetReps?.split('×').pop().match(/\d+/)?.[0] || (last ? String(last.reps) : ''),
});

const ITEM = 64, MAX_REPS = 60;
// Regla deslizable: arrastra y se ajusta al número del centro.
function RepsPicker({ value, onChange }) {
  const ref = useRef(null);
  const fromScroll = useRef(false);
  const v = Math.min(MAX_REPS, Math.max(1, value));
  useEffect(() => {
    if (fromScroll.current) { fromScroll.current = false; return; }
    ref.current?.scrollTo({ left: (v - 1) * ITEM });
  }, [v]);
  const onScroll = (e) => {
    const n = Math.min(MAX_REPS, Math.max(1, Math.round(e.currentTarget.scrollLeft / ITEM) + 1));
    if (n !== v) { fromScroll.current = true; onChange(n); }
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') onChange(Math.min(MAX_REPS, v + 1));
    if (e.key === 'ArrowLeft') onChange(Math.max(1, v - 1));
  };
  return (
    <div ref={ref} onScroll={onScroll} onKeyDown={onKey} tabIndex={0} role="slider" aria-label="Repeticiones" aria-valuemin={1} aria-valuemax={MAX_REPS} aria-valuenow={v}
      className="mt-5 flex snap-x snap-mandatory items-end overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingInline: `calc(50% - ${ITEM / 2}px)` }}>
      {Array.from({ length: MAX_REPS }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" tabIndex={-1} onClick={() => onChange(n)} aria-label={`${n} repeticiones`} className="flex shrink-0 snap-center flex-col items-center" style={{ width: ITEM }}>
          <span className={n === v ? 'text-5xl font-extrabold leading-none' : `text-sm ${muted}`}>{n}</span>
          <span className={`mt-2 w-0.5 rounded bg-zinc-950 dark:bg-white ${n === v ? 'h-10' : 'h-5 opacity-30'}`} />
        </button>
      ))}
    </div>
  );
}

export function Workout({ routine, go, activeDate }) {
  const { addSession, sessions, routines, draft, saveDraft } = useGym();
  const exercises = routines[routine];
  const [name, setName] = useState(exercises[0]?.name || '');
  const [sets, setSets] = useState(() => (draft?.routine === routine && draft.date === activeDate ? draft.sets : []));
  const [input, setInput] = useState({ kg: '', reps: '' });
  const [rest, setRest] = useState(0);
  const [targetRest, setTargetRest] = useState(90);
  const wasResting = useRef(false);

  const currentEx = exercises.find((e) => e.name === name);
  const hasBase = currentEx?.defaultWeight !== '' && currentEx?.defaultWeight !== undefined;
  const last = [...sessions].reverse().flatMap((x) => [...x.sets].reverse()).find((x) => x.ex === name);
  const bestBefore = Math.max(0, ...sessions.flatMap((x) => x.sets).filter((x) => x.ex === name).map((x) => e1rm(x.kg, x.reps)));
  const mine = sets.map((x, idx) => ({ ...x, idx })).filter((x) => x.ex === name);
  const reps = Number(input.reps) || last?.reps || 10;
  const pending = exercises.filter((e) => !sets.some((x) => x.ex === e.name)).length;
  useEffect(() => { setInput(startValues(currentEx, last)); }, [name]);

  // Descanso: cuenta atrás y vibración al terminar.
  useEffect(() => {
    if (rest > 0) {
      wasResting.current = true;
      const t = setTimeout(() => setRest((r) => r - 1), 1000);
      return () => clearTimeout(t);
    }
    if (wasResting.current) { wasResting.current = false; navigator.vibrate?.([200, 100, 200]); }
    return undefined;
  }, [rest]);

  // El entreno a medias se guarda: si recargas la página no pierdes las series.
  const commit = (next) => {
    setSets(next);
    saveDraft(next.length ? { routine, date: activeDate, sets: next } : null);
  };

  const push = (kg, reps) => {
    if (!name || !(kg >= 0) || !(reps > 0)) return;
    const prior = Math.max(bestBefore, ...sets.filter((x) => x.ex === name).map((x) => e1rm(x.kg, x.reps)));
    const pr = bestBefore > 0 && e1rm(kg, reps) > prior;
    commit([...sets, { ex: name, muscle: currentEx?.muscle, kg, reps, ...(pr && { pr: true }) }]);
    setRest(90);
    setTargetRest(90);
  };

  const add = (event) => {
    event.preventDefault();
    const typed = input.kg.trim();
    const kg = typed !== '' ? Number(typed.replace(',', '.')) : hasBase ? Number(currentEx.defaultWeight) : last?.kg;
    push(kg, reps);
  };

  const adjustRest = (amount) => {
    setRest((r) => Math.max(0, r + amount));
    setTargetRest((t) => Math.max(15, t + amount));
  };

  const finish = () => {
    addSession({ date: activeDate || iso(), name: routine, sets });
    setSets([]);
    go('progreso');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-5xl font-extrabold leading-none">{pending}</span>
          <span className="text-sm leading-tight">Ejercicios<br />por hacer</span>
        </div>
        <button type="button" onClick={finish} disabled={!sets.length} className="h-10 rounded-full bg-zinc-200 px-4 text-sm font-semibold disabled:opacity-40 dark:bg-zinc-800">Terminar entreno</button>
      </div>

      {exercises.length === 0 && <p className={`text-sm ${muted}`}>Esta rutina no tiene ejercicios. Añádelos desde Inicio con el lápiz.</p>}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {exercises.map((e) => {
          const n = sets.filter((x) => x.ex === e.name).length, on = e.name === name;
          return (
            <button key={e.name} type="button" onClick={() => setName(e.name)} aria-pressed={on} className={`shrink-0 rounded-2xl px-4 py-3 text-left ${on ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
              <p className="text-sm font-semibold">{e.name}</p>
              <p className="text-xs opacity-60">{n} {n === 1 ? 'serie' : 'series'}</p>
            </button>
          );
        })}
      </div>

      {rest > 0 && (
        <Card>
          <Ring value={(rest / targetRest) * 100} size={200}>
            <span className="text-5xl font-extrabold">{rest}<span className="text-xl">s</span></span>
            <span className={`text-xs ${muted}`}>Descanso · {mmss(targetRest)}</span>
          </Ring>
          <div className="mt-5 flex justify-center gap-2">
            {[-15, 15].map((n) => <button key={n} type="button" onClick={() => adjustRest(n)} className={chip(false)}>{n < 0 ? '−' : '+'}15 s</button>)}
            <button type="button" onClick={() => setRest(0)} className={chip(true)}>Saltar</button>
          </div>
        </Card>
      )}

      <Card className="text-center">
        <p className="text-lg font-bold">Repeticiones hechas</p>
        {currentEx?.targetReps && <p className={`text-sm ${muted}`}>Objetivo: {currentEx.targetReps} reps {hasBase ? `(@ ${currentEx.defaultWeight} kg)` : ''}</p>}
        {last && <p className={`text-sm ${muted}`}>Última vez: {fmt(last.kg, 1)} kg × {last.reps}</p>}
        <RepsPicker value={reps} onChange={(n) => setInput((v) => ({ ...v, reps: String(n) }))} />
        <form onSubmit={add} className="mt-5 flex items-center gap-2">
          <input inputMode="decimal" aria-label="Kilos" placeholder={last ? `${fmt(last.kg, 1)} kg` : 'Kg'} value={input.kg} onChange={(e) => setInput((v) => ({ ...v, kg: e.target.value }))} className={`${field} w-full text-center`} />
          <button type="submit" disabled={!name} className={`${primary} !h-11 !w-auto shrink-0 px-6 !text-sm`}>Continuar →</button>
        </form>
      </Card>

      {mine.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">Series de {name}</h2>
          <ol className="mt-3 space-y-2">
            {mine.map((x, i) => (
              <li key={x.idx} className="flex h-14 items-center justify-between rounded-2xl bg-zinc-200 pl-5 pr-3 text-sm dark:bg-zinc-800">
                <b>Serie {i + 1}</b>
                <span className="flex items-center gap-2">
                  {x.pr && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400"><Trophy size={14} />Récord</span>}
                  {fmt(x.kg, 1)} kg × {x.reps}
                  <button type="button" onClick={() => commit(sets.filter((_, j) => j !== x.idx))} aria-label={`Quitar serie ${i + 1}`} className={trash}><X size={15} /></button>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => push(mine.at(-1).kg, mine.at(-1).reps)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"><Repeat size={15} />Repetir última serie</button>
        </section>
      )}
    </div>
  );
}

export function Progress() {
  const { sessions, goals, saveGoals, deleteSession } = useGym();
  const [ex, setEx] = useState('');
  const [editing, setEditing] = useState(false);
  const names = [...new Set(sessions.flatMap((s) => s.sets.map((x) => x.ex)))];
  const sel = names.includes(ex) ? ex : names[0];
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const pts = ordered
    .map((s) => ({ date: s.date, v: Math.max(0, ...s.sets.filter((x) => x.ex === sel).map((x) => e1rm(x.kg, x.reps))) }))
    .filter((p) => p.v > 0);
  const hi = Math.max(...pts.map((p) => p.v)), lo = Math.min(...pts.map((p) => p.v));
  const line = pts.map((p, i) => `${pts.length > 1 ? 6 + i * (298 / (pts.length - 1)) : 155},${110 - ((p.v - lo) / (hi - lo || 1)) * 90}`).join(' ');
  const gain = pts.length > 1 ? ((pts.at(-1).v - pts[0].v) / pts[0].v) * 100 : 0;
  const counts = weekSets(sessions);
  const weekly = goals.weekly || {};
  const setCap = (m, v) => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    const next = { ...weekly };
    if (n) next[m] = n; else delete next[m];
    saveGoals({ weekly: next });
  };
  const recent = [...ordered].reverse().slice(0, 8);
  const capTotal = Object.values(weekly).reduce((t, n) => t + n, 0);
  const weekPct = capTotal ? (Object.entries(weekly).reduce((t, [m, c]) => t + Math.min(counts[m] || 0, c), 0) / capTotal) * 100 : 0;
  const records = sessions.flatMap((x) => x.sets).filter((y) => y.pr).length;

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-center text-xl font-bold">Esta semana</p>
        <div className="mt-4">
          <Ring value={weekPct} size={190}>
            <span className="text-5xl font-extrabold">{Math.round(weekPct)}%</span>
            <span className={`text-xs ${muted}`}>de tus topes</span>
          </Ring>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card className="!rounded-3xl !bg-zinc-700 !p-4 text-white dark:!bg-zinc-800"><p className="text-sm text-zinc-300">Series</p><p className="mt-2 text-2xl font-extrabold">{Object.values(counts).reduce((t, n) => t + n, 0)}</p><p className="text-xs text-zinc-300">esta semana</p></Card>
        <Card className="!rounded-3xl !bg-zinc-700 !p-4 text-white dark:!bg-zinc-800"><p className="text-sm text-zinc-300">Récords</p><p className="mt-2 text-2xl font-extrabold">{records}</p><p className="text-xs text-zinc-300">en total</p></Card>
      </div>
      <Card>
        {pts.length === 0 ? (
          <p className={`text-sm ${muted}`}>Aún no hay entrenos. Termina uno para ver tu evolución.</p>
        ) : (
          <>
            <label htmlFor="pex" className={`text-sm font-medium ${muted}`}>1RM estimado</label>
            <select id="pex" value={sel} onChange={(e) => setEx(e.target.value)} className={`${field} mt-2 w-full`}>{names.map((n) => <option key={n}>{n}</option>)}</select>
            <p className={`mt-3 text-3xl font-extrabold tracking-tight ${good}`}>{fmt(pts.at(-1).v, 1)} kg</p>
            <p className={`text-sm font-semibold ${gain < 0 ? bad : good}`}>{gain < 0 ? '−' : '+'}{fmt(Math.abs(gain), 1)} % desde el primer entreno</p>
            <svg viewBox="0 0 310 120" className="mt-3 w-full text-zinc-950 dark:text-white" role="img" aria-label={`Evolución del 1RM estimado de ${sel}`}>
              <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className={`flex justify-between text-xs ${muted}`}><span>{shortDate(pts[0].date)}</span><span>{shortDate(pts.at(-1).date)}</span></div>
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold">Series por músculo</p>
            <p className={`text-sm ${muted}`}>Esta semana · tope de series</p>
          </div>
          <button type="button" onClick={() => setEditing((v) => !v)} aria-label="Editar topes" aria-pressed={editing} className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">{editing ? <X size={16} /> : <Pencil size={16} />}</button>
        </div>
        {editing ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {MUSCLES.map((m) => (
              <label key={m} className={`text-xs font-medium ${muted}`}>{m} (0 = sin tope)
                <input inputMode="numeric" value={weekly[m] ?? ''} onChange={(e) => setCap(m, e.target.value)} className={`${field} mt-1 w-full`} />
              </label>
            ))}
          </div>
        ) : Object.keys(weekly).length === 0 ? (
          <p className={`mt-3 text-sm ${muted}`}>No hay topes. Pulsa el lápiz para fijar uno por músculo.</p>
        ) : Object.entries(weekly).map(([m, cap]) => {
          const n = counts[m] || 0, pct = (n / cap) * 100;
          return (
            <div key={m} className="mt-4">
              <div className="mb-2 flex justify-between text-sm"><b>{m}</b><span className={n > cap ? `font-semibold ${bad}` : muted}>{n} / {cap}{n > cap ? ' · Superado' : ''}</span></div>
              <Bar value={pct} color={pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-zinc-500' : 'bg-zinc-2000'} />
            </div>
          );
        })}
      </Card>

      {recent.length > 0 && (
        <Card className="!py-2">
          <p className="py-3 font-bold">Historial</p>
          {recent.map((x) => {
            const vol = x.sets.reduce((t, y) => t + y.kg * y.reps, 0), prs = x.sets.filter((y) => y.pr).length;
            return (
              <div key={x.id} className="flex items-center justify-between gap-3 border-b border-zinc-300 py-3 last:border-0 dark:border-zinc-700">
                <div className="min-w-0">
                  <p className="font-bold">{x.name}</p>
                  <p className={`text-sm ${muted}`}>{shortDate(x.date)} · {x.sets.length} series · {fmt(vol)} kg{prs > 0 ? ` · ${prs} ${prs === 1 ? 'récord' : 'récords'}` : ''}</p>
                </div>
                <button type="button" onClick={() => { if (window.confirm('¿Eliminar este entreno?')) deleteSession(x.id); }} aria-label={`Eliminar entreno del ${shortDate(x.date)}`} className={trash}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

const macros = [['Proteína', 'p', 'bg-zinc-950 dark:bg-white'], ['Carbohidratos', 'c', 'bg-zinc-600 dark:bg-zinc-300'], ['Grasas', 'g', 'bg-zinc-400 dark:bg-zinc-500']];
const blank = { type: 'Desayuno', name: '', kcal: '', p: '', c: '', g: '' };
const blankRecipe = { ...blank, desc: '' };

export function Diet({ activeDate }) {
  const { meals, goals, recipes = [], addMeal, deleteMeal, saveGoals, saveRecipes, cravings = {}, saveCraving } = useGym();
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState(false);
  const myGoals = goals;
  const [g, setG] = useState(myGoals);
  
  useEffect(() => setG(myGoals), [goals]);

  const [editingRecipes, setEditingRecipes] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ id: '', ...blankRecipe });
  
  const currentDate = activeDate || iso();
  const [craving, setCraving] = useState('');
  useEffect(() => setCraving(cravings[currentDate] || ''), [currentDate, cravings]);
  const submitCraving = (event) => {
    event.preventDefault();
    saveCraving(currentDate, craving);
  };
  const list = meals.filter((m) => m.date === currentDate);
  const prevDay = new Date(`${currentDate}T00:00`);
  prevDay.setDate(prevDay.getDate() - 1);
  const yesterday = meals.filter((m) => m.date === iso(prevDay));
  const copyYesterday = () => yesterday.forEach(({ type, name, kcal, p, c, g }) => addMeal({ date: currentDate, type, name, kcal, p, c, g }));
  const tot = list.reduce((t, m) => ({ kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, g: t.g + m.g }), { kcal: 0, p: 0, c: 0, g: 0 });
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const setR = (k) => (e) => setRecipeForm((v) => ({ ...v, [k]: e.target.value }));
  
  const submitGoals = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(['kcal', 'p', 'c', 'g'].map((k) => [k, Number(g[k])]));
    if (Object.values(next).some((v) => !(v > 0))) return;
    saveGoals(next);
    setEditing(false);
  };
  
  const submit = (event) => {
    event.preventDefault();
    if (!f.name.trim() || !(Number(f.kcal) >= 0) || f.kcal === '') return;
    addMeal({ date: currentDate, type: f.type, name: f.name.trim(), kcal: Number(f.kcal), p: Number(f.p) || 0, c: Number(f.c) || 0, g: Number(f.g) || 0 });
    setF({ ...blank, type: f.type });
  };

  const loadRecipe = (r) => setF({ ...blank, type: r.type, name: r.name, kcal: r.kcal, p: r.p, c: r.c, g: r.g });

  const submitRecipe = (e) => {
    e.preventDefault();
    if (!recipeForm.name.trim() || !(Number(recipeForm.kcal) >= 0) || recipeForm.kcal === '') return;
    const newR = {
      id: recipeForm.id || crypto.randomUUID(),
      type: recipeForm.type,
      name: recipeForm.name.trim(),
      desc: recipeForm.desc?.trim() || '',
      kcal: Number(recipeForm.kcal),
      p: Number(recipeForm.p) || 0,
      c: Number(recipeForm.c) || 0,
      g: Number(recipeForm.g) || 0
    };
    if (recipeForm.id) saveRecipes(recipes.map(r => r.id === recipeForm.id ? newR : r));
    else saveRecipes([...recipes, newR]);
    setRecipeForm({ id: '', ...blankRecipe, type: recipeForm.type });
  };

  const deleteRecipe = (id) => saveRecipes(recipes.filter(r => r.id !== id));
  const editRecipe = (r) => setRecipeForm({ ...r, desc: r.desc || '' });
  
  return (
    <div className="space-y-3">
      <Card>
        <p className={`text-sm font-medium ${muted}`}>Lo que me apetece comer</p>
        <form onSubmit={submitCraving} className="mt-3 flex gap-2">
          <input aria-label="Qué te apetece comer" placeholder="Ej. pollo con arroz" value={craving} maxLength={80} onChange={(e) => setCraving(e.target.value)} className={`${field} w-full min-w-0`} />
          <button type="submit" aria-label="Guardar lo que me apetece" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white"><Check size={18} /></button>
        </form>
      </Card>
      <Card>
        <div className={`flex items-center justify-between text-sm font-medium ${muted}`}><span>Calorías del día</span><span className="flex items-center gap-1"><button type="button" onClick={() => { setG(myGoals); setEditing((v) => !v); }} aria-label="Editar objetivo" aria-pressed={editing} className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">{editing ? <X size={16} /> : <Pencil size={16} />}</button><Utensils size={18} /></span></div>
        <p className="mt-3 text-3xl font-extrabold tracking-tight">{fmt(tot.kcal)} kcal</p>
        <p className={`mb-4 mt-1 text-sm ${muted}`}>de {fmt(myGoals.kcal)} · te quedan {fmt(Math.max(0, myGoals.kcal - tot.kcal))}</p>
        <Ring value={(tot.kcal / myGoals.kcal) * 100} size={170}><span className="text-4xl font-extrabold">{fmt(tot.kcal)}</span><span className={`text-xs ${muted}`}>kcal</span></Ring>
        <div className="mt-4 space-y-3">
          {macros.map(([label, k, color]) => (
            <div key={k}>
              <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><b>{fmt(tot[k])} / {fmt(myGoals[k])} g</b></div>
              <Bar value={(tot[k] / myGoals[k]) * 100} color={color} />
            </div>
          ))}
        </div>
        {editing && (
          <form onSubmit={submitGoals} className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-300 pt-4 dark:border-zinc-700">
            {[['kcal', 'Calorías (kcal)'], ['p', 'Proteína (g)'], ['c', 'Carbohidratos (g)'], ['g', 'Grasas (g)']].map(([k, label]) => (
              <label key={k} className={`text-xs font-medium ${muted}`}>{label}
                <input inputMode="numeric" value={g[k]} onChange={(e) => setG((v) => ({ ...v, [k]: e.target.value }))} className={`${field} mt-1 w-full`} />
              </label>
            ))}
            <button type="submit" className={`${primary} col-span-2 !h-12`}>Guardar objetivo</button>
          </form>
        )}
      </Card>
      
      <Card className="!py-2">
        {list.length === 0 && (
          <div className="py-3 text-sm">
            <p className={muted}>Todavía no has añadido comidas en este día.</p>
            {yesterday.length > 0 && <button type="button" onClick={copyYesterday} className="mt-2 font-semibold text-zinc-950 dark:text-white">Copiar las {yesterday.length} comidas del día anterior</button>}
          </div>
        )}
        {list.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 border-b border-zinc-300 py-3 last:border-0 dark:border-zinc-700">
            <div className="min-w-0"><p className="font-bold">{m.type}</p><p className={`truncate text-sm ${muted}`}>{m.name}</p></div>
            <div className="flex shrink-0 items-center gap-2">
              <b className="text-sm">{fmt(m.kcal)} kcal</b>
              <button type="button" onClick={() => deleteMeal(m.id)} aria-label={`Eliminar ${m.name}`} className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div className="flex items-center justify-between font-bold">
          <p>{editingRecipes ? 'Gestionar recetas' : 'Añadir comida'}</p>
          <button type="button" onClick={() => { setEditingRecipes(!editingRecipes); setRecipeForm({ id: '', ...blankRecipe }); }} aria-label="Gestionar recetas" className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
            {editingRecipes ? <X size={16} /> : <Pencil size={16} />}
          </button>
        </div>

        {editingRecipes ? (
          <div className="mt-4 space-y-4">
            <form onSubmit={submitRecipe} className="space-y-3 rounded-2xl bg-zinc-200/60 p-3 dark:bg-zinc-800/50">
              <p className="text-sm font-semibold">{recipeForm.id ? 'Editando sugerencia' : 'Nueva receta'}</p>
              <div className="flex gap-2">
                <select aria-label="Tipo" value={recipeForm.type} onChange={setR('type')} className={`${field} shrink-0`}>{['Desayuno', 'Comida', 'Merienda', 'Cena'].map((t) => <option key={t}>{t}</option>)}</select>
                <input aria-label="Nombre" placeholder="Nombre" value={recipeForm.name} onChange={setR('name')} className={`${field} w-full min-w-0 bg-white dark:bg-zinc-900`} />
              </div>
              <input aria-label="Descripción" placeholder="Descripción breve (opcional)" value={recipeForm.desc} onChange={setR('desc')} className={`${field} w-full bg-white dark:bg-zinc-900`} />
              <div className="grid grid-cols-4 gap-2">
                {[['kcal', 'kcal'], ['p', 'Prot.'], ['c', 'Carb.'], ['g', 'Grasa']].map(([k, label]) => (
                  <input key={k} inputMode="decimal" aria-label={label} placeholder={label} value={recipeForm[k]} onChange={setR(k)} className={`${field} w-full min-w-0 bg-white px-2 text-center dark:bg-zinc-900`} />
                ))}
              </div>
              <div className="flex gap-2">
                {recipeForm.id && <button type="button" onClick={() => setRecipeForm({ id: '', ...blankRecipe })} className="h-11 w-full rounded-2xl bg-slate-200 font-bold text-slate-700 dark:bg-zinc-700 dark:text-slate-200">Cancelar</button>}
                <button type="submit" className={`${primary} !h-11 ${!recipeForm.id ? 'w-full' : ''}`}>{recipeForm.id ? 'Guardar' : 'Crear receta'}</button>
              </div>
            </form>

            <div className="space-y-2">
              {recipes.length === 0 && <p className={`text-sm ${muted}`}>No hay recetas guardadas.</p>}
              {recipes.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-2xl border border-zinc-300 px-3 py-2 dark:border-zinc-700">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{r.name}</p>
                    {r.desc && <p className={`truncate text-xs ${muted} mb-1`}>{r.desc}</p>}
                    <p className={`text-xs font-semibold text-zinc-950 dark:text-white`}>{r.kcal} kcal · {r.p}g P</p>
                  </div>
                  <div className="flex shrink-0 gap-1 pl-2">
                    <button type="button" onClick={() => editRecipe(r)} className="p-2 text-slate-400 hover:text-zinc-700"><Pencil size={15} /></button>
                    <button type="button" onClick={() => deleteRecipe(r.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3">
              <p className={`mb-2 text-xs font-medium ${muted}`}>Sugerencias</p>
              {recipes.length > 0 ? (
                <div className="flex snap-x gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {recipes.map((r) => (
                    <button 
                      key={r.id} 
                      type="button" 
                      onClick={() => loadRecipe(r)}
                      className="shrink-0 snap-start rounded-2xl bg-zinc-200 px-3 py-2 text-left transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 max-w-[200px]"
                    >
                      <p className="truncate text-sm font-bold text-zinc-700 dark:text-zinc-200">{r.name}</p>
                      {r.desc && <p className="truncate text-xs text-zinc-700 dark:text-zinc-200">{r.desc}</p>}
                      <p className="mt-1 text-xs font-medium text-zinc-950 dark:text-white">{r.kcal} kcal · {r.p}g P</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>No hay recetas. Toca el lápiz de arriba para añadir una.</p>
              )}
            </div>

            <form onSubmit={submit} className="mt-2 space-y-3">
              <div className="flex gap-2">
                <select aria-label="Tipo de comida" value={f.type} onChange={set('type')} className={`${field} shrink-0`}>{['Desayuno', 'Comida', 'Merienda', 'Cena'].map((t) => <option key={t}>{t}</option>)}</select>
                <input aria-label="Qué has comido" placeholder="Qué has comido" value={f.name} onChange={set('name')} className={`${field} w-full min-w-0`} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[['kcal', 'kcal'], ['p', 'Prot. g'], ['c', 'Carb. g'], ['g', 'Grasa g']].map(([k, label]) => (
                  <input key={k} inputMode="decimal" aria-label={label} placeholder={label} value={f[k]} onChange={set(k)} className={`${field} w-full min-w-0 px-2 text-center`} />
                ))}
              </div>
              <button type="submit" className={`${primary} !h-12`}>Añadir comida</button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}