export const fmt = (n, d = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d, useGrouping: 'always' }).format(n);
export const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const e1rm = (kg, reps) => kg * (1 + reps / 30);
export const MUSCLES = ['Pecho', 'Espalda', 'Hombro', 'Piernas', 'Brazos', 'Core'];
export const DEFAULT_ROUTINES = {
  Empuje: [
    { name: 'Press banca', muscle: 'Pecho', targetSets: 4, targetReps: '6-8' },
    { name: 'Press militar', muscle: 'Hombro', targetSets: 3, targetReps: '8-10' },
    { name: 'Fondos', muscle: 'Pecho', targetSets: 3, targetReps: '10-12' },
  ],
  'Tirón': [
    { name: 'Dominadas', muscle: 'Espalda', targetSets: 4, targetReps: '6-8' },
    { name: 'Remo con barra', muscle: 'Espalda', targetSets: 4, targetReps: '8-10' },
    { name: 'Curl bíceps', muscle: 'Brazos', targetSets: 3, targetReps: '10-12' },
  ],
  Pierna: [
    { name: 'Sentadilla', muscle: 'Piernas', targetSets: 4, targetReps: '6-8' },
    { name: 'Peso muerto rumano', muscle: 'Piernas', targetSets: 3, targetReps: '8-10' },
    { name: 'Prensa', muscle: 'Piernas', targetSets: 3, targetReps: '10-12' },
  ],
};

// Generación de código de amigo (sin exponer email)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generateFriendCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const body = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  return `GYM-${body}`;
};
export const friendCodeOf = (user) => {
  if (!user) return 'GYM-000000';
  if (user.friendCode) return user.friendCode;
  const clean = String(user.id || user.name || '000000').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `GYM-${clean.slice(0, 6).padEnd(6, '0')}`;
};

// Para entrenos guardados antes de que cada serie llevara su músculo.
const legacy = Object.fromEntries(Object.values(DEFAULT_ROUTINES).flat().map((e) => [e.name, e.muscle]));
export const todayRoutine = (routines) => {
  const keys = Object.keys(routines);
  return keys[(new Date().getDay() + 6) % keys.length];
};
const weekStart = (off = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * off);
  return d;
};
export const weekVol = (sessions, off = 0) => {
  const a = iso(weekStart(off)), b = iso(weekStart(off - 1));
  return sessions.filter((s) => s.date >= a && s.date < b)
    .reduce((t, s) => t + s.sets.reduce((u, x) => u + x.kg * x.reps, 0), 0);
};
export const weekSets = (sessions) => {
  const a = iso(weekStart(0)), counts = {};
  sessions.filter((s) => s.date >= a).forEach((s) => s.sets.forEach((x) => {
    const m = x.muscle || legacy[x.ex];
    if (m) counts[m] = (counts[m] || 0) + 1;
  }));
  return counts;
};
export const calcStreak = (sessions) => {
  const days = new Set(sessions.map((s) => s.date));
  const d = new Date();
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(iso(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
};

// ---- Importar una rutina pegada como texto (por ejemplo desde Notas) ----
const DAY = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i;
const BULLET = /^([-*•–·]|\d+[.)])\s+/;
const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// El orden importa: "curl femoral" y "peso muerto rumano" son de Piernas, no de Brazos ni Espalda.
const MUSCLE_WORDS = [
  ['Piernas', ['sentadilla', 'prensa', 'zancada', 'femoral', 'rumano', 'cuadriceps', 'gemelo', 'gluteo', 'hip thrust', 'pierna']],
  ['Pecho', ['banca', 'pecho', 'apertura', 'fondos', 'cruce', 'flexion', 'pec deck']],
  ['Espalda', ['dominada', 'remo', 'jalon', 'espalda', 'pull', 'dorsal', 'lumbar', 'peso muerto']],
  ['Hombro', ['militar', 'hombro', 'elevacion', 'pajaro', 'face pull', 'arnold']],
  ['Brazos', ['curl', 'biceps', 'triceps', 'martillo', 'frances', 'predicador']],
  ['Core', ['abdominal', 'plancha', 'core', 'crunch', 'rueda']],
];
const guessMuscle = (name) => {
  const n = norm(name);
  return MUSCLE_WORDS.find(([, words]) => words.some((w) => n.includes(w)))?.[0] || null;
};
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Devuelve [{ name, exercises: [{ name, muscle, targetSets, targetReps, defaultWeight, review }] }]
export function parseRoutines(text) {
  const lines = text.split(/\r?\n/);
  const routines = [];
  let cur = null, blockStart = true;
  const start = (name) => { cur = { name, exercises: [] }; routines.push(cur); };
  const looksLikeExercise = (l) => !!l && (BULLET.test(l.trim()) || /\d/.test(l));

  lines.forEach((raw, i) => {
    let line = raw.trim();
    if (!line) { blockStart = true; return; }
    const first = blockStart;
    blockStart = false;
    if (/^(notas?|descanso|calentamiento|objetivo)\b/.test(norm(line))) return;

    const bullet = BULLET.test(line);
    const hashed = /^#+\s*/.test(line);
    line = line.replace(BULLET, '').replace(/^#+\s*/, '').trim();

    const sets = line.match(/(\d+)\s*(?:[x×*]|series?\s*(?:de|x)?)\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
    const kg = line.match(/(\d+(?:[.,]\d+)?)\s*(?:kgs?|kilos?)\b/i);
    const colon = /[:：]$/.test(line);
    const shouting = line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line);
    const header = hashed || (!bullet && !sets && !kg && (colon || DAY.test(line) || shouting || (first && !/\d/.test(line) && looksLikeExercise(lines[i + 1]))));

    if (header) {
      const title = line.replace(/[:：]+$/, '').trim();
      const rest = title.replace(DAY, '').replace(/^[\s\-–:·.,]+/, '').trim();
      const t = rest || title;
      start(cap(t === t.toUpperCase() ? t.toLowerCase() : t));
      return;
    }

    let name = line;
    let targetSets = '', targetReps = '', defaultWeight = '';
    if (sets) {
      targetSets = Number(sets[1]);
      targetReps = sets[2].replace(/\s/g, '');
      name = name.replace(sets[0], ' ');
    }
    if (kg) { defaultWeight = Number(kg[1].replace(',', '.')); name = name.replace(kg[0], ' '); }
    name = name.replace(/[@()]/g, ' ').replace(/\s+/g, ' ').replace(/\s+(con|a|de)\s*$/i, '').replace(/^[\s\-–:·,.]+|[\s\-–:·,.]+$/g, '');
    if (!/[a-záéíóúñ]/i.test(name)) return;
    if (!cur) start('Rutina importada');
    const muscle = guessMuscle(name);
    cur.exercises.push({ name: cap(name), muscle: muscle || MUSCLES[0], targetSets, targetReps, defaultWeight, review: !muscle });
  });
  return routines.filter((r) => r.exercises.length);
}