import React, { useState, useMemo } from 'react';
import { Search, Plus, Package, ChevronDown, ChevronRight, Edit2, Trash2, Filter, X, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { useAppContext } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ProdutoModal from '@/components/ProdutoModal';
import { exportToCsv, exportToExcel } from '@/lib/export';

const categoriasDefault = ['Filtros', 'Freios', 'Suspensão', 'Motor', 'Arrefecimento'];
const tiposVeiculo = ['Carro', 'Moto', 'Pesado', 'Agrícola'];

interface LoteDB {
  id: string;
  fornecedor: string;
  preco_custo: number;
  quantidade: number;
  data_entrada: string;
}

interface ProdutoDB {
  id: string;
  codigo: string;
  codigo_fabrica: string;
  codigo_interno: string;
  nome: string;
  marca: string;
  aplicacao: string;
  ncm: string;
  preco_venda: number;
  estoque_minimo: number;
  estoque_total: number;
  categoria: string;
  markup_percentual: number;
  tipo_veiculo: string;
  icms_percentual: number;
  ipi_percentual: number;
  pis_percentual: number;
  cofins_percentual: number;
  imagem_url?: string | null;
  lotes?: LoteDB[];
}

function LoteRow({ lote, isAdmin }: { lote: LoteDB; isAdmin: boolean }) {
  return (
    <tr className="bg-muted/20">
      <td className="px-4 py-2.5 pl-12 text-xs text-muted-foreground font-medium">
        <span className="badge-gray">Lote</span>
      </td>
      <td className="px-4 py-2.5 text-xs">{lote.fornecedor}</td>
      <td className="px-4 py-2.5 text-xs">
        {isAdmin ? (
          <span className="font-semibold text-foreground">
            {lote.preco_custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs font-semibold">{lote.quantidade} un</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {new Date(lote.data_entrada).toLocaleDateString('pt-BR')}
      </td>
      <td />
    </tr>
  );
}


export default function Produtos() {
  const { userRole } = useAppContext();
  const isAdmin = userRole === 'admin';

  const queryClient = useQueryClient();

  const { data: markupPadrao } = useQuery({
    queryKey: ['configuracoes', 'markup_padrao'],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'markup_padrao')
        .single();
      return data?.valor ?? '30';
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, any>) => {
      const lote = payload._lote;
      delete payload._lote;
      if (id) {
        const { error } = await (supabase as any).from('produtos').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await (supabase as any)
          .from('produtos')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        if (inserted && lote && (lote.fornecedor || lote.preco_custo > 0 || lote.quantidade > 0)) {
          await (supabase as any).from('lotes').insert({
            produto_id: inserted.id,
            fornecedor: lote.fornecedor || '—',
            preco_custo: lote.preco_custo,
            quantidade: lote.quantidade,
          });
          if (lote.quantidade > 0) {
            await (supabase as any)
              .from('produtos')
              .update({ estoque_total: lote.quantidade })
              .eq('id', inserted.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setModal(null);
      toast({ title: 'Produto salvo com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar produto', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('produtos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast({ title: 'Produto excluído!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [tipoVeic, setTipoVeic] = useState('Todos');
  const [marcaFiltro, setMarcaFiltro] = useState('Todas');
  const [modeloFiltro, setModeloFiltro] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<'new' | ProdutoDB | null>(null);

  const { data: allProdutos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('produtos')
        .select('*, lotes(id, fornecedor, preco_custo, quantidade, data_entrada)')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as ProdutoDB[];
    },
  });

  const filterCategorias = useMemo(() => {
    const fromProducts = allProdutos.map(p => p.categoria).filter(Boolean);
    const merged = new Set([...categoriasDefault, ...fromProducts]);
    return Array.from(merged).sort();
  }, [allProdutos]);

  const filterMarcas = useMemo(() => {
    const set = new Set(allProdutos.map(p => p.marca).filter(Boolean));
    return Array.from(set).sort();
  }, [allProdutos]);

  const hasActiveFilter =
    search.trim().length > 0 ||
    categoria !== 'Todos' ||
    tipoVeic !== 'Todos' ||
    marcaFiltro !== 'Todas' ||
    modeloFiltro.trim().length > 0;

  const produtos = useMemo(() => {
    if (!hasActiveFilter) return [];
    return allProdutos.filter((p: ProdutoDB) => {
      const q = search.toLowerCase();
        const matchSearch = !q
          || p.nome.toLowerCase().includes(q)
          || (p.codigo_fabrica || '').toLowerCase().includes(q)
          || (p.codigo_interno || '').toLowerCase().includes(q)
          || p.aplicacao.toLowerCase().includes(q)
          || p.marca.toLowerCase().includes(q);
      const matchCat = categoria === 'Todos' || p.categoria === categoria;
      const matchTipo = tipoVeic === 'Todos' || p.tipo_veiculo === tipoVeic;
      const matchMarca = marcaFiltro === 'Todas' || p.marca === marcaFiltro;
      const m = modeloFiltro.trim().toLowerCase();
      const matchModelo = !m || p.aplicacao.toLowerCase().includes(m);
      return matchSearch && matchCat && matchTipo && matchMarca && matchModelo;
    });
  }, [search, categoria, tipoVeic, marcaFiltro, modeloFiltro, allProdutos, hasActiveFilter]);

  const clearFilters = () => {
    setSearch(''); setCategoria('Todos'); setTipoVeic('Todos');
    setMarcaFiltro('Todas'); setModeloFiltro('');
  };

  const exportRows = hasActiveFilter && produtos.length > 0 ? produtos : allProdutos;

  const buildExport = () => {
    const headers = [
      'Código Fábrica', 'Código Interno', 'Produto', 'Marca', 'Categoria',
      'Tipo Veículo', 'Aplicação', 'NCM', 'Estoque', 'Estoque Mínimo', 'Preço Venda',
      ...(isAdmin ? ['Markup %', 'ICMS %', 'IPI %', 'PIS %', 'COFINS %'] : []),
    ];
    const rows = exportRows.map((p: any) => [
      p.codigo_fabrica || '', p.codigo_interno || '', p.nome, p.marca, p.categoria,
      p.tipo_veiculo, p.aplicacao, p.ncm, p.estoque_total, p.estoque_minimo,
      Number(p.preco_venda ?? 0).toFixed(2).replace('.', ','),
      ...(isAdmin ? [p.markup_percentual, p.icms_percentual, p.ipi_percentual, p.pis_percentual, p.cofins_percentual] : []),
    ]);
    return { headers, rows };
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleExportCsv = () => {
    const { headers, rows } = buildExport();
    if (!rows.length) return toast({ title: 'Nada para exportar', variant: 'destructive' });
    exportToCsv(`catalogo-pecas-${stamp()}.csv`, headers, rows);
    toast({ title: `${rows.length} peças exportadas em CSV` });
  };

  const handleExportExcel = () => {
    const { headers, rows } = buildExport();
    if (!rows.length) return toast({ title: 'Nada para exportar', variant: 'destructive' });
    exportToExcel(`catalogo-pecas-${stamp()}.xls`, headers, rows);
    toast({ title: `${rows.length} peças exportadas em Excel` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allProdutos.length} produtos cadastrados</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground hover:border-primary/50 active:scale-95"
        >
          <Download size={15} />
          CSV
        </button>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground hover:border-primary/50 active:scale-95"
        >
          <FileSpreadsheet size={15} />
          Excel
        </button>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-orange transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'hsl(var(--primary))' }}
        >
          <Plus size={16} />
          Novo Produto
        </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, código, marca ou aplicação..."
            className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
          </div>
          {hasActiveFilter && (
            <button onClick={clearFilters} className="px-3 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center gap-1.5">
              <X size={13} /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={tipoVeic} onChange={e => setTipoVeic(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="Todos">Tipo de veículo</option>
            {tiposVeiculo.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={marcaFiltro} onChange={e => setMarcaFiltro(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="Todas">Marca (peça)</option>
            {filterMarcas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            value={modeloFiltro}
            onChange={e => setModeloFiltro(e.target.value)}
            placeholder="Modelo / aplicação"
            className="rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="Todos">Categoria</option>
            {filterCategorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="hidden flex-wrap gap-2">
          {['Todos', ...filterCategorias].map(c => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-semibold transition-all border',
                categoria === c
                  ? 'text-white border-primary shadow-orange'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
              style={categoria === c ? { background: 'hsl(var(--primary))' } : {}}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {!hasActiveFilter ? (
          <div className="py-16 text-center">
            <Search size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">Use a busca ou os filtros para localizar peças</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Digite um termo, escolha uma categoria, marca, modelo ou tipo de veículo</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Tente ajustar sua busca ou filtros</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-22rem)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>Fábrica</th>
                  <th>Interno</th>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th>Aplicação</th>
                  <th>Estoque</th>
                  <th>Preço Venda</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => {
                  const isExpanded = expanded === p.id;
                  const stockLow = p.estoque_total <= p.estoque_minimo;
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : p.id)}
                        className={cn(isExpanded && 'bg-primary-light')}
                      >
                        <td className="pl-4">
                          {isExpanded ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                        </td>
                        <td className="font-mono text-xs text-muted-foreground">{p.codigo_fabrica || '—'}</td>
                        <td className="font-mono text-xs font-semibold text-primary">{p.codigo_interno || '—'}</td>
                        <td className="font-medium">{p.nome}</td>
                        <td className="text-muted-foreground">{p.marca}</td>
                        <td className="text-muted-foreground text-sm truncate max-w-[220px] whitespace-nowrap" title={p.aplicacao}>{p.aplicacao}</td>
                        <td>
                          <span className={stockLow ? 'badge-red' : 'badge-green'}>
                            {p.estoque_total} un
                          </span>
                        </td>
                        <td className="font-semibold">
                          {p.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setModal(p)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Excluir este produto?')) deleteMutation.mutate(p.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <>
                          <tr className="bg-muted/10">
                            <td colSpan={10}>
                              <div className="px-12 py-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gestão de Lotes (FIFO)</p>
                              </div>
                            </td>
                          </tr>
                          {(p.lotes ?? []).map(l => (
                            <LoteRow key={l.id} lote={l} isAdmin={isAdmin} />
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ProdutoModal
          produto={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={(data) => {
            const payload = modal !== 'new' ? { id: modal.id, ...data } : data;
            saveMutation.mutate(payload);
          }}
          saving={saveMutation.isPending}
          markupPadrao={markupPadrao ?? '30'}
          customCategorias={filterCategorias}
        />
      )}
    </div>
  );
}
