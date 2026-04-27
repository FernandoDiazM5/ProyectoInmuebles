export const ROLES = {
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
