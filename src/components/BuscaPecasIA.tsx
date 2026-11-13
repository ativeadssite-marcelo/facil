import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, Plus, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogProduct } from '../../supabase/functions/_shared/catalog-matching';

interface Result {
  resumo: string; perguntas: string[]; analisadas: number; total_catalogo: number;
  pecas: { produto: CatalogProduct; motivo: string; evidencia: string; verificacao: string }[];
}
const money = (value: number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export default function BuscaPecasIA({ onAdd }: { onAdd: (product: CatalogProduct) => void }) {
  const [open, setOpen] = useState(false);
  const [veiculo, setVeiculo] = useState('');
  const [ano, setAno] = useState('');
  const [necessidade, setNecessidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const changeOpen = (value: boolean) => {
    if (!value) { controller.current?.abort(); setLoading(false); }
    setOpen(value);
  };
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true); setError(''); setResult(null); setAdded([]);
    try {
      const { data, error: requestError } = await supabase.functions.invoke<Result>('catalogo-ia', {
        body: { veiculo: veiculo.trim(), ano: Number(ano), necessidade: necessidade.trim() }, signal: abort.signal,
      });
      if (requestError) {
        const context = 'context' in requestError ? requestError.context : null;
        if (context instanceof Response) {
          const body = await context.json().catch(() => null);
          throw new Error(body?.error || requestError.message);
        }
        throw requestError;
      }
      if (!data) throw new Error('A busca não retornou resultados.');
      if (!abort.signal.aborted) setResult(data);
    } catch (err) {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Não foi possível buscar peças.');
    } finally {
      if (controller.current === abort) setLoading(false);
    }
  };
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Sparkles /> Buscar com IA</Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Peças por veículo · Lovable AI</DialogTitle>
          <DialogDescription className="sr-only">Busca de peças no catálogo por veículo, ano e necessidade do cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={search} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
            <div className="space-y-2"><Label htmlFor="ia-veiculo">Veículo / modelo / motor</Label><Input id="ia-veiculo" value={veiculo} onChange={e => { setVeiculo(e.target.value); setResult(null); }} placeholder="Volkswagen Gol 1.6" required minLength={2} maxLength={150} disabled={loading} /></div>
            <div className="space-y-2"><Label htmlFor="ia-ano">Ano</Label><Input id="ia-ano" type="number" value={ano} onChange={e => { setAno(e.target.value); setResult(null); }} placeholder="2018" required min={1900} max={new Date().getFullYear() + 1} disabled={loading} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="ia-necessidade">Necessidade do cliente</Label><Textarea id="ia-necessidade" value={necessidade} onChange={e => { setNecessidade(e.target.value); setResult(null); }} placeholder="Troca de óleo: preciso do filtro compatível" required minLength={3} maxLength={1000} disabled={loading} /></div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Sparkles />}{loading ? 'Consultando catálogo…' : 'Encontrar peças'}</Button>
            {loading && <Button type="button" variant="outline" onClick={() => { controller.current?.abort(); setLoading(false); }}><Square /> Parar</Button>}
          </div>
        </form>
        {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
        {result && <div aria-live="polite" className="space-y-3 border-t pt-4">
          <p className="text-sm break-words">{result.resumo}</p>
          <p className="text-xs text-muted-foreground">{result.analisadas} peças analisadas · {result.total_catalogo} no catálogo</p>
          {result.perguntas.length > 0 && <div className="text-sm space-y-1"><h3 className="font-semibold">Dados a confirmar</h3>{result.perguntas.map((q, i) => <p key={i} className="break-words">• {q}</p>)}</div>}
          {!result.pecas.length && <p className="text-sm text-muted-foreground">Nenhuma peça com compatibilidade suficiente no catálogo.</p>}
          {result.pecas.map(({ produto, motivo, evidencia, verificacao }) => <article key={produto.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-sm break-words">{produto.nome}</h3><p className="text-xs text-muted-foreground break-words">{produto.codigo_interno} · {produto.codigo_fabrica} · {produto.marca}</p></div><span className="text-sm font-semibold text-primary shrink-0">{money(produto.preco_venda)}</span></div>
            <p className="text-sm break-words">{motivo}</p>
            <p className="text-xs text-muted-foreground break-words">Aplicação: {evidencia}</p>
            {verificacao && <p className="text-xs break-words">Conferir: {verificacao}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{produto.estoque_total} em estoque{produto.estoque_total <= 0 ? ' · Sem estoque' : ''}</span><Button type="button" size="sm" variant="outline" disabled={added.includes(produto.id)} onClick={() => { onAdd(produto); setAdded(prev => [...prev, produto.id]); }}><Plus />{added.includes(produto.id) ? 'Adicionada' : 'Adicionar ao orçamento'}</Button></div>
          </article>)}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}