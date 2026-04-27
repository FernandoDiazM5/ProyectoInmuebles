import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  getAuth,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { auth, db, firebaseConfig } from './firebase';

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

// ---------- Crear usuario sin cerrar sesión del admin ----------
// Usa una instancia secundaria de Firebase para no desautenticar al admin actual.
export const createUserAdmin = async (email, password, name, role, extraData = {}) => {
  const existing = getApps().find((a) => a.name === 'SecondaryApp');
  const secondaryApp = existing ?? initializeApp(firebaseConfig, 'SecondaryApp');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      email,
      name,
      role,
      phone: extraData.phone || '',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...extraData,
    });
    await signOut(secondaryAuth);
    return credential.user;
  } catch (err) {
    const messages = {
      'auth/email-already-in-use': 'Ya existe un usuario con ese correo',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/invalid-email': 'Correo electrónico inválido',
    };
    throw new Error(messages[err.code] || err.message);
  }
};
