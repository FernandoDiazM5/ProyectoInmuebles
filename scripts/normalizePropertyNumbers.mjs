/**
 * Normaliza `propertyNumber` para que solo contenga dígitos.
 *
 * Casos típicos que soporta:
 * - "1-A", "9-B", "10-A"  → floor(9) * 100 + letraIndex(A=1, B=2, ...)
 * - "PH-01", "PH-02"      → floor(11) * 100 + suffixNum(1, 2, ...)
 * - Si ya es numérico, no cambia.
 *
 * Requiere estar autenticado como usuario con rol AGENT u OWNER (según tus reglas).
 *
 * Ejecución:
 *   node --env-file=.env scripts/normalizePropertyNumbers.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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
  console.error('ERROR: Faltan VITE_FIREBASE_* (verifica tu .env).');
  process.exit(1);
}
if (!AGENT_EMAIL || !AGENT_PASSWORD) {
  console.error('ERROR: Define SEED_AGENT_EMAIL y SEED_AGENT_PASSWORD en tu .env.');
  process.exit(1);
}

const STATUS_COLLECTION = 'properties';

function letterIndex(letter) {
  const ch = String(letter ?? '').trim().toUpperCase();
  if (!ch || ch.length !== 1) return null;
  const code = ch.charCodeAt(0);
  if (code < 65 || code > 90) return null; // A..Z
  return code - 64; // A=1
}

function digitsOnly(str) {
  return String(str ?? '').replace(/\D/g, '');
}

function normalizePropertyNumber(propertyNumberRaw, floorRaw) {
  const pn = String(propertyNumberRaw ?? '').trim();
  if (!pn) return null;
  if (/^\d+$/.test(pn)) return pn; // ya es numérico

  const floorNum = Number(floorRaw);
  const base = Number.isFinite(floorNum) ? floorNum : Number(digitsOnly(pn));
  if (!Number.isFinite(base)) return null;

  // PH-01 / PH-02
  if (pn.toUpperCase().startsWith('PH-')) {
    const suffixNum = Number(digitsOnly(pn));
    if (!Number.isFinite(suffixNum)) return null;
    return String(base * 100 + suffixNum);
  }

  // 1-A / 9-B / 10-A...
  // Buscamos el sufijo (letra/dígitos después del guión) y lo convertimos a índice numérico.
  const parts = pn.split('-');
  const mainPartDigits = digitsOnly(parts[0]);
  const suffix = parts.slice(1).join('-');

  // Preferimos letra -> índice (A=1, B=2), si no, tomamos sufijo como número.
  const li = letterIndex(suffix);
  const suffixNum = li != null ? li : Number(digitsOnly(suffix));
  if (!Number.isFinite(suffixNum)) return null;

  // Para estos casos, normalmente "mainPartDigits" coincide con floor; usamos "base" (floor) por consistencia.
  // Ej: floor 1 + A => 101; floor 9 + B => 902
  return String(base * 100 + suffixNum);
}

(async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Autenticando como agente (${AGENT_EMAIL})…`);
  await signInWithEmailAndPassword(auth, AGENT_EMAIL, AGENT_PASSWORD);

  const col = collection(db, STATUS_COLLECTION);
  const snap = await getDocs(col);

  let checked = 0;
  let updated = 0;
  const examples = [];

  for (const d of snap.docs) {
    const data = d.data();
    const pn = data.propertyNumber;
    const floor = data.floor;
    const next = normalizePropertyNumber(pn, floor);
    if (!next) continue;
    checked += 1;

    const currentStr = pn == null ? '' : String(pn).trim();
    if (currentStr === next) continue;

    await updateDoc(doc(db, STATUS_COLLECTION, d.id), { propertyNumber: next });
    updated += 1;

    if (examples.length < 8) {
      examples.push({ id: d.id, from: currentStr, to: next });
    }
  }

  await signOut(auth);

  console.log(`\nOK: revisados ${checked} doc(s); actualizados ${updated} doc(s).`);
  if (examples.length) {
    console.log('Ejemplos de cambios:');
    for (const ex of examples) console.log(`- ${ex.id}: ${ex.from} → ${ex.to}`);
  }
})();

