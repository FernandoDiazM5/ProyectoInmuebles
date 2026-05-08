import { useState, useCallback } from 'react';
import { getTenants, createTenant, updateTenant } from '../services/tenantService';
import { deleteTenantCascade } from '../services/cascadeService';

export const useTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTenant = async (data) => {
    const result = await createTenant(data);
    await fetchTenants();
    return result;
  };

  const editTenant = async (id, data) => {
    await updateTenant(id, data);
    await fetchTenants();
  };

  // Eliminación en cascada: contratos → pagos → arrendatario
  const removeTenant = async (id) => {
    await deleteTenantCascade(id);
    setTenants((prev) => prev.filter((t) => t.id !== id));
  };

  return { tenants, setTenants, loading, error, fetchTenants, addTenant, editTenant, removeTenant };
};
