import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Loader2, Package, PlusCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NFeData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  emitenteCnpj: string;
  emitenteNome: string;
  destinatarioCnpj: string;
  dataEmissao: string;
  valorTotal: number;
  tipo: 'entrada' | 'saida';
  itens: NFeItem[];
}

interface NFeItem {
  cProd: string;
  xProd: string;
  ncm: string;
  qCom: number;
  vUnCom: number;
  cEan?: string;
  pICMS: number;
  pIPI: number;
  pPIS: number;
  pCOFINS: number;
}

interface ItemAcao {
  acao: 'criar' | 'atualizar' | 'ignorar';
  produtoId?: string;
  estoqueAtual?: number;
  estoqueNovo?: number;
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error' | 'duplicate';

function parseNFeXML(xmlText: string): NFeData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const get = (tag: string, ctx: Element | Document = doc) =>
    ctx.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? '';

  const infNFe = doc.getElementsByTagNameNS('*', 'infNFe')[0];
  if (!infNFe) throw new Error('XML inválido: tag infNFe não encontrada');

  const chaveAcesso = infNFe.getAttribute('Id')?.replace('NFe', '') ?? '';
  const numero = get('nNF');
  const serie = get('serie');

  const emit = doc.getElementsByTagNameNS('*', 'emit')[0];
  const dest = doc.getElementsByTagNameNS('*', 'dest')[0];
  const ide = doc.getElementsByTagNameNS('*', 'ide')[0];

  const emitenteCnpj = get('CNPJ', emit) || get('CPF', emit);
  const emitenteNome = get('xNome', emit) || get('xFant', emit);
  const destinatarioCnpj = get('CNPJ', dest) || get('CPF', dest);
  const dataEmissao = (get('dhEmi', ide) || get('dEmi', ide)).split('T')[0];
  const valorTotal = parseFloat(get('vNF') || '0');

  // tpNF: 0=entrada, 1=saida
  const tpNF = get('tpNF', ide);
  const tipo: 'entrada' | 'saida' = tpNF === '1' ? 'saida' : 'entrada';

  const detElements = doc.getElementsByTagNameNS('*', 'det');
  const itens: NFeItem[] = Array.from(detElements).map(det => {
    const prod = det.getElementsByTagNameNS('*', 'prod')[0];
    const imposto = det.getElementsByTagNameNS('*', 'imposto')[0];

    const getTax = (parentTag: string, pTag: string): number => {
      if (!imposto) return 0;
      const parent = imposto.getElementsByTagNameNS('*', parentTag)[0];
      if (!parent) return 0;
      const el = parent.getElementsByTagNameNS('*', pTag)[0];
      return parseFloat(el?.textContent?.trim() || '0');
    };

    return {
      cProd: get('cProd', prod),
      xProd: get('xProd', prod),
      ncm: get('NCM', prod),
      qCom: parseFloat(get('qCom', prod) || '0'),
      vUnCom: parseFloat(get('vUnCom', prod) || '0'),
      cEan: get('cEAN', prod) || undefined,
      pICMS: getTax('ICMS', 'pICMS'),
      pIPI: getTax('IPI', 'pIPI'),
      pPIS: getTax('PIS', 'pPIS'),
      pCOFINS: getTax('COFINS', 'pCOFINS'),
    };
  });

  return { chaveAcesso, numero, serie, emitenteCnpj, emitenteNome, destinatarioCnpj, dataEmissao, valorTotal, tipo, itens };
}

export default function ImportarNFe() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [nfeData, setNfeData] = useState<NFeData | null>(null);
  const [xmlText, setXmlText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [acoes, setAcoes] = useState<ItemAcao[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione um arquivo .xml de NF-e', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: 'Arquivo muito grande', description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
      return;
    }
    setStatus('parsing');
    try {
      const text = await file.text();

      // Validação anti-DoS: limitar quantidade de elementos <det> antes de parsear
      const detCount = (text.match(/<det[\s>]/g) || []).length;
      if (detCount > 1000) {
        throw new Error('Arquivo contém muitos itens (máximo: 1000). Verifique se é uma NF-e válida.');
      }

      // Bloquear entidades XML externas (XXE) verificando presença de DOCTYPE
      if (/<!DOCTYPE/i.test(text)) {
        throw new Error('Arquivo XML contém declaração DOCTYPE não permitida.');
      }

      setXmlText(text);
      const data = parseNFeXML(text);
      setNfeData(data);
      setStatus('preview');
    } catch (err: any) {
      toast({ title: 'Erro ao processar XML', description: err.message, variant: 'destructive' });
      setStatus('error');
    }
  };

  // Analisa cada item: existe? criar ou atualizar?
  useEffect(() => {
    if (status !== 'preview' || !nfeData) return;
    let cancelled = false;
    (async () => {
      setAnalisando(true);
      const result: ItemAcao[] = [];
      for (const item of nfeData.itens) {
        if (item.qCom <= 0) {
          result.push({ acao: 'ignorar' });
          continue;
        }
        const { data: prod } = await (supabase as any)
          .from('produtos')
          .select('id, estoque_total')
          .eq('codigo', item.cProd)
          .maybeSingle();
        if (prod) {
          const delta = nfeData.tipo === 'entrada' ? item.qCom : -item.qCom;
          const novo = Math.max(0, ((prod as any).estoque_total ?? 0) + delta);
          result.push({
            acao: 'atualizar',
            produtoId: (prod as any).id,
            estoqueAtual: (prod as any).estoque_total ?? 0,
            estoqueNovo: novo,
          });
        } else if (nfeData.tipo === 'entrada') {
          result.push({ acao: 'criar', estoqueNovo: item.qCom });
        } else {
          result.push({ acao: 'ignorar' });
        }
      }
      if (!cancelled) {
        setAcoes(result);
        setAnalisando(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status, nfeData]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!nfeData) return;
    setStatus('importing');

    try {
      // 1. Verificar duplicata
      const { data: existing } = await (supabase as any)
        .from('nfe_importadas')
        .select('id')
        .eq('chave_acesso', nfeData.chaveAcesso)
        .maybeSingle();

      if (existing) {
        setStatus('duplicate');
        return;
      }

      // 2. Processar itens — criar/atualizar produtos e lotes
      let processados = 0;
      for (const item of nfeData.itens) {
        if (item.qCom <= 0) continue;

        // Verificar se produto existe pelo código
        const { data: prodExistente } = await (supabase as any)
          .from('produtos')
          .select('id, estoque_total')
          .eq('codigo', item.cProd)
          .maybeSingle();

        let produtoId: string;

          if (prodExistente) {
          produtoId = (prodExistente as any).id;
          const delta = nfeData.tipo === 'entrada' ? item.qCom : -item.qCom;
          const novoEstoque = Math.max(0, ((prodExistente as any).estoque_total ?? 0) + delta);
          await (supabase as any)
            .from('produtos')
            .update({
              estoque_total: novoEstoque,
              icms_percentual: item.pICMS,
              ipi_percentual: item.pIPI,
              pis_percentual: item.pPIS,
              cofins_percentual: item.pCOFINS,
              updated_at: new Date().toISOString(),
            })
            .eq('id', produtoId);
        } else if (nfeData.tipo === 'entrada') {
          // Criar produto novo somente em entrada
          const { data: novoProd } = await (supabase as any)
            .from('produtos')
            .insert({
              codigo: item.cProd,
              nome: item.xProd,
              ncm: item.ncm,
              marca: nfeData.emitenteNome,
              estoque_total: item.qCom,
              preco_venda: item.vUnCom * 1.5,
              icms_percentual: item.pICMS,
              ipi_percentual: item.pIPI,
              pis_percentual: item.pPIS,
              cofins_percentual: item.pCOFINS,
            })
            .select('id')
            .single();
          produtoId = (novoProd as any).id;
        } else {
          continue; // saída de produto não cadastrado, pular
        }

        // Criar lote para entradas
        if (nfeData.tipo === 'entrada') {
          await (supabase as any).from('lotes').insert({
            produto_id: produtoId,
            fornecedor: nfeData.emitenteNome,
            preco_custo: item.vUnCom,
            quantidade: item.qCom,
            data_entrada: nfeData.dataEmissao,
            nfe_chave: nfeData.chaveAcesso,
          });
        }

        processados++;
      }

      // 3. Registrar NF-e
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from('nfe_importadas').insert({
        chave_acesso: nfeData.chaveAcesso,
        numero: nfeData.numero,
        serie: nfeData.serie,
        emitente_cnpj: nfeData.emitenteCnpj,
        emitente_nome: nfeData.emitenteNome,
        destinatario_cnpj: nfeData.destinatarioCnpj || null,
        data_emissao: nfeData.dataEmissao,
        valor_total: nfeData.valorTotal,
        tipo: nfeData.tipo,
        status: 'processada',
        xml_raw: xmlText,
        imported_by: user?.id,
      });

      setImportedCount(processados);
      setStatus('done');
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' });
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setNfeData(null);
    setXmlText('');
    setAcoes([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar NF-e</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Faça upload do XML da nota fiscal para atualizar o estoque automaticamente</p>
      </div>

      {/* Upload area */}
      {(status === 'idle' || status === 'parsing') && (
        <div
          className={cn(
            'rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {status === 'parsing' ? (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-4" />
          ) : (
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          )}
          <p className="font-semibold text-foreground mb-1">
            {status === 'parsing' ? 'Processando XML…' : 'Arraste o arquivo XML ou clique para selecionar'}
          </p>
          <p className="text-sm text-muted-foreground">Suporta NF-e padrão SEFAZ (.xml)</p>
        </div>
      )}

      {/* Preview */}
      {status === 'preview' && nfeData && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-primary" />
              <h2 className="font-semibold">Dados da NF-e</h2>
              <span className={cn('ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full', nfeData.tipo === 'entrada' ? 'badge-green' : 'badge-orange')}>
                {nfeData.tipo === 'entrada' ? '↓ Entrada' : '↑ Saída'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Número', value: `${nfeData.numero}-${nfeData.serie}` },
                { label: 'Data Emissão', value: new Date(nfeData.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR') },
                { label: 'Valor Total', value: nfeData.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
                { label: 'Emitente', value: nfeData.emitenteNome },
                { label: 'CNPJ Emitente', value: nfeData.emitenteCnpj },
                { label: 'Itens', value: `${nfeData.itens.length} produto(s)` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="font-medium truncate">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground font-mono break-all">{nfeData.chaveAcesso}</p>
            </div>
          </div>

          {/* Itens */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <h3 className="font-semibold text-sm">Produtos da Nota</h3>
              {analisando && <Loader2 size={14} className="animate-spin text-muted-foreground ml-auto" />}
              {!analisando && acoes.length > 0 && (
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <PlusCircle size={12} /> {acoes.filter(a => a.acao === 'criar').length} novos
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <ArrowUpCircle size={12} /> {acoes.filter(a => a.acao === 'atualizar').length} atualizar
                  </span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                 <tr>
                     <th>Código</th>
                     <th>Descrição</th>
                     <th>Qtd</th>
                     <th>Vl. Unit.</th>
                     <th>Total</th>
                     <th>Ação no estoque</th>
                   </tr>
                 </thead>
                 <tbody>
                   {nfeData.itens.map((item, i) => {
                     const a = acoes[i];
                     return (
                     <tr key={i}>
                       <td className="font-mono text-xs text-primary font-medium">{item.cProd}</td>
                       <td className="font-medium max-w-[200px] truncate">{item.xProd}</td>
                       <td className="font-semibold">{item.qCom}</td>
                       <td>{item.vUnCom.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                       <td className="font-semibold">{(item.qCom * item.vUnCom).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                       <td>
                         {!a ? (
                           <span className="text-xs text-muted-foreground">…</span>
                         ) : a.acao === 'criar' ? (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-700">
                             <PlusCircle size={11} /> Criar (estoque: {a.estoqueNovo})
                           </span>
                         ) : a.acao === 'atualizar' ? (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-700">
                             <ArrowUpCircle size={11} /> {a.estoqueAtual} → {a.estoqueNovo}
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground">
                             Ignorar
                           </span>
                         )}
                       </td>
                     </tr>
                     );
                   })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={analisando}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: 'hsl(var(--primary))' }}
            >
              {analisando ? 'Analisando itens…' : 'Confirmar importação e atualizar estoque'}
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {status === 'importing' && (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="font-semibold text-lg">Importando NF-e…</p>
          <p className="text-sm text-muted-foreground mt-1">Atualizando estoque e registrando lotes FIFO</p>
        </div>
      )}

      {/* Done */}
      {status === 'done' && (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 mb-4" style={{ color: 'hsl(var(--success))' }} />
          <p className="font-bold text-xl mb-1">Importação concluída!</p>
          <p className="text-sm text-muted-foreground">{importedCount} produto(s) atualizado(s) no estoque com lote FIFO registrado.</p>
          <button onClick={reset} className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'hsl(var(--primary))' }}>
            Importar outra NF-e
          </button>
        </div>
      )}

      {/* Duplicate */}
      {status === 'duplicate' && (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" style={{ color: 'hsl(var(--warning))' }} />
          <p className="font-bold text-xl mb-1">NF-e já importada!</p>
          <p className="text-sm text-muted-foreground">Esta chave de acesso já foi processada anteriormente.</p>
          <button onClick={reset} className="mt-6 px-6 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Tentar outro arquivo
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <XCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
          <p className="font-bold text-xl mb-1">Erro na importação</p>
          <p className="text-sm text-muted-foreground">Verifique se o arquivo é uma NF-e válida no padrão SEFAZ.</p>
          <button onClick={reset} className="mt-6 px-6 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
