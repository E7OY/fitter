// Cuentas guardadas en este dispositivo. La contraseña nunca se guarda: solo un hash PBKDF2 con sal.
// Para tener cuentas entre dispositivos, sustituye estas 4 funciones por tu backend (Supabase, Firebase...).
const USERS = 'gym-users', SESSION = 'gym-session';
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const read = () => { try { return JSON.parse(localStorage.getItem(USERS)) || []; } catch { return []; } };
const pub = ({ id, name, email }) => ({ id, name, email });

const hash = async (password, salt) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: 150000 }, key, 256);
  return b64(bits);
};

export const auth = {
  current() {
    const user = read().find((u) => u.id === localStorage.getItem(SESSION));
    return user ? pub(user) : null;
  },
  async register(name, email, password) {
    name = name.trim();
    email = email.trim().toLowerCase();
    if (!name) throw new Error('Escribe tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El email no es válido.');
    if (password.length < 6) throw new Error('La contraseña necesita al menos 6 caracteres.');
    const users = read();
    if (users.some((u) => u.email === email)) throw new Error('Ya existe una cuenta con ese email.');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const user = { id: crypto.randomUUID(), name, email, salt, hash: await hash(password, salt) };
    localStorage.setItem(USERS, JSON.stringify([...users, user]));
    localStorage.setItem(SESSION, user.id);
    return pub(user);
  },
  async login(email, password) {
    const user = read().find((u) => u.email === email.trim().toLowerCase());
    if (!user || (await hash(password, user.salt)) !== user.hash) throw new Error('Email o contraseña incorrectos.');
    localStorage.setItem(SESSION, user.id);
    return pub(user);
  },
  logout() { localStorage.removeItem(SESSION); },
};