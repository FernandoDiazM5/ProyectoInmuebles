import {
  collection, addDoc, getDocs, query,
  where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { PAYMENT_STATUS } from '../utils/constants';
import {
  generateReceiptId, generateMpReference,
  generateYapeReference, generateWebReference, todayISO,
} from '../utils/formatters';
import { applyPayment } from './tenantService';

const COL = 'payments';

export const getPayments = async () => {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getPaymentsByTenant = async (tenantId) => {
  const q = query(collection(db, COL), where('tenantId', '==', tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Construye la referencia según el método de pago
const buildReference = (method, yapeCode = '') => {
  if (method === 'Mercado Pago') return generateMpReference();
  if (method === 'Yape') return generateYapeReference(yapeCode);
  return generateWebReference();
};

// CUS04 - Registrar pago (Flujo A: arrendatario / Flujo B: agente)
export const registerPayment = async ({ tenantId, contractId, amount, method, yapeCode, currentBalance, processedBy }) => {
  const receiptNumber = generateReceiptId();
  const reference = buildReference(method, yapeCode);

  const ref = await addDoc(collection(db, COL), {
    receiptNumber,
    tenantId,
    contractId: contractId || null,
    amount: Number(amount),
    date: todayISO(),
    method,
    reference,
    status: PAYMENT_STATUS.PROCESSED,
    processedBy: processedBy || 'self',
    createdAt: serverTimestamp(),
  });

  // CUS05 - Actualizar saldo arrendatario
  const newBalance = await applyPayment(tenantId, Number(amount), currentBalance);

  return { id: ref.id, receiptNumber, newBalance };
};
