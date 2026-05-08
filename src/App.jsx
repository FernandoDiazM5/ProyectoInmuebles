import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader, AlertCircle } from 'lucide-react';
import { auth, db } from './services/firebase';
import { logoutUser } from './services/authService';
import LoginView from './components/Auth/LoginView';
import SetupView from './components/Auth/SetupView';
// import RegisterTenantView from './components/Auth/RegisterTenantView';
import SistemaInmuebles from './components/SistemaInmuebles';

// Estados:
//   'loading'         → esperando Firebase
//   'unauthenticated' → sin sesión → Login
//   'registering'     → (desactivado) crear cuenta de arrendatario desde login
//   'needs_setup'     → autenticado pero sin perfil Firestore → Setup
//   'authenticated'   → autenticado con perfil completo → Sistema

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

function AuthErrorScreen({ message, onDismiss }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso restringido</h2>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <button
          onClick={onDismiss}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg transition"
        >
          Volver al inicio de sesión
        </button>
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
      setAuthState('auth_error');
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
        setAuthError('Ocurrió un error al verificar tu sesión. Intenta ingresar nuevamente.');
        setAuthState('auth_error');
      }
    });
    return unsubscribe;
  }, []);

  const handleProfileCreated = async () => {
    await loadProfile(firebaseUser);
  };

  const dismissError = async () => {
    setAuthError('');
    setAuthState('unauthenticated');
  };

  if (authState === 'loading')       return <LoadingScreen />;
  if (authState === 'auth_error')    return <AuthErrorScreen message={authError} onDismiss={dismissError} />;

  if (authState === 'unauthenticated') return (
    <LoginView authError={authError} />
  );

  /*
  if (authState === 'registering') return (
    <RegisterTenantView onBack={() => setAuthState('unauthenticated')} />
  );
  */

  if (authState === 'needs_setup') return (
    <SetupView
      firebaseUser={firebaseUser}
      onProfileCreated={handleProfileCreated}
    />
  );

  return (
    <SistemaInmuebles
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
    />
  );
}
