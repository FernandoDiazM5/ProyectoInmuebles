import {
  collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, getDoc, serverTimestamp, query, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { TENANT_STATUS } from '../utils/constants';

const COL = 'tenants';

export const getTenants = async () => {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getTenantById = async (id) => {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const createTenant = async (data) => {
  // Unicidad de email: evita duplicados silenciosos
  const existing = await getDocs(
    query(collection(db, COL), where('email', '==', data.email.trim().toLowerCase()))
  );
  if (!existing.empty) throw new Error('Ya existe un arrendatario registrado con ese correo electrónico');

  const ref = await addDoc(collection(db, COL), {
    name: data.name.trim(),
    dni: data.dni.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || '',
    status: TENANT_STATUS.UP_TO_DATE,
    balance: 0,
    totalPaid: 0,
    propertyId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateTenant = async (id, data) => {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
};

// Actualiza saldo y estado del arrendatario después de un pago
export const applyPayment = async (id, amountPaid, currentBalance) => {
  const newBalance = Math.max(0, currentBalance - amountPaid);
  // Obtiene totalPaid actual en una sola lectura
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error('Arrendatario no encontrado al aplicar pago');
  await updateDoc(doc(db, COL, id), {
    balance: newBalance,
    totalPaid: (tenant.totalPaid || 0) + amountPaid,
    status: newBalance <= 0 ? TENANT_STATUS.UP_TO_DATE : TENANT_STATUS.DELINQUENT,
    updatedAt: serverTimestamp(),
  });
  return newBalance;
};

// Vincula al arrendatario con una propiedad y le carga el primer mes
export const linkToProperty = async (id, propertyId, monthlyAmount) => {
  await updateDoc(doc(db, COL, id), {
    propertyId,
    balance: monthlyAmount,
    status: TENANT_STATUS.DELINQUENT,
    updatedAt: serverTimestamp(),
  });
};

// Desvincula al arrendatario al terminar contrato
export const unlinkFromProperty = async (id) => {
  await updateDoc(doc(db, COL, id), {
    propertyId: null,
    status: TENANT_STATUS.INACTIVE,
    updatedAt: serverTimestamp(),
  });
};

// Eliminación simple del documento (la cascada la maneja cascadeService.js)
export const deleteTenant = async (id) => {
  await deleteDoc(doc(db, COL, id));
};
