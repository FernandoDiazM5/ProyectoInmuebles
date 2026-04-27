/**
 * Script para crear el usuario administrador en Firebase.
 *
 * Credenciales que crea:
 *   Email    : admin@sistema.com
 *   Contraseña: Admin123   (Firebase exige mínimo 6 caracteres)
 *   Rol      : admin
 *
 * Uso:
 *   node --env-file=.env.local scripts/createAdmin.mjs
 *
 * Requiere Node.js 20.6+ (para --env-file) o exportar las variables
 * manualmente antes de ejecutar el script.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const ADMIN_EMAIL    = 'admin@sistema.com';
const ADMIN_PASSWORD = 'Admin123';
const ADMIN_NAME     = 'Administrador';

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('ERROR: Variables de entorno no encontradas.');
  console.error('Ejecuta: node --env-file=.env.local scripts/createAdmin.mjs');
  process.exit(1);
}

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function main() {
  console.log('\n🔧 Creando usuario administrador...\n');

  try {
    const credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const uid = credential.user.uid;

    await setDoc(doc(db, 'users', uid), {
      email:     ADMIN_EMAIL,
      name:      ADMIN_NAME,
      role:      'admin',
      phone:     '',
      isActive:  true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await signOut(auth);

    console.log('✅ Usuario administrador creado exitosamente\n');
    console.log('   Email     :', ADMIN_EMAIL);
    console.log('   Contraseña:', ADMIN_PASSWORD);
    console.log('   Rol       : admin\n');
    console.log('Ahora puedes ingresar al sistema con esas credenciales.\n');

  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ️  El usuario admin ya existe en Firebase Auth.');
      console.log('   Si olvidaste la contraseña, cámbiala desde Firebase Console.');
    } else if (err.code === 'auth/weak-password') {
      console.error('ERROR: La contraseña es demasiado débil (mínimo 6 caracteres).');
    } else {
      console.error('ERROR:', err.message);
    }
  }

  process.exit(0);
}

main();
