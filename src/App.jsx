import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader } from 'lucide-react';
import { auth, db } from './services/firebase';
import { logoutUser } from './services/authService';
import LoginView from './components/Auth/LoginView';
import SetupView from './components/Auth/SetupView';
import RegisterTenantView from './components/Auth/RegisterTenantView';
import SistemaInmuebles from './components/SistemaInmuebles';

// Estados:
//   'loading'       → esperando Firebase
//   'unauthenticated' → sin sesión → Login
//   'registering'   → usuario quiere crear cuenta de arrendatario
//   'needs_setup'   → autenticado pero sin perfil Firestore → Setup
//   'authenticated' → autenticado con perfil completo → Sistema

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
  const [authState, setAuthState]       = useState('loading');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser]   = useState(null);
  const [authError, setAuthError]       = useState('');

  const loadProfile = async (fbUser) => {
    if (!fbUser) { setAuthState('unauthenticated'); return; }

    const snap = await getDoc(doc(db, 'users', fbUser.uid));

    if (!snap.exists()) {
      setFirebaseUser(fbUser);
      setAuthState('needs_setup');
      return;
    }

    const data = snap.data();

    // Cuenta desactivada por el administrador
    if (data.isActive === false) {
      setAuthError('Tu cuenta ha sido desactivada. Contacta al administrador.');
      await logoutUser();
      return;
    }

    setAuthError('');
    setCurrentUser({
      id:    fbUser.uid,
      email: fbUser.email,
      name:  data.name,
      role:  data.role,
      phone: data.phone || '',
      ...data,
    });
    setAuthState('authenticated');
  };

  useEffect(() => {
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

  const handleProfileCreated = async () => {
    await loadProfile(firebaseUser);
  };

  // ── Render según estado ──────────────────────────────────────
  if (authState === 'loading') return <LoadingScreen />;

  if (authState === 'unauthenticated') return (
    <LoginView
      onRegister={() => { setAuthError(''); setAuthState('registering'); }}
      authError={authError}
    />
  );

  if (authState === 'registering') return (
    <RegisterTenantView onBack={() => setAuthState('unauthenticated')} />
  );

  if (authState === 'needs_setup') return (
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
