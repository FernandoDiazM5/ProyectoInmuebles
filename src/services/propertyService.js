import {
  collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, getDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { PROPERTY_STATUS } from '../utils/constants';

const COL = 'properties';

export const getProperties = async () => {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAvailableProperties = async () => {
  const q = query(collection(db, COL), where('status', '==', PROPERTY_STATUS.AVAILABLE));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getPropertyById = async (id) => {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const createProperty = async (data) => {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: PROPERTY_STATUS.AVAILABLE,
    currentTenantId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateProperty = async (id, data) => {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
};

export const setPropertyRented = async (id, tenantId) => {
  await updateDoc(doc(db, COL, id), {
    status: PROPERTY_STATUS.RENTED,
    currentTenantId: tenantId,
    updatedAt: serverTimestamp(),
  });
};

export const setPropertyAvailable = async (id) => {
  await updateDoc(doc(db, COL, id), {
    status: PROPERTY_STATUS.AVAILABLE,
    currentTenantId: null,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProperty = async (id) => {
  await deleteDoc(doc(db, COL, id));
};
