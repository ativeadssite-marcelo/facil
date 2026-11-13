import { DollarSign, TrendingUp, AlertTriangle, FileText, Package, ArrowUpRight, ShoppingCart, Users, Printer } from 'lucide-react';
import { useAppContext } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: string;
  trendPositive?: boolean;
  hidden?: boolean;
  loading?: boolean;
}

function KpiCard({ title, value, sub, icon, iconBg, trend, trendPositive, hidden, loading }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mb-1" />
          ) : (
            <p className={cn('text-2xl font-bold text-foreground', hidden && 'blur-sm select-none')}>
              {hidden ? 'R$ ••••' : value}
            </p>
          )}
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendPositive ? 'text-success' : 'text-destructive')}>
              <ArrowUpRight size={12} className={!trendPositive ? 'rotate-180' : ''} />
              {trend}
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 ml-4', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const { userRole } = useAppContext();
  const isAdmin = userRole === 'admin';

  const { data: produtos, isLoading: loadProd } = useQuery({
    queryKey: ['dashboard-produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('id, codigo, nome, marca, aplicacao, estoque_total, estoque_minimo, preco_venda, markup_percentual');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientes, isLoading: loadCli } = useQuery({
    queryKey: ['dashboard-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nome, telefone, created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: nfes, isLoading: loadNfe } = useQuery({
    queryKey: ['dashboard-nfes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nfe_importadas').select('id, numero, emitente_nome, valor_total, data_emissao, status');
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalProdutos = produtos?.length ?? 0;
  const totalClientes = clientes?.length ?? 0;
  const estoqueBaixo = produtos?.filter(p => p.estoque_total <= p.estoque_minimo).length ?? 0;
  const totalNfes = nfes?.length ?? 0;
  const valorTotalNfes = nfes?.reduce((s, n) => s + Number(n.valor_total), 0) ?? 0;

  const produtosBaixos = produtos?.filter(p => p.estoque_total <= p.estoque_minimo) ?? [];
  const ultimosClientes = clientes?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5) ?? [];

  const isLoading = loadProd || loadCli || loadNfe;

  const imprimirRelatorioEstoque = () => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
    let totalSugestao = 0;
    const linhas = produtosBaixos.map(p => {
      const atual = p.estoque_total ?? 0;
      const min = p.estoque_minimo ?? 0;
      const max = min * 3;
      const sugestao = Math.max(0, max - atual);
      totalSugestao += sugestao;
      return `<tr><td>${esc((p as any).codigo || p.id.slice(0,8))}</td><td>${esc((p as any).marca || '—')}</td><td>${esc(p.nome)}</td><td style="text-align:right">${atual}</td><td style="text-align:right">${min}</td><td style="text-align:right">${max}</td><td style="text-align:right;font-weight:600">${sugestao}</td></tr>`;
    }).join('');
    const body = linhas || '<tr><td colspan="7" style="text-align:center;padding:24px">Sem itens em estoque crítico</td></tr>';
    win.document.write(`<!doctype html><html><head><title>Relatório de Curva de Demanda</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;margin:0 0 16px;color:#666;font-weight:500}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}tfoot td{font-weight:700;background:#fafafa}</style>
      </head><body>
      <h1>Relatório de Curva de Demanda — Estoque Crítico</h1>
      <h2>Emitido em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</h2>
      <table>
        <thead><tr><th>Código</th><th>Marca</th><th>Descrição</th><th style="text-align:right">Atual</th><th style="text-align:right">Mín</th><th style="text-align:right">Máx</th><th style="text-align:right">Sugestão de Compra</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><td colspan="6" style="text-align:right">Total de itens críticos: ${produtosBaixos.length} — Total sugerido para compra</td><td style="text-align:right">${totalSugestao}</td></tr></tfoot>
      </table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral do sistema</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Produtos"
          value={`${totalProdutos}`}
          sub="Cadastrados no sistema"
          icon={<Package className="h-5 w-5 text-primary" />}
          iconBg="bg-primary-light"
          loading={loadProd}
        />
        <KpiCard
          title="Total de Clientes"
          value={`${totalClientes}`}
          sub="Cadastrados no sistema"
          icon={<Users className="h-5 w-5 text-success" />}
          iconBg="bg-success-light"
          loading={loadCli}
        />
        <KpiCard
          title="Estoque Baixo"
          value={`${estoqueBaixo} itens`}
          sub="Abaixo do mínimo"
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          iconBg="bg-warning-light"
          loading={loadProd}
        />
        <KpiCard
          title="NF-e Importadas"
          value={`${totalNfes}`}
          sub={isLoading ? '' : `Total: ${currency(valorTotalNfes)}`}
          icon={<FileText className="h-5 w-5 text-info" />}
          iconBg="bg-info-light"
          loading={loadNfe}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Últimos Clientes */}
        <div className="xl:col-span-2 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">Últimos Clientes Cadastrados</h2>
            </div>
            <span className="badge-orange">{totalClientes} total</span>
          </div>
          <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {loadCli ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {[1, 2, 3].map(j => (
                        <td key={j} className="px-4 py-3.5">
                          <Skeleton className="h-4 w-full" style={{ maxWidth: `${60 + j * 10}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (clientes?.length ?? 0) === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum cliente cadastrado</td></tr>
                ) : (
                  (clientes ?? []).slice().sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.nome}</td>
                      <td className="text-muted-foreground">{c.telefone || '—'}</td>
                      <td className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Curva de Demanda */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              <h2 className="font-semibold text-sm">Curva de Demanda</h2>
            </div>
          </div>
          <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-warning-light flex items-center justify-center">
              <Package size={26} className="text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{loadProd ? '—' : produtosBaixos.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {produtosBaixos.length === 1 ? 'produto em estoque crítico' : 'produtos em estoque crítico'}
              </p>
            </div>
            <button
              onClick={imprimirRelatorioEstoque}
              disabled={loadProd}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Printer size={14} /> Gerar Relatório
            </button>
            <p className="text-[11px] text-muted-foreground max-w-[240px]">
              Análise de curva de demanda com estoque atual, mínimo, máximo e sugestão de compra.
            </p>
          </div>
        </div>
      </div>

      {/* NF-e Recentes */}
      {isAdmin && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-info" />
              <h2 className="font-semibold text-sm">NF-e Recentes</h2>
            </div>
            <span className="badge-warning">{totalNfes} importadas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Emitente</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadNfe ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map(j => (
                        <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : nfes?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma NF-e importada</td></tr>
                ) : (
                  nfes?.slice(0, 5).map(n => (
                    <tr key={n.id}>
                      <td className="font-mono text-xs font-medium text-primary">{n.numero}</td>
                      <td className="font-medium">{n.emitente_nome}</td>
                      <td className="text-muted-foreground">{new Date(n.data_emissao).toLocaleDateString('pt-BR')}</td>
                      <td className="font-semibold">{currency(Number(n.valor_total))}</td>
                      <td><span className="badge-green">{n.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
