import { useAppContext } from '@/components/Layout';
import { Award, DollarSign, TrendingUp, BarChart3, Loader2, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const DEFAULT_COMISSAO = 5;
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface VendaRow {
  id: string;
  numero: string;
  cliente_nome: string;
  total: number;
  forma_pagamento: string;
  created_by: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  nome: string;
}

function useVendasComVendedores() {
  return useQuery({
    queryKey: ['financeiro-vendas'],
    queryFn: async () => {
      const [vendasRes, profilesRes, configRes] = await Promise.all([
        supabase.from('vendas').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, nome'),
        supabase.from('configuracoes').select('valor').eq('chave', 'comissao_percentual').maybeSingle(),
      ]);
      if (vendasRes.error) throw vendasRes.error;
      const vendas = (vendasRes.data ?? []) as VendaRow[];
      const profiles = (profilesRes.data ?? []) as ProfileRow[];
      const profileMap = new Map(profiles.map(p => [p.id, p.nome]));
      const comissaoPercentual = configRes.data?.valor ? Number(configRes.data.valor) : DEFAULT_COMISSAO;
      return { vendas, profileMap, comissaoPercentual };
    },
  });
}

interface VendedorStats {
  nome: string;
  userId: string;
  qtdVendas: number;
  totalFaturamento: number;
  comissao: number;
}

export default function Financeiro() {
  const { userRole } = useAppContext();
  const isAdmin = userRole === 'admin';
  const { data, isLoading } = useVendasComVendedores();

  const vendas = data?.vendas ?? [];
  const profileMap = data?.profileMap ?? new Map<string, string>();
  const comissaoPercentual = data?.comissaoPercentual ?? DEFAULT_COMISSAO;

  // Agrupar por vendedor
  const vendedorMap = new Map<string, VendedorStats>();
  for (const v of vendas) {
    const key = v.created_by ?? 'desconhecido';
    const nome = v.created_by ? (profileMap.get(v.created_by) ?? 'Sem nome') : 'Desconhecido';
    const existing = vendedorMap.get(key);
    if (existing) {
      existing.qtdVendas += 1;
      existing.totalFaturamento += Number(v.total);
      existing.comissao += (Number(v.total) * comissaoPercentual) / 100;
    } else {
      vendedorMap.set(key, {
        nome,
        userId: key,
        qtdVendas: 1,
        totalFaturamento: Number(v.total),
        comissao: (Number(v.total) * comissaoPercentual) / 100,
      });
    }
  }
  const vendedores = Array.from(vendedorMap.values()).sort((a, b) => b.totalFaturamento - a.totalFaturamento);

  const totalFaturamento = vendas.reduce((s, v) => s + Number(v.total), 0);
  const totalComissoes = vendedores.reduce((s, v) => s + v.comissao, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Relatório de comissões e resultados</p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3.5 flex items-center gap-3">
          <Lock size={16} className="text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Perfil Vendedor: valores de comissão estão ocultos. Contate o administrador.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Faturamento Total</p>
                  <p className="text-2xl font-bold">{fmt(totalFaturamento)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{vendas.length} vendas</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <DollarSign size={18} className="text-primary" />
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Comissões</p>
                  <p className={cn('text-2xl font-bold', !isAdmin && 'blur-sm select-none')}>
                    {isAdmin ? fmt(totalComissoes) : 'R$ •••'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{comissaoPercentual}% sobre faturamento</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <Award size={18} className="text-primary" />
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Vendedores Ativos</p>
                  <p className="text-2xl font-bold">{vendedores.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">com vendas registradas</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <TrendingUp size={18} className="text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de comissões */}
          {!vendedores.length ? (
            <div className="rounded-xl border bg-card shadow-sm py-16 text-center">
              <Award size={40} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">Nenhuma venda registrada</p>
              <p className="text-sm text-muted-foreground/70 mt-1">As comissões aparecerão quando houver vendas finalizadas</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b">
                <Award size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Comissões por Vendedor</h2>
                <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary">
                  {comissaoPercentual}% sobre faturamento
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th>Qtd. Vendas</th>
                      <th>Faturamento</th>
                      {isAdmin && <th>Comissão ({comissaoPercentual}%)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vendedores.map((v, i) => (
                      <tr key={v.userId}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0"
                              style={{ background: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                            >
                              {v.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{v.nome}</p>
                              {i === 0 && vendedores.length > 1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary">Top Vendedor</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{v.qtdVendas} vendas</td>
                        <td className="font-semibold">{fmt(v.totalFaturamento)}</td>
                        {isAdmin && (
                          <td>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary">
                              {fmt(v.comissao)}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detalhamento admin */}
          {isAdmin && vendas.length > 0 && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b">
                <BarChart3 size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Detalhamento de Vendas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nº Venda</th>
                      <th>Cliente</th>
                      <th>Vendedor</th>
                      <th>Data</th>
                      <th>Total</th>
                      <th>Comissão</th>
                      <th>Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.map(v => {
                      const comissao = (Number(v.total) * comissaoPercentual) / 100;
                      const vendedorNome = v.created_by ? (profileMap.get(v.created_by) ?? 'Sem nome') : 'Desconhecido';
                      return (
                        <tr key={v.id}>
                          <td className="font-mono text-xs font-semibold text-primary">{v.numero}</td>
                          <td className="font-medium">{v.cliente_nome}</td>
                          <td className="text-muted-foreground">{vendedorNome}</td>
                          <td className="text-muted-foreground text-sm">
                            {new Date(v.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="font-semibold">{fmt(Number(v.total))}</td>
                          <td>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">
                              {fmt(comissao)}
                            </span>
                          </td>
                          <td><span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground">{v.forma_pagamento}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
