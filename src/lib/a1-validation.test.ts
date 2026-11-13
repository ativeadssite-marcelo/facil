import { describe, expect, it } from 'vitest';
import { canManageA1, validateA1Upload } from '../../supabase/functions/_shared/a1-validation';

describe('Cadastro direto de A1', () => {
  it('aceita arquivos pfx e p12 sem conversão manual', () => {
    expect(validateA1Upload('empresa.pfx', 100, 'senha-teste', '12345678000190')).toBeNull();
    expect(validateA1Upload('empresa.p12', 100, 'senha-teste', '12345678000190')).toBeNull();
    expect(validateA1Upload('empresa.txt', 100, 'senha-teste', '12345678000190')).not.toBeNull();
  });
  it('restringe o cadastro ao administrador', () => {
    expect(canManageA1(['vendedor', 'admin'])).toBe(true);
    expect(canManageA1(['vendedor', 'caixa', 'estoque'])).toBe(false);
    expect(canManageA1([])).toBe(false);
  });
  it('rejeita arquivos vazios e maiores que 256 KB', () => {
    expect(validateA1Upload('a.pfx', 0, 'teste', '12345678000190')).not.toBeNull();
    expect(validateA1Upload('a.pfx', 262145, 'teste', '12345678000190')).not.toBeNull();
  });
});