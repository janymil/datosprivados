/**
 * Validación del RUC peruano: 11 dígitos, prefijo válido y dígito verificador
 * (módulo 11 sobre los primeros 10 dígitos, pesos 5,4,3,2,7,6,5,4,3,2).
 */
const PREFIXES = new Set(["10", "15", "16", "17", "20"]);
const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function isValidRuc(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (!PREFIXES.has(value.slice(0, 2))) return false;

  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(value[index]), 0);
  let check = 11 - (sum % 11);
  if (check === 10) check = 0;
  if (check === 11) check = 1;
  return check === Number(value[10]);
}
