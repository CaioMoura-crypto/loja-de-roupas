// Structural validation only; it does not establish ownership or registration status.
// CNPJ algorithm: Receita Federal / Serpro, manual-dv-cnpj.pdf (numeric and alphanumeric).
export function normalizeTaxId(value: string): string | null {
  const id = value.trim().toUpperCase().replace(/[.\s/-]/g, '');
  if (!id) return value.trim() ? null : '';
  if (/^(.)\1+$/.test(id)) return null;
  const mod11 = (sum: number) => sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (/^\d{11}$/.test(id)) {
    const digit = (length: number) => mod11([...id.slice(0, length)].reduce((sum, char, index) => sum + Number(char) * (length + 1 - index), 0));
    return digit(9) === Number(id[9]) && digit(10) === Number(id[10]) ? id : null;
  }
  if (/^[A-Z\d]{12}\d{2}$/.test(id)) {
    const digit = (length: number) => mod11([...id.slice(0, length)].reduce((sum, char, index) => sum + (char.charCodeAt(0) - 48) * (2 + (length - 1 - index) % 8), 0));
    return digit(12) === Number(id[12]) && digit(13) === Number(id[13]) ? id : null;
  }
  return null;
}
