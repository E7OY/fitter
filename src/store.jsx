import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_ROUTINES } from './lib';

const DEFAULT_RECIPES = [
  { id: 'r1', name: 'Tortitas de avena', desc: 'Avena, claras y plátano batido', type: 'Desayuno', kcal: 350, p: 20, c: 45, g: 8 },
  { id: 'r2', name: 'Pollo, arroz y brócoli', desc: 'Comida clásica de volumen', type: 'Comida', kcal: 450, p: 40, c: 55, g: 5 },
  { id: 'r3', name: 'Yogur proteico y nueces', desc: 'Yogur natural con un puñado de nueces', type: 'Merienda', kcal: 250, p: 20, c: 10, g: 14 },
  { id: 'r4', name: 'Salmón a la plancha', desc: 'Con guarnición de espárragos', type: 'Cena', kcal: 400, p: 35, c: 0, g: 25 },
];
const defaultGoals = { kcal: 2400, p: 160, c: 260, g: 70, weekly: { Pecho: 16, Espalda: 16, Piernas: 14, Hombro: 12, Brazos: 10 } };
const blank = () => ({ routines: DEFAULT_ROUTINES, sessions: [], meals: [], recipes: DEFAULT_RECIPES, goals: defaultGoals, cravings: {}, draft: null });

// Datos de la versión con perfiles: se pasan una sola vez a la primera cuenta que se cree.
const migrateLegacy = () => {
  try {
    const old = JSON.parse(localStorage.getItem('gym-data'));
    if (!old || localStorage.getItem('gym-legacy-done')) return null;
    localStorage.setItem('gym-legacy-done', '1');
    const pid = old.activeProfileId || 'p1';
    const mine = (x) => !x.profileId || x.profileId === pid;
    const goals = old.goals?.[pid] || old.goals?.p1 || old.goals || {};
    return {
      ...blank(),
      routines: old.routines || DEFAULT_ROUTINES,
      recipes: old.recipes || DEFAULT_RECIPES,
      sessions: (old.sessions || []).filter(mine),
      meals: (old.meals || []).filter(mine),
      goals: { ...defaultGoals, ...goals },
      cravings: old.cravings?.[pid] || {},
    };
  } catch { return null; }
};

const Ctx = createContext(null);

export const GymProvider = ({ user, logout, children }) => {
  const key = `gym-data:${user.id}`;
  const [data, setData] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved) return { ...blank(), ...saved };
    } catch { /* datos corruptos: se empieza de cero */ }
    return migrateLegacy() || blank();
  });

  useEffect(() => { localStorage.setItem(key, JSON.stringify(data)); }, [key, data]);

  const up = (fn) => setData((d) => ({ ...d, ...fn(d) }));
  const api = {
    ...data,
    user,
    logout,
    addSession: (s) => up((d) => ({ sessions: [...d.sessions, { id: crypto.randomUUID(), ...s }], draft: null })),
    deleteSession: (id) => up((d) => ({ sessions: d.sessions.filter((s) => s.id !== id) })),
    addMeal: (m) => up((d) => ({ meals: [...d.meals, { id: crypto.randomUUID(), ...m }] })),
    deleteMeal: (id) => up((d) => ({ meals: d.meals.filter((m) => m.id !== id) })),
    saveRoutines: (routines) => up(() => ({ routines })),
    saveGoals: (goals) => up((d) => ({ goals: { ...d.goals, ...goals } })),
    saveRecipes: (recipes) => up(() => ({ recipes })),
    // Entreno a medias: sobrevive a recargas de la página.
    saveDraft: (draft) => up(() => ({ draft })),
    // Lo que te apetece comer cada día: { [fecha]: texto }
    saveCraving: (date, text) => up((d) => {
      const next = { ...d.cravings };
      if (text.trim()) next[date] = text.trim(); else delete next[date];
      return { cravings: next };
    }),
    exportData: () => {
      const blob = new Blob([JSON.stringify({ app: 'gym', version: 2, data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gym-copia-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    importData: (text) => {
      const parsed = JSON.parse(text);
      const incoming = parsed?.data;
      if (parsed?.app !== 'gym' || !incoming || !Array.isArray(incoming.sessions)) throw new Error('El archivo no es una copia válida.');
      setData({ ...blank(), ...incoming });
    },
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useGym = () => useContext(Ctx);