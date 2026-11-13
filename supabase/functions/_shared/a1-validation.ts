export const MAX_A1_BYTES = 256 * 1024;

export function canManageA1(roles: string[]): boolean {
  return roles.includes('admin');
}

export function validateA1Upload(name: string, size: number, password: string, cnpj: string): string | null {
  if (!/\.(pfx|p12)$/i.test(name)) return 'Selecione um arquivo .pfx ou .p12.';
  if (size <= 0 || size > MAX_A1_BYTES) return 'O certificado deve ter até 256 KB e não pode estar vazio.';
  if (!password || password.length > 1024) return 'Informe uma senha válida para o certificado.';
  if (!/^\d{14}$/.test(cnpj)) return 'Informe o CNPJ com 14 números.';
  return null;
}