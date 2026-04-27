import { useState, useCallback } from 'react';
import { getContracts, createContract, terminateContract } from '../services/contractService';

export const useContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContracts();
      setContracts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addContract = async (formData) => {
    const result = await createContract(formData);
    await fetchContracts();
    return result;
  };

  const endContract = async (contractId, propertyId, tenantId) => {
    await terminateContract(contractId, propertyId, tenantId);
    await fetchContracts();
  };

  return { contracts, setContracts, loading, error, fetchContracts, addContract, endContract };
};
