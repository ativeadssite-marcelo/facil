import { describe, expect, it } from 'vitest';
import { canSearchParts, selectCandidates, validateMatches, publicProductFields, type CatalogProduct } from '../../supabase/functions/_shared/catalog-matching';
const product: CatalogProduct = { id: 'real', codigo: '', codigo_fabrica: 'F1', codigo_interno: 'INT-00001', nome: 'Filtro óleo', marca: 'Marca', aplicacao: 'VW Gol 2018', categoria: 'Filtros', tipo_veiculo: 'Carro', preco_venda: 50, estoque_total: 2 };
describe('busca IA no catálogo', () => {
  it('permite vendedores e administradores', () => {
    expect(canSearchParts(['vendedor'])).toBe(true);
    expect(canSearchParts(['admin'])).toBe(true);
    expect(canSearchParts(['estoque', 'caixa'])).toBe(false);
    expect(canSearchParts([])).toBe(false);
  });
  it('descarta peças inventadas e duplicadas pelo modelo', () => {
    const match = { produto_id: 'real', motivo: 'Filtro', evidencia: 'Gol 2018', verificacao: 'Conferir motor' };
    expect(validateMatches([match, { ...match, produto_id: 'inventado' }, match], [product]).map(m => m.produto.id)).toEqual(['real']);
  });
  it('prioriza veículo e necessidade no catálogo', () => {
    const other = { ...product, id: 'other', nome: 'Pastilha', aplicacao: 'Fiat Uno', categoria: 'Freios' };
    expect(selectCandidates([other, product], 'VW Gol', 'filtro de óleo')[0].id).toBe('real');
  });
  it('não envia custos nem lucros na projeção do catálogo', () => {
    expect(publicProductFields.split(',')).not.toContain('preco_custo');
    expect(publicProductFields.split(',')).not.toContain('frete_custo');
    expect(publicProductFields.split(',')).toContain('aplicacao');
  });
});