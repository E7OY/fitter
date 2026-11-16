import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { auth } from './auth';
import { Card, field, muted, primary } from './ui';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(() => (localStorage.getItem('gym-users') ? 'login' : 'register'));
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const register = mode === 'register';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      onAuth(register ? await auth.register(f.name, f.email, f.password) : await auth.login(f.email, f.password));
    } catch (err) {
      setError(err.message || 'No se pudo completar. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-black dark:text-white">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <span className="flex size-12 items-center justify-center rounded-full bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white"><Dumbbell size={22} /></span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{register ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
        <p className={`mt-1 text-sm ${muted}`}>{register ? 'Tus entrenos, comidas y objetivos quedan guardados en tu cuenta.' : 'Entra para continuar con tus entrenos.'}</p>
        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-3">
            {register && <input aria-label="Nombre" placeholder="Nombre" value={f.name} onChange={set('name')} maxLength={40} autoComplete="name" className={`${field} w-full`} />}
            <input aria-label="Email" type="email" placeholder="Email" value={f.email} onChange={set('email')} autoComplete="email" required className={`${field} w-full`} />
            <input aria-label="Contraseña" type="password" placeholder="Contraseña" value={f.password} onChange={set('password')} autoComplete={register ? 'new-password' : 'current-password'} required className={`${field} w-full`} />
            {error && <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            <button type="submit" disabled={busy} className={primary}>{register ? 'Crear cuenta' : 'Entrar'}</button>
          </form>
        </Card>
        <button type="button" onClick={() => { setMode(register ? 'login' : 'register'); setError(''); }} className="mt-4 text-center text-sm font-semibold text-zinc-950 dark:text-white">
          {register ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}
        </button>
      </main>
    </div>
  );
}