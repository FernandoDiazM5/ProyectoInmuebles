import {
  collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, getDoc, serverTimestamp, query, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { TENANT_STATUS, ROLES } from '../utils/constants';
import { createUserAdmin, sendTenantPasswordSetupEmail } from './authService';
import { generateRandomPassword } from '../utils/password';

const COL = 'tenants';

export const getTenants = async () => {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getTenantById = async (id) => {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/**
 * Alta de arrendatario + cuenta portal. La contraseña la define sólo el inquilino vía correo Firebase
 * (plantilla «restablecer contraseña»). El agente no recibe ninguna contraseña en pantalla ni en código expuesto al UI.
 * @returns {{ id: string }}
 */
export const createTenant = async (data) => {
  const emailNorm = data.email.trim().toLowerCase();
  const name = data.name.trim();
  const dni = data.dni.trim();
  const phone = data.phone?.trim() || '';

  const existing = await getDocs(
    query(collection(db, COL), where('email', '==', emailNorm))
  );
  if (!existing.empty) throw new Error('Ya existe un arrendatario registrado con ese correo electrónico');

  const internalBootstrapPassword = generateRandomPassword();

  let authUid;
  try {
    const authUser = await createUserAdmin(
      emailNorm,
      internalBootstrapPassword,
      name,
      ROLES.TENANT,
      { phone, dni }
    );
    authUid = authUser.uid;
  } catch (e) {
    throw new Error(
      e.message?.includes?.('Ya existe')
        ? e.message
        : `No se pudo crear la cuenta del portal: ${e.message}`
    );
  }

  let tenantRefId;
  try {
    const ref = await addDoc(collection(db, COL), {
      name,
      dni,
      email: emailNorm,
      phone,
      authUid,
      status: TENANT_STATUS.UP_TO_DATE,
      balance: 0,
      totalPaid: 0,
      propertyId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tenantRefId = ref.id;
    await updateDoc(doc(db, 'users', authUid), {
      tenantId: tenantRefId,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    throw new Error(
      `El arrendatario se creó en autenticación pero falló guardar datos: ${e.message}. ` +
        'Elimine la cuenta desde Firebase Authentication o intente otro correo.'
    );
  }

  try {
    await sendTenantPasswordSetupEmail(emailNorm);
  } catch (e) {
    throw new Error(
      `${e.message} Los datos están guardados; puede reintentar desde la consola de Firebase (Authentication)` +
        ` o usando «¿Olvidó su contraseña?» en el inicio de sesión con ese correo.`
    );
  }

  return { id: tenantRefId };
};

export const updateTenant = async (id, data) => {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
};

// Actualiza saldo y estado del arrendatario después de un pago
export const applyPayment = async (id, amountPaid, currentBalance) => {
  const newBalance = Math.max(0, currentBalance - amountPaid);
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

// Vincula al arrendatario con un departamento y le carga el primer mes
export const linkToProperty = async (id, propertyId, monthlyAmount) => {
  await updateDoc(doc(db, COL, id), {
    propertyId,
    balance: monthlyAmount,
    // Primera cuota pendiente ≠ moroso; el estado en reportes usa balance vs mensualidad
    status: TENANT_STATUS.UP_TO_DATE,
    updatedAt: serverTimestamp(),
  });
};

// Desvincula al arrendatario al terminar contrato / cascadas.
/** @param {{ zeroBalance?: boolean }} [opts] Si `zeroBalance` y la salida fue sin deuda, fuerza balance 0. */
export const unlinkFromProperty = async (id, opts = {}) => {
  const { zeroBalance } = opts;
  const patch = {
    propertyId: null,
    status: TENANT_STATUS.INACTIVE,
    updatedAt: serverTimestamp(),
  };
  if (zeroBalance) patch.balance = 0;
  await updateDoc(doc(db, COL, id), patch);
};

export const deleteTenant = async (id) => {
  await deleteDoc(doc(db, COL, id));
};
