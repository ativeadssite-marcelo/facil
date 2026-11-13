export type UserRole = 'admin' | 'vendedor' | 'caixa' | 'estoque';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Lote {
  id: string;
  fornecedor: string;
  precoCusto: number;
  quantidade: number;
  dataEntrada: string;
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  marca: string;
  aplicacao: string;
  ncm: string;
  precoVenda: number;
  estoqueMinimo: number;
  estoqueTotal: number;
  lotes: Lote[];
  categoria: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
}

export interface ItemOrcamento {
  produto: Produto;
  quantidade: number;
  precoUnitario: number;
  loteId: string;
  precoCusto: number;
}

export interface Orcamento {
  id: string;
  numero: string;
  cliente: Cliente;
  itens: ItemOrcamento[];
  status: 'pendente' | 'aprovado' | 'cancelado' | 'finalizado';
  dataCriacao: string;
  total: number;
  vendedorId: string;
  vendedorNome: string;
}

export interface Venda {
  id: string;
  orcamentoId: string;
  numero: string;
  cliente: Cliente;
  itens: ItemOrcamento[];
  total: number;
  lucro: number;
  dataVenda: string;
  vendedorId: string;
  vendedorNome: string;
  formaPagamento: string;
}
