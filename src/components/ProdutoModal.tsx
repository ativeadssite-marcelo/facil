import React, { useState, useMemo } from 'react';
import { Plus, X, Loader2, Calculator, FileText, TrendingUp, TrendingDown, Copy, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const categoriasDefault = ['Filtros', 'Freios', 'Suspensão', 'Motor', 'Arrefecimento'];
const tiposVeiculo = ['Carro', 'Moto', 'Pesado', 'Agrícola'];

export interface ProdutoModalData {
  id?: string;
  codigo: string;
  codigo_fabrica: string;
  codigo_interno?: string;
  nome: string;
  marca: string;
  aplicacao: string;
  ncm: string;
  preco_venda: number;
  markup_percentual: number;
  estoque_minimo: number;
  categoria: string;
  tipo_veiculo: string;
  icms_percentual: number;
  ipi_percentual: number;
  pis_percentual: number;
  cofins_percentual: number;
  preco_custo?: number;
  frete_custo?: number;
}

export interface ProdutoModalProps {
  produto?: ProdutoModalData;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  saving?: boolean;
  markupPadrao?: string;
  customCategorias?: string[];
  onSaveSimulacao?: (snap: SimulacaoCustoSnapshot) => void;
  orcamentoLabel?: string;
}

export interface SimulacaoCustoSnapshot {
  id: string;
  produto_nome: string;
  data: string;
  preco_custo: number;
  frete_custo: number;
  custo_total: number;
  markup: number;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  total_impostos_pct: number;
  impostos_valor: number;
  preco_sugerido: number;
  preco_negociado: number;
  lucro_bruto: number;
  lucro_liquido: number;
  margem_bruta: number;
  margem_liquida: number;
  markup_real: number;
}

export default function ProdutoModal({ produto, onClose, onSave, saving, markupPadrao = '30', customCategorias = [], onSaveSimulacao, orcamentoLabel }: ProdutoModalProps) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const allCategorias = useMemo(() => {
    const merged = new Set([...categoriasDefault, ...customCategorias]);
    return Array.from(merged).sort();
  }, [customCategorias]);

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [tab, setTab] = useState<'cadastro' | 'calculo'>('cadastro');
  const [simPrecoVenda, setSimPrecoVenda] = useState('');

  const [form, setForm] = useState({
    nome: produto?.nome || '',
    marca: produto?.marca || '',
    aplicacao: produto?.aplicacao || '',
    ncm: produto?.ncm || '',
    precoCusto: produto?.preco_custo ? produto.preco_custo.toString() : '',
    freteCusto: produto?.frete_custo ? produto.frete_custo.toString() : '',
    precoVenda: produto?.preco_venda?.toString() || '',
    markup: produto?.markup_percentual?.toString() || markupPadrao,
    estoqueMinimo: produto?.estoque_minimo?.toString() || '',
    categoria: produto?.categoria || categoriasDefault[0],
    codigoFabrica: produto?.codigo_fabrica || '',
    tipoVeiculo: produto?.tipo_veiculo || 'Carro',
    icms: produto?.icms_percentual?.toString() || '',
    ipi: produto?.ipi_percentual?.toString() || '',
    pis: produto?.pis_percentual?.toString() || '',
    cofins: produto?.cofins_percentual?.toString() || '',
    fornecedor: '',
    quantidadeInicial: '',
  });

  const handleAddCategory = () => {
    const trimmed = newCat.trim();
    if (trimmed && !allCategorias.includes(trimmed)) {
      allCategorias.push(trimmed);
      allCategorias.sort();
    }
    if (trimmed) {
      setForm(f => ({ ...f, categoria: trimmed }));
    }
    setNewCat('');
    setShowNewCat(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      if (['precoCusto', 'freteCusto', 'markup', 'icms', 'ipi', 'pis', 'cofins'].includes(name)) {
        const custoBase = parseFloat(name === 'precoCusto' ? value : updated.precoCusto) || 0;
        const frete = parseFloat(name === 'freteCusto' ? value : updated.freteCusto) || 0;
        const custo = custoBase + frete;
        const markup = parseFloat(name === 'markup' ? value : updated.markup) || 0;
        const icms = parseFloat(name === 'icms' ? value : updated.icms) || 0;
        const ipi = parseFloat(name === 'ipi' ? value : updated.ipi) || 0;
        const pis = parseFloat(name === 'pis' ? value : updated.pis) || 0;
        const cofins = parseFloat(name === 'cofins' ? value : updated.cofins) || 0;
        if (custo > 0) {
          const totalImpostos = icms + ipi + pis + cofins;
          const precoVenda = custo * (1 + totalImpostos / 100) * (1 + markup / 100);
          updated.precoVenda = precoVenda.toFixed(2);
        }
      }
      return updated;
    });
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) {
      toast({ title: 'Preencha o nome do produto', variant: 'destructive' });
      return;
    }
    const precoCustoNum = parseFloat(form.precoCusto) || 0;
    const freteCustoNum = parseFloat(form.freteCusto) || 0;
    const custoTotal = precoCustoNum + freteCustoNum;
    onSave({
      codigo_fabrica: form.codigoFabrica.trim(),
      nome: form.nome.trim(),
      marca: form.marca.trim(),
      aplicacao: form.aplicacao.trim(),
      ncm: form.ncm.trim(),
      preco_venda: parseFloat(form.precoVenda) || 0,
      markup_percentual: parseFloat(form.markup) || 0,
      estoque_minimo: parseInt(form.estoqueMinimo) || 0,
      categoria: form.categoria,
      tipo_veiculo: form.tipoVeiculo,
      icms_percentual: parseFloat(form.icms) || 0,
      ipi_percentual: parseFloat(form.ipi) || 0,
      pis_percentual: parseFloat(form.pis) || 0,
      cofins_percentual: parseFloat(form.cofins) || 0,
      preco_custo: precoCustoNum,
      frete_custo: freteCustoNum,
      _lote: {
        fornecedor: form.fornecedor.trim(),
        preco_custo: custoTotal,
        quantidade: parseInt(form.quantidadeInicial) || 0,
      },
    });
  };

  const inputClass = "w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  const calc = useMemo(() => {
    const custoBase = parseFloat(form.precoCusto) || 0;
    const frete = parseFloat(form.freteCusto) || 0;
    const custo = custoBase + frete;
    const markup = parseFloat(form.markup) || 0;
    const icms = parseFloat(form.icms) || 0;
    const ipi = parseFloat(form.ipi) || 0;
    const pis = parseFloat(form.pis) || 0;
    const cofins = parseFloat(form.cofins) || 0;
    const totalImpostosPct = icms + ipi + pis + cofins;
    const precoSugerido = custo > 0 ? custo * (1 + totalImpostosPct / 100) * (1 + markup / 100) : 0;
    const precoNegociado = parseFloat(simPrecoVenda) || precoSugerido;
    const impostosValor = precoNegociado * (totalImpostosPct / 100);
    const lucroBruto = precoNegociado - custo;
    const lucroLiquido = precoNegociado - custo - impostosValor;
    const margemBruta = precoNegociado > 0 ? (lucroBruto / precoNegociado) * 100 : 0;
    const margemLiquida = precoNegociado > 0 ? (lucroLiquido / precoNegociado) * 100 : 0;
    const markupReal = custo > 0 ? ((precoNegociado - custo) / custo) * 100 : 0;
    return { custo, totalImpostosPct, impostosValor, precoSugerido, precoNegociado, lucroBruto, lucroLiquido, margemBruta, margemLiquida, markupReal };
  }, [form, simPrecoVenda]);

  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCopyResumo = async () => {
    const linhas = [
      `Simulação de Cálculo de Custo${form.nome ? ` — ${form.nome}` : ''}`,
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      '',
      `Custo: ${fmt(parseFloat(form.precoCusto) || 0)}`,
      `Frete: ${fmt(parseFloat(form.freteCusto) || 0)}`,
      `Custo total: ${fmt(calc.custo)}`,
      `Markup: ${(parseFloat(form.markup) || 0).toFixed(2)}%`,
      `Impostos (ICMS ${form.icms || 0}% + IPI ${form.ipi || 0}% + PIS ${form.pis || 0}% + COFINS ${form.cofins || 0}% = ${calc.totalImpostosPct.toFixed(2)}%): ${fmt(calc.impostosValor)}`,
      `Preço sugerido: ${fmt(calc.precoSugerido)}`,
      `Preço negociado: ${fmt(calc.precoNegociado)}`,
      `Lucro bruto: ${fmt(calc.lucroBruto)} (${calc.margemBruta.toFixed(2)}%)`,
      `Lucro líquido: ${fmt(calc.lucroLiquido)} (${calc.margemLiquida.toFixed(2)}%)`,
      `Markup real: ${calc.markupReal.toFixed(2)}%`,
    ];
    const texto = linhas.join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: 'Resumo copiado', description: 'Cole na observação do orçamento.' });
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Copie manualmente do console.', variant: 'destructive' });
      console.log(texto);
    }
  };

  const buildSnapshot = (): SimulacaoCustoSnapshot => ({
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `sim-${Date.now()}`,
    produto_nome: form.nome.trim() || 'Produto sem nome',
    data: new Date().toISOString(),
    preco_custo: parseFloat(form.precoCusto) || 0,
    frete_custo: parseFloat(form.freteCusto) || 0,
    custo_total: calc.custo,
    markup: parseFloat(form.markup) || 0,
    icms: parseFloat(form.icms) || 0,
    ipi: parseFloat(form.ipi) || 0,
    pis: parseFloat(form.pis) || 0,
    cofins: parseFloat(form.cofins) || 0,
    total_impostos_pct: calc.totalImpostosPct,
    impostos_valor: calc.impostosValor,
    preco_sugerido: calc.precoSugerido,
    preco_negociado: calc.precoNegociado,
    lucro_bruto: calc.lucroBruto,
    lucro_liquido: calc.lucroLiquido,
    margem_bruta: calc.margemBruta,
    margem_liquida: calc.margemLiquida,
    markup_real: calc.markupReal,
  });

  const handleSalvarSimulacao = () => {
    if (!onSaveSimulacao) return;
    if (calc.custo <= 0) {
      toast({ title: 'Informe ao menos o custo', variant: 'destructive' });
      return;
    }
    onSaveSimulacao(buildSnapshot());
    toast({ title: 'Simulação salva no orçamento', description: 'Ficará registrada mesmo que o produto seja alterado depois.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-lg w-full max-w-lg animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-bold text-lg">{produto ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-1 px-6 pt-3 border-b shrink-0">
          <button
            type="button"
            onClick={() => setTab('cadastro')}
            className={cn('px-3 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5', tab === 'cadastro' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            <FileText size={14} /> Cadastro
          </button>
          <button
            type="button"
            onClick={() => setTab('calculo')}
            className={cn('px-3 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5', tab === 'calculo' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            <Calculator size={14} /> Cálculo de Custo
          </button>
        </div>
        {tab === 'cadastro' && (
        <div className="px-6 py-5 grid grid-cols-2 gap-4 overflow-y-auto flex-1">
          {produto?.codigo_interno && (
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Código Interno (gerado automaticamente)
              </label>
              <input
                value={produto.codigo_interno}
                disabled
                className={cn(inputClass, 'bg-muted font-mono font-semibold text-primary')}
              />
            </div>
          )}
          {[
            { label: 'Código Fábrica', name: 'codigoFabrica', col: 1 },
            { label: 'Categoria', name: 'categoria', col: 1, select: allCategorias, addNew: true },
            { label: 'Tipo Veículo', name: 'tipoVeiculo', col: 1, select: tiposVeiculo },
            { label: 'Nome do Produto', name: 'nome', col: 2 },
            { label: 'Marca', name: 'marca', col: 1 },
            { label: 'Fornecedor', name: 'fornecedor', col: 1 },
            { label: 'Aplicação (Veículo)', name: 'aplicacao', col: 2 },
            { label: 'NCM', name: 'ncm', col: 1 },
            { label: 'Preço de Custo (R$)', name: 'precoCusto', col: 1 },
            { label: 'Frete no Custo (R$)', name: 'freteCusto', col: 1 },
            { label: 'Quantidade Inicial', name: 'quantidadeInicial', col: 1 },
            { label: 'Markup (%)', name: 'markup', col: 1 },
            { label: 'ICMS (%)', name: 'icms', col: 1 },
            { label: 'IPI (%)', name: 'ipi', col: 1 },
            { label: 'PIS (%)', name: 'pis', col: 1 },
            { label: 'COFINS (%)', name: 'cofins', col: 1 },
            { label: 'Preço de Venda (R$)', name: 'precoVenda', col: 1, disabled: true },
            { label: 'Estoque Mínimo', name: 'estoqueMinimo', col: 1 },
          ].map(({ label, name, col, select, disabled, addNew }) => (
            <div key={name} className={col === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {label}
              </label>
              {select ? (
                <div className="flex gap-1.5">
                  <select
                    name={name}
                    value={(form as any)[name]}
                    onChange={handleChange}
                    className={cn(inputClass, 'flex-1')}
                  >
                    {select.map(o => <option key={o}>{o}</option>)}
                  </select>
                  {addNew && !showNewCat && (
                    <button
                      type="button"
                      onClick={() => setShowNewCat(true)}
                      className="px-2 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Adicionar categoria"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <input
                  name={name}
                  value={(form as any)[name]}
                  onChange={handleChange}
                  disabled={!!disabled}
                  className={cn(inputClass, disabled && 'bg-muted font-semibold text-primary')}
                />
              )}
              {addNew && showNewCat && (
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    placeholder="Nova categoria..."
                    className={cn(inputClass, 'flex-1')}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    autoFocus
                  />
                  <button type="button" onClick={handleAddCategory} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'hsl(var(--primary))' }}>OK</button>
                  <button type="button" onClick={() => { setShowNewCat(false); setNewCat(''); }} className="px-2 py-1.5 rounded-lg border text-xs hover:bg-muted"><X size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        )}
        {tab === 'calculo' && (
          <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
            <p className="text-xs text-muted-foreground">
              Simule o lucro real antes de adicionar o produto ao estoque. Os valores vêm do cadastro — ajuste para ver o impacto.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Custo (R$)', name: 'precoCusto' },
                { label: 'Frete (R$)', name: 'freteCusto' },
                { label: 'Markup (%)', name: 'markup' },
                { label: 'ICMS (%)', name: 'icms' },
                { label: 'IPI (%)', name: 'ipi' },
                { label: 'PIS (%)', name: 'pis' },
                { label: 'COFINS (%)', name: 'cofins' },
              ].map(({ label, name }) => (
                <div key={name}>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
                  <input name={name} value={(form as any)[name]} onChange={handleChange} className={inputClass} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Preço de Venda Negociado (R$)</label>
                <input
                  value={simPrecoVenda}
                  onChange={e => setSimPrecoVenda(e.target.value)}
                  placeholder={calc.precoSugerido.toFixed(2)}
                  className={inputClass}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Sugerido pela fórmula: {fmt(calc.precoSugerido)}</p>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo total (com frete)</span><span className="font-semibold">{fmt(calc.custo)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Impostos ({calc.totalImpostosPct.toFixed(2)}%)</span><span className="font-semibold">{fmt(calc.impostosValor)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço negociado</span><span className="font-semibold">{fmt(calc.precoNegociado)}</span></div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lucro bruto</span>
                <span className={cn('font-semibold', calc.lucroBruto >= 0 ? 'text-emerald-600' : 'text-destructive')}>{fmt(calc.lucroBruto)} ({calc.margemBruta.toFixed(2)}%)</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold flex items-center gap-1.5">
                  {calc.lucroLiquido >= 0 ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-destructive" />}
                  Lucro líquido
                </span>
                <span className={cn('font-bold text-lg', calc.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                  {fmt(calc.lucroLiquido)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Margem líquida</span>
                <span>{calc.margemLiquida.toFixed(2)}% · Markup real {calc.markupReal.toFixed(2)}%</span>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleCopyResumo}
                className="w-full rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Copy size={14} /> Copiar resumo para o orçamento
              </button>
            )}
            {isAdmin && onSaveSimulacao && (
              <button
                type="button"
                onClick={handleSalvarSimulacao}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Save size={14} /> Salvar simulação no orçamento{orcamentoLabel ? ` (${orcamentoLabel})` : ''}
              </button>
            )}
          </div>
        )}
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'hsl(var(--primary))' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : produto ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </div>
    </div>
  );
}
