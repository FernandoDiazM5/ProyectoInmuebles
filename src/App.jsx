import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader } from 'lucide-react';
import { auth, db } from './services/firebase';
import LoginView from './components/Auth/LoginView';
import SetupView from './components/Auth/SetupView';
import SistemaInmuebles from './components/SistemaInmuebles';

// Estado de autenticación:
//   'loading'          → esperando respuesta de Firebase
//   'unauthenticated'  → sin sesión → mostrar Login
//   'needs_setup'      → autenticado pero sin perfil en Firestore → mostrar Setup
//   'authenticated'    → autenticado con perfil completo → mostrar Sistema

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Cargando sistema…</p>
      </div>
    </div>
  );
}

export default function App() {
  const [authState, setAuthState]       = useState('loading');   // ver estados arriba
  const [firebaseUser, setFirebaseUser] = useState(null);        // objeto de Firebase Auth
  const [currentUser, setCurrentUser]   = useState(null);        // perfil completo + rol

  // Cargar (o recargar) el perfil desde Firestore
  const loadProfile = async (fbUser) => {
    if (!fbUser) { setAuthState('unauthenticated'); return; }

    const snap = await getDoc(doc(db, 'users', fbUser.uid));

    if (!snap.exists()) {
      // Autenticado pero sin perfil → SetupView
      setFirebaseUser(fbUser);
      setAuthState('needs_setup');
      return;
    }

    const data = snap.data();
    setCurrentUser({
      id:    fbUser.uid,
      email: fbUser.email,
      name:  data.name,
      role:  data.role,          // 'agent' | 'tenant' | 'owner'
      phone: data.phone || '',
      ...data,
    });
    setAuthState('authenticated');
  };

  useEffect(() => {
    // Se dispara al iniciar, en login, logout y al recargar la página
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        await loadProfile(fbUser);
      } catch (err) {
        console.error('Auth error:', err);
        setAuthState('unauthenticated');
      }
    });
    return unsubscribe;
  }, []);

  // Handler que llama SetupView cuando el perfil se acaba de crear
  const handleProfileCreated = async () => {
    await loadProfile(firebaseUser);
  };

  // ── Render según estado ──────────────────────────────────────
  if (authState === 'loading')         return <LoadingScreen />;
  if (authState === 'unauthenticated') return <LoginView />;
  if (authState === 'needs_setup')     return (
    <SetupView
      firebaseUser={firebaseUser}
      onProfileCreated={handleProfileCreated}
    />
  );

  // authState === 'authenticated'
  return (
    <SistemaInmuebles
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
    />
  );
}
