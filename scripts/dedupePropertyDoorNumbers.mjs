/**
 * Elimina duplicados de número de puerta en `properties`.
 *
 * - Usa `propertyNumber` o, si falta, `doorNumber`, como valor actual.
 * - Orden estable: documento más antiguo (createdAt) conserva su número si es único;
 *   el resto recibe el siguiente número libre en su piso (floor * 100 + secuencia).
 * - Escribe el mismo valor en `propertyNumber` y `doorNumber` para mantener coherencia en la UI.
 *
 *   node --env-file=.env scripts/dedupePropertyDoorNumbers.mjs
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
  console.error('ERROR: Faltan VITE_FIREBASE_* en .env');
  process.exit(1);
}
if (!AGENT_EMAIL || !AGENT_PASSWORD) {
  console.error('ERROR: Define SEED_AGENT_EMAIL y SEED_AGENT_PASSWORD en .env');
  process.exit(1);
}

const COL = 'properties';

function createdAtMillis(data) {
  const c = data.createdAt;
  if (!c) return 0;
  if (typeof c.toMillis === 'function') return c.toMillis();
  if (typeof c.seconds === 'number') return c.seconds * 1000 + (c.nanoseconds || 0) / 1e6;
  return 0;
}

function readDoorRaw(data) {
  const a = data.propertyNumber;
  const b = data.doorNumber;
  if (a != null && String(a).trim() !== '') return String(a).trim();
  if (b != null && String(b).trim() !== '') return String(b).trim();
  return '';
}

function floorNum(data) {
  const f = Number(data.floor);
  return Number.isFinite(f) ? f : null;
}

/** Siguiente string numérico libre preferentemente en rango [floor*100+1 .. floor*100+999]. */
function nextFreeOnFloor(occupied, floor) {
  if (floor != null && Number.isFinite(floor)) {
    const start = floor * 100 + 1;
    const end = floor * 100 + 999;
    for (let n = start; n <= end; n++) {
      const s = String(n);
      if (!occupied.has(s)) return s;
    }
  }
  let n = 10000;
  while (occupied.has(String(n))) n += 1;
  return String(n);
}

(async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Autenticando como agente (${AGENT_EMAIL})…`);
  await signInWithEmailAndPassword(auth, AGENT_EMAIL, AGENT_PASSWORD);

  const snap = await getDocs(collection(db, COL));
  const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() }));

  rows.sort((a, b) => {
    const ta = createdAtMillis(a.data);
    const tb = createdAtMillis(b.data);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  const occupied = new Set();
  let updated = 0;
  const changes = [];

  for (const { id, data } of rows) {
    const fl = floorNum(data);
    let raw = readDoorRaw(data);
    let want = raw;

    if (!/^\d+$/.test(want)) {
      want = nextFreeOnFloor(occupied, fl);
    } else if (occupied.has(want)) {
      want = nextFreeOnFloor(occupied, fl);
    }

    occupied.add(want);

    const before = `${readDoorRaw(data) || '(vacío)'}`;
    if (before !== want || String(data.propertyNumber ?? '').trim() !== want || String(data.doorNumber ?? '').trim() !== want) {
      await updateDoc(doc(db, COL, id), {
        propertyNumber: want,
        doorNumber: want,
      });
      updated++;
      if (changes.length < 25) changes.push({ id, before: readDoorRaw(data) || '(vacío)', after: want });
    }
  }

  await signOut(auth);
  console.log(`\nOK: procesados ${rows.length} departamento(s); actualizados ${updated}.`);
  if (changes.length) {
    console.log('Cambios (muestra):');
    for (const c of changes) console.log(`- ${c.id}: "${c.before}" → ${c.after}`);
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
