import {
  collection, addDoc, getDocs, doc, updateDoc,
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

export const getActiveContractByTenant = async (tenantId) => {
  const q = query(
    collection(db, COL),
    where('tenantId', '==', tenantId),
    where('status', '==', CONTRACT_STATUS.ACTIVE)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// CUS02 - Crear contrato: vincula propiedad + arrendatario
export const createContract = async ({ tenantId, propertyId, amount, duration }) => {
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

  // Efecto colateral: marcar propiedad y arrendatario
  await setPropertyRented(propertyId, tenantId);
  await linkToProperty(tenantId, propertyId, Number(amount));

  return { id: ref.id, contractNumber };
};

// CUS03 - Terminar contrato
export const terminateContract = async (contractId, propertyId, tenantId) => {
  await updateDoc(doc(db, COL, contractId), {
    status: CONTRACT_STATUS.TERMINATED,
    updatedAt: serverTimestamp(),
  });
  await setPropertyAvailable(propertyId);
  await unlinkFromProperty(tenantId);
};
