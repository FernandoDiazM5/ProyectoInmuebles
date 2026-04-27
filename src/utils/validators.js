export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone) => /^[0-9+\-\s]{6,15}$/.test(phone);

export const isValidDni = (dni) => /^[0-9A-Za-z]{6,15}$/.test(dni);

export const isPositiveNumber = (val) => !isNaN(val) && Number(val) > 0;

export const validateTenantForm = ({ name, dni, email }) => {
  if (!name?.trim()) return 'El nombre es obligatorio';
  if (!dni?.trim()) return 'La cédula/DNI es obligatoria';
  if (!isValidDni(dni)) return 'La cédula/DNI no es válida';
  if (!email?.trim()) return 'El email es obligatorio';
  if (!isValidEmail(email)) return 'El email no es válido';
  return null;
};

export const validateContractForm = ({ tenantId, propertyId, amount, duration }) => {
  if (!tenantId) return 'Debe seleccionar un arrendatario';
  if (!propertyId) return 'Debe seleccionar una propiedad';
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
