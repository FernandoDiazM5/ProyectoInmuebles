import { todayPeruISO } from './rentDueDate';

/** Soles peruanos: prefijo literal «S/.» (punto después de la barra) + número formato es-PE. */
export const formatCurrency = (amount) =>
  `S/. ${Number(amount ?? 0).toLocaleString('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

/** YYYY-MM-DD del día calendario en Perú (igual para crear contratos, pagos y reportes). */
export const todayISO = () => todayPeruISO();

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  let date;
  if (typeof dateStr === 'string') {
    const t = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) date = new Date(`${t}T12:00:00-05:00`);
    else date = new Date(dateStr);
  } else date = dateStr.toDate?.() ?? new Date(dateStr);

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
};

export const generateContractId = () => {
  const date = todayISO().replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `CON-${date}-${rand}`;
};

export const generateReceiptId = () => {
  const date = todayISO().replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `RCP-${date}-${rand}`;
};

export const generateMpReference = () => `MP-TRX-${Math.floor(Math.random() * 1_000_000)}`;
export const generateYapeReference = (code) => `YAPE-${code}`;
export const generateWebReference = () => `WEB-${Math.floor(Math.random() * 1_000_000)}`;
