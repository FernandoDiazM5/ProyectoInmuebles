/**
 * Simulación de integración con un **servicio externo de pagos** (PSP / pasarela).
 * En producción, este flujo sería un redirect/SDK del proveedor; aquí sólo proyectamos ese contrato para la demo.
 */

export const EXTERNAL_GATEWAY_NAME = 'CreditoSeguro PSP';
export const EXTERNAL_GATEWAY_TAGLINE =
  'El cargue real del dinero ocurre fuera del portal inmobiliario; aquí sólo confirmamos que el cobro autorizado llegó desde el procesador externo.';

/** @typedef {{ gradient: string; accent: string; channelLabel: string }} ExternalTheme */

/**
 * Canal mostrado en la cabecera del mock de proveedor externo según método elegido.
 * @returns {ExternalTheme}
 */
export function getExternalGatewayTheme(method) {
  switch (method) {
    case 'Mercado Pago':
      return {
        gradient: 'from-[#009ee3] via-[#0088cf] to-[#006bb3]',
        accent: '#009ee3',
        channelLabel: 'Canal Mercado Pago · vía pasarela',
      };
    case 'Yape':
      return {
        gradient: 'from-[#7400b8] via-[#62009c] to-[#480075]',
        accent: '#7400b8',
        channelLabel: 'Canal Billetera móvil · vía pasarela',
      };
    case 'Transferencia Bancaria':
      return {
        gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
        accent: '#059669',
        channelLabel: 'Transferencia · vía banca interoperable',
      };
    default:
      return {
        gradient: 'from-indigo-600 via-violet-600 to-purple-800',
        accent: '#4f46e5',
        channelLabel: 'Tarjetas Visa/Mastercard · vía procesador PCI',
      };
  }
}
