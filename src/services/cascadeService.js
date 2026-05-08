import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { CONTRACT_STATUS } from '../utils/constants';
import { getContractsByTenant, getContractsByProperty } from './contractService';
import { deletePaymentsByTenant, deletePaymentsByContract } from './paymentService';
import { setPropertyAvailable } from './propertyService';
import { unlinkFromProperty } from './tenantService';

/**
 * Elimina un arrendatario en cascada:
 * contratos (activos liberan el departamento) → pagos → arrendatario
 */
export const deleteTenantCascade = async (tenantId) => {
  const contracts = await getContractsByTenant(tenantId);

  for (const contract of contracts) {
    if (contract.status === CONTRACT_STATUS.ACTIVE) {
      await setPropertyAvailable(contract.propertyId);
    }
    await deletePaymentsByContract(contract.id);
    await deleteDoc(doc(db, 'contracts', contract.id));
  }

  // Elimina pagos restantes (ej. contractId == null)
  await deletePaymentsByTenant(tenantId);

  await deleteDoc(doc(db, 'tenants', tenantId));
};

/**
 * Elimina un departamento (documento en `properties`) en cascada:
 * contratos (activos desvinculan al arrendatario) → pagos → registro de departamento
 */
export const deletePropertyCascade = async (propertyId) => {
  const contracts = await getContractsByProperty(propertyId);

  for (const contract of contracts) {
    if (contract.status === CONTRACT_STATUS.ACTIVE) {
      await unlinkFromProperty(contract.tenantId);
    }
    await deletePaymentsByContract(contract.id);
    await deleteDoc(doc(db, 'contracts', contract.id));
  }

  await deleteDoc(doc(db, 'properties', propertyId));
};

/**
 * Elimina un contrato en cascada:
 * si está activo libera departamento y arrendatario → pagos → contrato
 */
export const deleteContractCascade = async (contractId, propertyId, tenantId, status) => {
  if (status === CONTRACT_STATUS.ACTIVE) {
    await setPropertyAvailable(propertyId);
    await unlinkFromProperty(tenantId);
  }
  await deletePaymentsByContract(contractId);
  await deleteDoc(doc(db, 'contracts', contractId));
};
