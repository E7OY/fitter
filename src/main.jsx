import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AuthScreen from './AuthScreen';
import { auth } from './auth';
import { GymProvider } from './store';
import './index.css';

document.documentElement.classList.toggle('dark', localStorage.getItem('gym-theme') !== 'light');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error) => console.error('No se pudo registrar el service worker de fitter.', error));
  });
}

function Root() {
  const [user, setUser] = useState(() => auth.current());
  if (!user) return <AuthScreen onAuth={setUser} />;
  return (
    <GymProvider key={user.id} user={user} logout={() => { auth.logout(); setUser(null); }}>
      <App />
    </GymProvider>
  );
}

createRoot(document.getElementById('root')).render(<Root />);