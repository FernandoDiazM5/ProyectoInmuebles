/**
 * Registra 2 arrendatarios y les genera contratos "morosos" con fechas pasadas.
 *
 * Objetivo visual en UI:
 * - En `getBillingStatus` el estado MOROSO depende de `tenant.balance` vs `monthlyAmount`:
 *   > MOROSO si balance > 2 * mensualidad.
 *
 * Este script:
 * - Selecciona 2 propiedades con status 'DISPONIBLE'.
 * - Crea 2 documentos en `tenants` con balance = mensualidad * 2.5 (y status 'MOROSO').
 * - Crea 2 contratos en `contracts` con startDate = hoy - 30 días y status 'ACTIVO'.
 * - Actualiza las propiedades a 'ARRENDADA' (currentTenantId).
 *
 * Requiere .env con:
 *   - SEED_AGENT_EMAIL / SEED_AGENT_PASSWORD
 *   - VITE_FIREBASE_*
 *
 * Ejecución:
 *   npm run dedupe:property-numbers  (solo si quieres) ...
 *   node --env-file=.env scripts/seedDelinquentTenants.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { CONTRACT_STATUS, PROPERTY_STATUS, TENANT_STATUS } from '../src/utils/constants.js';

// Helpers locales para evitar problemas de resolución ESM (Node vs Vite).
// Replican la lógica de `todayPeruISO()` y el generador de contrato de `src/utils/formatters.js`.
function toPeruCalendarYMD(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const pick = (t) => parts.find((p) => p.type === t)?.value;
  const y = pick('year');
  const mo = pick('month');
  const da = pick('day');
  if (!y || !mo || !da) return null;
  return `${y}-${mo}-${da}`;
}

function todayPeruISO() {
  return toPeruCalendarYMD(new Date()) ?? '';
}

function generateContractIdLocal() {
  const date = todayPeruISO().replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `CON-${date}-${rand}`;
}

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

const TARGET_COUNT = 2;
const START_DATE_OFFSET_DAYS = 30;
const DELINQUENCY_MULTIPLIER = 2.5; // > 2 => se ve como MOROSO
const CONTRACT_DURATION_MONTHS = 12;

if (!firebaseConfig.apiKey) {
  console.error('ERROR: faltan VITE_FIREBASE_* en .env');
  process.exit(1);
}
if (!AGENT_EMAIL || !AGENT_PASSWORD) {
  console.error('ERROR: define SEED_AGENT_EMAIL y SEED_AGENT_PASSWORD en .env');
  process.exit(1);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  // YMD según calendario de Perú (America/Lima)
  return toPeruCalendarYMD(d) ?? '';
}

function isoToTimestampNoon(isoYMD) {
  // Asegura un "medio día" para evitar desfases de calendario.
  return Timestamp.fromDate(new Date(`${isoYMD}T12:00:00-05:00`));
}

function moneyRound2(n) {
  return Math.round(Number(n) * 100) / 100;
}

(async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Autenticando como agente (${AGENT_EMAIL})…`);
  await signInWithEmailAndPassword(auth, AGENT_EMAIL, AGENT_PASSWORD);

  const qAvail = query(collection(db, 'properties'), where('status', '==', PROPERTY_STATUS.AVAILABLE));
  const snap = await getDocs(qAvail);
  const available = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (available.length < TARGET_COUNT) {
    console.error(
      `ERROR: se requieren ${TARGET_COUNT} propiedades con status ${PROPERTY_STATUS.AVAILABLE}, pero solo hay ${available.length}.`
    );
    await signOut(auth);
    process.exit(1);
  }

  // Reutilizamos dos propiedades "cualesquiera" (las primeras) para el demo.
  const pickedProperties = available.slice(0, TARGET_COUNT);
  const startDateStr = daysAgoISO(START_DATE_OFFSET_DAYS);
  const createdAtPast = startDateStr ? isoToTimestampNoon(startDateStr) : serverTimestamp();

  console.log(`Seleccionadas propiedades:`);
  for (const p of pickedProperties) {
    console.log(`- ${p.id}: ${String(p.propertyNumber ?? p.doorNumber ?? '—')} (piso ${p.floor ?? '—'}) · S/. ${p.price}`);
  }

  const tenantsCol = collection(db, 'tenants');
  const contractsCol = collection(db, 'contracts');

  const timestampNow = serverTimestamp();
  const runId = `${Date.now()}`;

  const results = [];

  for (let i = 0; i < pickedProperties.length; i++) {
    const property = pickedProperties[i];
    const monthlyAmount = moneyRound2(property.price ?? property.monthlyAmount ?? 0);
    if (!(monthlyAmount > 0)) {
      console.error(`ERROR: propiedad ${property.id} no tiene price válido.`);
      await signOut(auth);
      process.exit(1);
    }

    const tenantName = `Arrendatario Demo Moroso ${i + 1}`;
    const tenantDni = String(73000000 + i + 1);
    const tenantEmail = `moroso.${runId}.${i + 1}@demo.local`;
    const tenantPhone = '';

    const desiredBalance = moneyRound2(monthlyAmount * DELINQUENCY_MULTIPLIER);

    console.log(`\nCreando arrendatario ${tenantName}…`);
    const tenantRef = await addDoc(tenantsCol, {
      name: tenantName,
      dni: tenantDni,
      email: tenantEmail.toLowerCase(),
      phone: tenantPhone,
      authUid: null,
      status: TENANT_STATUS.DELINQUENT,
      balance: desiredBalance,
      totalPaid: 0,
      propertyId: property.id,
      createdAt: createdAtPast,
      updatedAt: timestampNow,
    });

    console.log(`Actualizando propiedad ${property.id} a ARRENDADA…`);
    await updateDoc(doc(db, 'properties', property.id), {
      status: PROPERTY_STATUS.RENTED,
      currentTenantId: tenantRef.id,
      updatedAt: timestampNow,
    });

    const contractNumber = generateContractIdLocal();
    console.log(`Generando contrato ${contractNumber}…`);
    const contractRef = await addDoc(contractsCol, {
      contractNumber,
      tenantId: tenantRef.id,
      propertyId: property.id,
      startDate: startDateStr,
      duration: CONTRACT_DURATION_MONTHS,
      monthlyAmount,
      status: CONTRACT_STATUS.ACTIVE,
      createdAt: createdAtPast,
      updatedAt: timestampNow,
    });

    results.push({
      tenantId: tenantRef.id,
      propertyId: property.id,
      contractId: contractRef.id,
      contractNumber,
      monthlyAmount,
      desiredBalance,
      startDate: startDateStr,
    });
  }

  await signOut(auth);

  console.log(`\nOK: registrados ${TARGET_COUNT} arrendatario(s) con contratos morosos.`);
  for (const r of results) {
    console.log(
      `- tenant ${r.tenantId} | prop ${r.propertyId} | contrato ${r.contractNumber} | startDate ${r.startDate} | balance S/. ${r.desiredBalance}`
    );
  }
})().catch(async (e) => {
  console.error(e?.message || e);
  process.exit(1);
});

