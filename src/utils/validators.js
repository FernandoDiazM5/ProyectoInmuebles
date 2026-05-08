export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

/** Formatea hasta 9 dígitos locales como "999 999 999". */
export const formatPhoneNine = (input) => {
  const d = digitsOnly(input).slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

/** DNI: exactamente 8 dígitos. */
export const isValidDni = (dni) => /^\d{8}$/.test(digitsOnly(dni));

/**
 * Teléfono opcional: si se completa el campo debe haber exactamente 9 dígitos.
 * admite entrada con espacios (se valida sólo dígitos).
 */
export const isValidPhone = (phone) => {
  if (!phone || !String(phone).trim()) return true;
  return digitsOnly(phone).length === 9;
};

export const isPositiveNumber = (val) => !isNaN(val) && Number(val) > 0;

export const validateTenantForm = ({ name, dni, email }) => {
  if (!name?.trim()) return 'El nombre es obligatorio';
  if (!dni?.trim()) return 'El DNI es obligatorio';
  if (!isValidDni(dni)) return 'El DNI debe tener 8 dígitos';
  if (!email?.trim()) return 'El email es obligatorio';
  if (!isValidEmail(email)) return 'El email no es válido';
  return null;
};

export const validateContractForm = ({ tenantId, propertyId, amount, duration }) => {
  if (!tenantId) return 'Debe seleccionar un arrendatario';
  if (!propertyId) return 'Debe seleccionar un departamento';
  if (!isPositiveNumber(amount)) return 'El monto mensual debe ser mayor a 0';
  if (!duration) return 'Debe seleccionar la duración';
  return null;
};

export const validatePaymentForm = ({ tenantId, amount, maxAmount }) => {
  if (!tenantId) return 'Debe seleccionar un arrendatario';
  if (!isPositiveNumber(amount)) return 'El monto debe ser mayor a 0';
  if (Number(amount) > Number(maxAmount)) return 'El monto supera el saldo pendiente';
  return null;
};
