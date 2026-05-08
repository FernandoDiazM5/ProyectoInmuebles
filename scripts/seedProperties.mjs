/**
 * Inserta departamentos DEMO en Firestore (colección `properties`).
 *
 * Requiere estar autenticado como usuario con rol AGENT u OWNER (reglas Firestore).
 * Variables en `.env`:
 *   VITE_FIREBASE_* (ya las tienes)
 *   SEED_AGENT_EMAIL / SEED_AGENT_PASSWORD (cuenta agente)
 *   PROPERTY_SITE_ADDRESS (opcional) — dirección única del edificio; misma para todas las filas demo
 *
 * Uso:
 *   npm run seed:properties        → sólo lote BASE (10 departamentos).
 *   npm run seed:properties:extra  → sólo lote EXTRA (+10), sin volver a crear el BASE.
 *   npm run seed:properties:all    → BASE + EXTRA (20) en un comando.
 *   Flags: --base-only | --extra-only | --with-extra (o --all)
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const STATUS = 'DISPONIBLE';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const AGENT_EMAIL = process.env.SEED_AGENT_EMAIL?.trim();
const AGENT_PASSWORD = process.env.SEED_AGENT_PASSWORD ?? '';

if (!firebaseConfig.apiKey) {
  console.error('ERROR: Faltan VITE_FIREBASE_* (use npm run seed:properties con --env-file o .env en la misma ejecución).');
  process.exit(1);
}
if (!AGENT_EMAIL || !AGENT_PASSWORD) {
  console.error('ERROR: Añada a su .env:');
  console.error('  SEED_AGENT_EMAIL=<correo de un usuario con rol agente>');
  console.error('  SEED_AGENT_PASSWORD=<contraseña>');
  process.exit(1);
}

/**
 * Un único punto físico para todas las propiedades.
 * Defina PROPERTY_SITE_ADDRESS en `.env`; si falta, se usa este texto por defecto.
 */
const DEMO_SITE_ADDRESS =
  process.env.PROPERTY_SITE_ADDRESS?.trim() ||
  'Edificio Residencial Central, Jr. Ricardo Palma 180, Magdalena';

/**
 * propertyNumber = número identificativo de la puerta (placa / rotulación del inmueble).
 * Todas las unidades son departamentos en el mismo edificio; solo cambian planta, puerta e interior.
 */
const SEED_ROWS_BASE = [
  { propertyNumber: '101', floor: 1, bedrooms: 1, price: 920 },
  { propertyNumber: '102', floor: 1, bedrooms: 2, price: 1050 },
  { propertyNumber: '201', floor: 2, bedrooms: 2, price: 1180 },
  { propertyNumber: '202', floor: 2, bedrooms: 2, price: 1200 },
  { propertyNumber: '401', floor: 4, bedrooms: 3, price: 1450 },
  { propertyNumber: '501', floor: 5, bedrooms: 2, price: 1320 },
  { propertyNumber: '803', floor: 8, bedrooms: 1, price: 980 },
  { propertyNumber: '804', floor: 8, bedrooms: 2, price: 1280 },
  { propertyNumber: '901', floor: 9, bedrooms: 3, price: 1680 },
  { propertyNumber: '1101', floor: 11, bedrooms: 4, price: 2850 },
];

/** Lotes adicionales (misma dirección DEMO); NO modifica BASE. */
const SEED_ROWS_EXTRA = [
  { propertyNumber: '301', floor: 3, bedrooms: 1, price: 1100 },
  { propertyNumber: '302', floor: 3, bedrooms: 2, price: 1195 },
  { propertyNumber: '601', floor: 6, bedrooms: 2, price: 1310 },
  { propertyNumber: '705', floor: 7, bedrooms: 1, price: 1250 },
  { propertyNumber: '706', floor: 7, bedrooms: 3, price: 1510 },
  { propertyNumber: '9101', floor: 9, bedrooms: 2, price: 1580 },
  { propertyNumber: '9102', floor: 9, bedrooms: 1, price: 1410 },
  { propertyNumber: '1001', floor: 10, bedrooms: 2, price: 1710 },
  { propertyNumber: '1002', floor: 10, bedrooms: 3, price: 1880 },
  { propertyNumber: '1102', floor: 11, bedrooms: 3, price: 2620 },
];

function resolveSeedRows(argv) {
  const extraOnly = argv.includes('--extra-only');
  const baseOnly = argv.includes('--base-only');
  const withExtra = argv.includes('--with-extra') || argv.includes('--all');
  if (extraOnly && baseOnly) {
    console.error('ERROR: use sólo uno de --extra-only o --base-only');
    process.exit(1);
  }
  if (extraOnly) return { rows: SEED_ROWS_EXTRA, label: 'EXTRA (10)' };
  if (baseOnly) return { rows: SEED_ROWS_BASE, label: 'BASE (10)' };
  if (withExtra) return { rows: [...SEED_ROWS_BASE, ...SEED_ROWS_EXTRA], label: 'BASE + EXTRA (20)' };
  // Por defecto: sólo el lote BASE (primer seed o re-sembrado sólo inicial).
  return { rows: SEED_ROWS_BASE, label: 'BASE (10)' };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

(async () => {
  const { rows, label } = resolveSeedRows(process.argv.slice(2));

  console.log(`Autenticando como agente (${AGENT_EMAIL})…`);
  await signInWithEmailAndPassword(auth, AGENT_EMAIL, AGENT_PASSWORD);
  console.log(`Insertando departamentos (${label})…\n`);

  const col = collection(db, 'properties');

  let n = 0;
  for (const row of rows) {
    const docRef = await addDoc(col, {
      ...row,
      address: DEMO_SITE_ADDRESS,
      type: row.type ?? 'Departamento',
      price: Number(row.price),
      floor: Number(row.floor),
      bedrooms: Number(row.bedrooms),
      status: STATUS,
      currentTenantId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`${String(++n).padStart(2, '0')}. Puerta ${row.propertyNumber} · Piso ${row.floor} · ${row.bedrooms} hab. (${docRef.id})`);
  }

  await signOut(auth);
  console.log(`\nOK: ${rows.length} departamento(s) [${label}] en: ${DEMO_SITE_ADDRESS}`);
  process.exit(0);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
