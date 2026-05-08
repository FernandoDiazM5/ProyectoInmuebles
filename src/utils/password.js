const CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Contraseña aleatoria para cuentas nuevas (Firebase exige mín. 6 caracteres). */
export function generateRandomPassword(length = 12) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  let s = '';
  for (let i = 0; i < length; i += 1) {
    s += CHARS[arr[i] % CHARS.length];
  }
  return s;
}
