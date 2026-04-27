import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// ---------- Login real con Firebase ----------
export const loginUser = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (err) {
    const messages = {
      'auth/user-not-found': 'Usuario no registrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-email': 'Email inválido',
      'auth/too-many-requests': 'Demasiados intentos. Intente más tarde',
      'auth/invalid-credential': 'Credenciales inválidas',
    };
    throw new Error(messages[err.code] || 'Error al ingresar');
  }
};

// ---------- Cerrar sesión ----------
export const logoutUser = () => signOut(auth);

// ---------- Obtener perfil desde Firestore ----------
export const getUserData = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('Perfil de usuario no encontrado en la base de datos');
  return snap.data();
};

// ---------- Crear usuario (solo admin/agente) ----------
export const createUser = async (email, password, name, role, extraData = {}) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', credential.user.uid), {
    email,
    name,
    role,            // 'agent' | 'tenant' | 'owner'
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extraData,
  });
  return credential.user;
};

// ---------- Restablecer contraseña ----------
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
