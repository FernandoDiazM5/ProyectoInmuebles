import { useState, useCallback } from 'react';
import { getProperties, createProperty, updateProperty } from '../services/propertyService';
import { deletePropertyCascade } from '../services/cascadeService';

export const useProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProperty = async (data) => {
    const id = await createProperty(data);
    await fetchProperties();
    return id;
  };

  const editProperty = async (id, data) => {
    await updateProperty(id, data);
    await fetchProperties();
  };

  // Eliminación en cascada: contratos → pagos → departamento (`properties`)
  const removeProperty = async (id) => {
    await deletePropertyCascade(id);
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  return { properties, setProperties, loading, error, fetchProperties, addProperty, editProperty, removeProperty };
};
