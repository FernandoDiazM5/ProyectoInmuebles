import {
  collection, addDoc, getDocs, doc, updateDoc, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CONTRACT_STATUS } from '../utils/constants';
import { generateContractId, todayISO } from '../utils/formatters';
import { setPropertyRented, setPropertyAvailable } from './propertyService';
import { linkToProperty, unlinkFromProperty } from './tenantService';

const COL = 'contracts';

export const getContracts = async () => {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getContractsByTenant = async (tenantId) => {
  const q = query(collection(db, COL), where('tenantId', '==', tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getContractsByProperty = async (propertyId) => {
  const q = query(collection(db, COL), where('propertyId', '==', propertyId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getActiveContractByTenant = async (tenantId) => {
  const q = query(
    collection(db, COL),
    where('tenantId', '==', tenantId),
    where('status', '==', CONTRACT_STATUS.ACTIVE)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// CUS02 - Crear contrato: valida entidades y vincula departamento + arrendatario
export const createContract = async ({ tenantId, propertyId, amount, duration }) => {
  // Integridad referencial: ambas entidades deben existir
  const [tenantSnap, propertySnap] = await Promise.all([
    getDoc(doc(db, 'tenants', tenantId)),
    getDoc(doc(db, 'properties', propertyId)),
  ]);
  if (!tenantSnap.exists()) throw new Error('El arrendatario seleccionado no existe en la base de datos');
  if (!propertySnap.exists()) throw new Error('El departamento seleccionado no existe en la base de datos');

  // Evita contrato duplicado activo para el mismo arrendatario
  const existing = await getActiveContractByTenant(tenantId);
  if (existing) throw new Error('El arrendatario ya tiene un contrato activo (N° ' + existing.contractNumber + ')');

  const contractNumber = generateContractId();
  const startDate = todayISO();

  const ref = await addDoc(collection(db, COL), {
    contractNumber,
    tenantId,
    propertyId,
    startDate,
    duration: Number(duration),
    monthlyAmount: Number(amount),
    status: CONTRACT_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setPropertyRented(propertyId, tenantId);
  await linkToProperty(tenantId, propertyId, Number(amount));

  return { id: ref.id, contractNumber, startDate };
};

// CUS03 - Terminar contrato (cambia estado, libera departamento y arrendatario)
export const terminateContract = async (contractId, propertyId, tenantId) => {
  const tenantSnap = await getDoc(doc(db, 'tenants', tenantId));
  if (!tenantSnap.exists()) throw new Error('El arrendatario no existe en la base de datos');
  const balance = Number(tenantSnap.data().balance ?? 0);
  if (balance > 0) {
    throw new Error('No se puede terminar el contrato: el arrendatario tiene saldo pendiente.');
  }

  await updateDoc(doc(db, COL, contractId), {
    status: CONTRACT_STATUS.TERMINATED,
    updatedAt: serverTimestamp(),
  });
  await setPropertyAvailable(propertyId);
  await unlinkFromProperty(tenantId, { zeroBalance: true });
};
