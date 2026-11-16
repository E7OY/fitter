import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AuthScreen from './AuthScreen';
import { auth } from './auth';
import { GymProvider } from './store';
import './index.css';

document.documentElement.classList.toggle('dark', localStorage.getItem('gym-theme') !== 'light');

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