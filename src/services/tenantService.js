import {
  collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, getDoc, serverTimestamp,
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
  const newBalance = currentBalance - amountPaid;
  await updateDoc(doc(db, COL, id), {
    balance: newBalance < 0 ? 0 : newBalance,
    totalPaid: (await getTenantById(id)).totalPaid + amountPaid,
    status: newBalance <= 0 ? TENANT_STATUS.UP_TO_DATE : TENANT_STATUS.DELINQUENT,
    updatedAt: serverTimestamp(),
  });
  return newBalance < 0 ? 0 : newBalance;
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

export const deleteTenant = async (id) => {
  await deleteDoc(doc(db, COL, id));
};
