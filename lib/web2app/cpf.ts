/**
 * CPF helpers (browser + server). Asaas requires the payer's CPF to create the customer for Pix and card charges
 * (POST /v3/customers: `name` and `cpfCnpj` are required). We only forward it to Asaas: it is never stored in our DB.
 */
export const cpfDigits = (v: string): string => v.replace(/\D/g, "").slice(0, 11);

/** 123.456.789-09 as the person types. */
export function formatCpf(v: string): string {
  const d = cpfDigits(v);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Check digits (Receita Federal mod 11). Rejects 000.000.000-00, 111.111.111-11, … */
export function isValidCpf(v: string): boolean {
  const d = cpfDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const n = d.split("").map(Number);
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += n[i] * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === n[9] && dv(10) === n[10];
}
