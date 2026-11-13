export interface CatalogProduct {
  id: string; codigo: string; codigo_fabrica: string; codigo_interno: string;
  nome: string; marca: string; aplicacao: string; categoria: string; tipo_veiculo: string;
  preco_venda: number; estoque_total: number;
}
export const publicProductFields = 'id,codigo,codigo_fabrica,codigo_interno,nome,marca,aplicacao,categoria,tipo_veiculo,preco_venda,estoque_total';
export function canSearchParts(roles: string[]) {
  return roles.some(role => role === 'admin' || role === 'vendedor');
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function selectCandidates(products: CatalogProduct[], vehicle: string, need: string) {
  const vehicleTokens = normalize(vehicle).split(/\W+/).filter(t => t.length > 1);
  const needTokens = normalize(need).split(/\W+/).filter(t => t.length > 2);
  return products.map((product, index) => {
    const text = normalize([product.nome, product.marca, product.aplicacao, product.categoria, product.tipo_veiculo].join(' '));
    const score = vehicleTokens.reduce((s, t) => s + (text.includes(t) ? 4 : 0), 0)
      + needTokens.reduce((s, t) => s + (text.includes(t) ? 2 : 0), 0);
    return { product, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 120).map(p => p.product);
}
export function validateMatches<T extends { produto_id: string; motivo: string; evidencia: string; verificacao: string }>(matches: T[], products: CatalogProduct[]) {
  const byId = new Map(products.map(p => [p.id, p]));
  const seen = new Set<string>();
  return matches.flatMap(match => {
    const produto = byId.get(match.produto_id);
    if (!produto || seen.has(produto.id)) return [];
    seen.add(produto.id);
    return [{ ...match, produto }];
  }).slice(0, 10);
}