import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader } from 'lucide-react';
import { auth, db } from './services/firebase';
import LoginView from './components/Auth/LoginView';
import SistemaInmuebles from './components/SistemaInmuebles';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center">
        <p className="text-red-600 font-medium mb-4">{message}</p>
        <button onClick={onRetry}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
          Reintentar
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Escucha el estado de autenticación. Se dispara en login, logout y al recargar.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setError(null);
      try {
        if (firebaseUser) {
          // Usuario autenticado: obtener rol y perfil desde Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (!userDoc.exists()) throw new Error('Perfil no encontrado. Contacte al administrador.');

          const data = userDoc.data();
          setCurrentUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: data.name,
            role: data.role,   // 'agent' | 'tenant' | 'owner'
            ...data,
          });
        } else {
          // Sin sesión activa
          setCurrentUser(null);
        }
      } catch (err) {
        setError(err.message);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;  // Limpiar listener al desmontar
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;

  // Sin sesión → pantalla de login
  if (!currentUser) return <LoginView />;

  // Con sesión → sistema principal (el rol define qué ve el usuario)
  return (
    <SistemaInmuebles
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
    />
  );
}
