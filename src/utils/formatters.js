export const formatCurrency = (amount) =>
  `$${Number(amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`;

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr.toDate?.() ?? new Date(dateStr);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const generateContractId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `CON-${date}-${rand}`;
};

export const generateReceiptId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `RCP-${date}-${rand}`;
};

export const generateMpReference = () => `MP-TRX-${Math.floor(Math.random() * 1_000_000)}`;
export const generateYapeReference = (code) => `YAPE-${code}`;
export const generateWebReference = () => `WEB-${Math.floor(Math.random() * 1_000_000)}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);
