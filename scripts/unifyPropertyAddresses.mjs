/**
 * Pone el mismo campo `address` en **todos** los documentos de la colección `properties`.
 * Sirve cuando había datos viejos sembrados en varias calles y quieres un solo edificio/punto.
 *
 * Requiere `.env`:
 *   VITE_FIREBASE_*  (igual que la app)
 *   SEED_AGENT_EMAIL / SEED_AGENT_PASSWORD  (usuario agente)
 *   PROPERTY_SITE_ADDRESS (opcional) — si no existe, usa la dirección única demo (igual que seed:properties).
 *
 * Uso: npm run unify:property-addresses
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  doc,
} from 'firebase/firestore';

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
const DEFAULT_UNIFIED_SITE =
  'Edificio Residencial Central, Jr. Ricardo Palma 180, Magdalena';

const ADDRESS = process.env.PROPERTY_SITE_ADDRESS?.trim() || DEFAULT_UNIFIED_SITE;

if (!firebaseConfig.apiKey) {
  console.error('ERROR: Faltan variables VITE_FIREBASE_*.');
  process.exit(1);
}
if (!AGENT_EMAIL || !AGENT_PASSWORD) {
  console.error('ERROR: Defina SEED_AGENT_EMAIL y SEED_AGENT_PASSWORD en .env');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BATCH_LIMIT = 450;

async function main() {
  if (!process.env.PROPERTY_SITE_ADDRESS?.trim()) {
    console.warn('Aviso: PROPERTY_SITE_ADDRESS no está en .env; usando dirección unificada por defecto.');
  }
  console.log(`Autenticando como agente (${AGENT_EMAIL})…`);
  await signInWithEmailAndPassword(auth, AGENT_EMAIL, AGENT_PASSWORD);

  const snap = await getDocs(collection(db, 'properties'));
  if (snap.empty) {
    console.log('No hay documentos en `properties`.');
    await signOut(auth);
    process.exit(0);
  }

  let batch = writeBatch(db);
  let inBatch = 0;
  let updated = 0;

  for (const d of snap.docs) {
    batch.update(doc(db, 'properties', d.id), {
      address: ADDRESS,
      updatedAt: serverTimestamp(),
    });
    inBatch++;
    updated++;

    if (inBatch >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      inBatch = 0;
    }
  }

  if (inBatch > 0) await batch.commit();
  await signOut(auth);

  console.log(`OK: ${updated} propiedad(es) actualizadas a una sola ubicación:`);
  console.log(`   ${ADDRESS}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
