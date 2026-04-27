export const ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  TENANT: 'tenant',
  OWNER: 'owner',
};

export const PROPERTY_STATUS = {
  AVAILABLE: 'DISPONIBLE',
  RENTED: 'ARRENDADA',
  MAINTENANCE: 'MANTENIMIENTO',
};

export const PROPERTY_TYPES = ['Departamento', 'Casa', 'Oficina', 'Local'];

export const TENANT_STATUS = {
  UP_TO_DATE: 'AL DÍA',
  DELINQUENT: 'MOROSO',
  INACTIVE: 'INACTIVO',
};

export const CONTRACT_STATUS = {
  ACTIVE: 'ACTIVO',
  TERMINATED: 'TERMINADO',
  SUSPENDED: 'SUSPENDIDO',
};

export const PAYMENT_METHODS = [
  'Transferencia Bancaria',
  'Yape',
  'Mercado Pago',
  'Tarjeta de Crédito / Débito',
];

export const PAYMENT_STATUS = {
  PENDING: 'PENDIENTE',
  PROCESSED: 'PROCESADO',
  REJECTED: 'RECHAZADO',
};

export const CONTRACT_DURATIONS = [
  { label: '6 Meses', value: 6 },
  { label: '1 Año (12 Meses)', value: 12 },
  { label: '2 Años (24 Meses)', value: 24 },
];

export const COLLECTION_GOAL_PERCENT = 92;

// Timeouts de UI (en milisegundos)
export const ALERT_TIMEOUT_MS = 4500;
export const SIMULATION_REDIRECT_MS = 1500;
export const SIMULATION_PROCESS_MS = 2000;
export const SIMULATION_SUCCESS_MS = 1500;
export const FORM_SUCCESS_CLOSE_MS = 2500;
