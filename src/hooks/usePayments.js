import { useState, useCallback } from 'react';
import { getPayments, registerPayment } from '../services/paymentService';

export const usePayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPayments();
      setPayments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPayment = async (paymentData) => {
    const result = await registerPayment(paymentData);
    await fetchPayments();
    return result;
  };

  return { payments, setPayments, loading, error, fetchPayments, addPayment };
};
