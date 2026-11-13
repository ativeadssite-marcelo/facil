import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plug, KeyRound, Copy, Trash2, Loader2, Check, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/components/Layout';
import { toast } from '@/hooks/use-toast';

interface ApiKeyRow {
  id: string;
  nome: string;
  key_prefix: string;
  escopos: string[];
  ativo: boolean;
  last_used_at: string | null;
  created_at: string;
}

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecommerce-api`;

const ESCOPOS = [
  { id: 'produtos:read', label: 'Ler produtos e preços' },
  { id: 'estoque:read', label: 'Ler estoque' },
];

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function gerarChave() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 48);
  return `pf_${raw}`;
}

export default function ApiIntegracao() {
  const { userRole } = useAppContext();
  const isAdmin = userRole === 'admin';
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [escopos, setEscopos] = useState<string[]>(['produtos:read', 'estoque:read']);
  const [criando, setCriando] = useState(false);
  const [novaChave, setNovaChave] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api_keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, nome, key_prefix, escopos, ativo, last_used_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiKeyRow[];
    },
    enabled: isAdmin,
  });

  const exemplo = useMemo(
    () =>
      `curl "${API_BASE}/produtos?somente_disponiveis=true&limit=50" \\\n  -H "x-api-key: SUA_CHAVE"`,
    [],
  );

  const copiar = async (texto: string, id: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 1800);
    toast({ title: 'Copiado!' });
  };

  const criarChave = async () => {
    const label = nome.trim();
    if (label.length < 3) {
      toast({ title: 'Informe um nome com pelo menos 3 caracteres', variant: 'destructive' });
      return;
    }
    if (!escopos.length) {
      toast({ title: 'Selecione ao menos uma permissão', variant: 'destructive' });
      return;
    }
    setCriando(true);
    try {
      const chave = gerarChave();
      const hash = await sha256Hex(chave);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('api_keys').insert({
        nome: label.slice(0, 80),
        key_prefix: chave.slice(0, 11),
        key_hash: hash,
        escopos,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      setNovaChave(chave);
      setNome('');
      queryClient.invalidateQueries({ queryKey: ['api_keys'] });
    } catch (e) {
      toast({ title: 'Erro ao criar chave', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCriando(false);
    }
  };

  const alternarAtivo = async (row: ApiKeyRow) => {
    const { error } = await supabase.from('api_keys').update({ ativo: !row.ativo }).eq('id', row.id);
    if (error) toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    else queryClient.invalidateQueries({ queryKey: ['api_keys'] });
  };

  const excluir = async (row: ApiKeyRow) => {
    if (!window.confirm(`Excluir a chave "${row.nome}"? As integrações que a usam pararão de funcionar.`)) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', row.id);
    if (error) toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    else queryClient.invalidateQueries({ queryKey: ['api_keys'] });
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border bg-card shadow-sm py-16 text-center">
        <Plug size={40} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-semibold text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integração E-commerce (API)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Exponha catálogo, preços e estoque para sua loja virtual via API REST com chave de acesso.
        </p>
      </div>

      {/* Nova chave */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <KeyRound size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">Nova chave de API</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nome da integração</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={80}
                placeholder="Ex.: Minha loja virtual"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Permissões</label>
              <div className="flex flex-wrap gap-3 pt-1.5">
                {ESCOPOS.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={escopos.includes(s.id)}
                      onChange={(e) =>
                        setEscopos((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                      }
                      className="accent-primary"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={criarChave}
            disabled={criando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {criando ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            Gerar chave
          </button>

          {novaChave && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                Copie agora — esta chave não será exibida novamente
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-md bg-background px-3 py-2 text-xs font-mono">{novaChave}</code>
                <button
                  onClick={() => copiar(novaChave, 'nova')}
                  className="p-2 rounded-md border hover:bg-muted transition-colors"
                >
                  {copiado === 'nova' ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <button onClick={() => setNovaChave(null)} className="text-xs text-muted-foreground underline">
                Já copiei, ocultar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chaves existentes */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Plug size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">Chaves ativas</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !keys?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma chave criada ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Chave</th>
                  <th>Permissões</th>
                  <th>Último uso</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.nome}</td>
                    <td className="font-mono text-xs text-muted-foreground">{k.key_prefix}••••••••</td>
                    <td className="text-xs text-muted-foreground">{(k.escopos ?? []).join(', ')}</td>
                    <td className="text-xs text-muted-foreground">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : 'Nunca'}
                    </td>
                    <td>
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ' +
                          (k.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')
                        }
                      >
                        {k.ativo ? 'Ativa' : 'Revogada'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => alternarAtivo(k)}
                          title={k.ativo ? 'Revogar' : 'Reativar'}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => excluir(k)}
                          title="Excluir"
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documentação */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Como consumir</h2>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">URL base</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-xs font-mono">{API_BASE}</code>
              <button onClick={() => copiar(API_BASE, 'base')} className="p-2 rounded-md border hover:bg-muted">
                {copiado === 'base' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Autenticação</p>
            <p className="text-muted-foreground">
              Envie a chave no cabeçalho <code className="font-mono text-xs">x-api-key</code> (ou{' '}
              <code className="font-mono text-xs">Authorization: Bearer pf_...</code>).
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Endpoints</p>
            <ul className="space-y-1 text-muted-foreground">
              <li><code className="font-mono text-xs">GET /produtos</code> — catálogo paginado (<code className="font-mono text-xs">search, categoria, marca, somente_disponiveis, atualizado_desde, page, limit</code>)</li>
              <li><code className="font-mono text-xs">GET /produtos/{'{id ou SKU}'}</code> — detalhe do produto</li>
              <li><code className="font-mono text-xs">GET /estoque?skus=INT-00001,INT-00002</code> — estoque em tempo real</li>
              <li><code className="font-mono text-xs">GET /categorias</code> — lista de categorias</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Exemplo</p>
            <div className="flex items-start gap-2">
              <pre className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs font-mono whitespace-pre">{exemplo}</pre>
              <button onClick={() => copiar(exemplo, 'curl')} className="p-2 rounded-md border hover:bg-muted">
                {copiado === 'curl' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}