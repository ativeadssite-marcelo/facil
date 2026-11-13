import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface ProdutoRow {
  id: string;
  codigo: string | null;
  codigo_interno: string;
  codigo_fabrica: string;
  nome: string;
  marca: string;
  aplicacao: string;
  categoria: string;
  tipo_veiculo: string;
  ncm: string;
  preco_venda: number;
  estoque_total: number;
  estoque_minimo: number;
  updated_at: string;
}

const PUBLIC_FIELDS =
  'id, codigo, codigo_interno, codigo_fabrica, nome, marca, aplicacao, categoria, tipo_veiculo, ncm, preco_venda, estoque_total, estoque_minimo, updated_at';

const mapProduto = (p: ProdutoRow) => ({
  id: p.id,
  sku: p.codigo_interno || p.codigo,
  codigo_interno: p.codigo_interno,
  codigo_fabrica: p.codigo_fabrica,
  nome: p.nome,
  marca: p.marca,
  aplicacao: p.aplicacao,
  categoria: p.categoria,
  tipo_veiculo: p.tipo_veiculo,
  ncm: p.ncm,
  preco: Number(p.preco_venda),
  estoque: Number(p.estoque_total),
  estoque_minimo: Number(p.estoque_minimo),
  disponivel: Number(p.estoque_total) > 0,
  atualizado_em: p.updated_at,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const fnIndex = segments.indexOf('ecommerce-api');
    const route = segments.slice(fnIndex + 1);

    const apiKey =
      req.headers.get('x-api-key') ??
      (req.headers.get('authorization')?.match(/^Bearer\s+(pf_[A-Za-z0-9_-]+)$/)?.[1] ?? null);

    if (!apiKey) return json({ error: 'Missing API key. Send header x-api-key.' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const hash = await sha256(apiKey);
    const { data: keyRow, error: keyError } = await admin
      .from('api_keys')
      .select('id, escopos, ativo')
      .eq('key_hash', hash)
      .eq('ativo', true)
      .maybeSingle();

    if (keyError) {
      console.error('api_keys lookup failed:', keyError.message);
      return json({ error: 'Internal error' }, 500);
    }
    if (!keyRow) return json({ error: 'Invalid or revoked API key' }, 401);

    void admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id);

    const escopos: string[] = keyRow.escopos ?? [];
    const can = (scope: string) => escopos.includes(scope);

    // GET /ecommerce-api  -> descoberta
    if (route.length === 0) {
      return json({
        name: 'PeçaFácil E-commerce API',
        version: '1.0',
        endpoints: [
          'GET /produtos?search=&categoria=&marca=&somente_disponiveis=true&page=1&limit=50',
          'GET /produtos/{id_ou_sku}',
          'GET /estoque?skus=INT-00001,INT-00002',
          'GET /categorias',
        ],
        escopos,
      });
    }

    if (route[0] === 'produtos') {
      if (!can('produtos:read')) return json({ error: 'Scope produtos:read required' }, 403);

      // Detalhe
      if (route[1]) {
        const key = decodeURIComponent(route[1]);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
        const query = admin.from('produtos').select(PUBLIC_FIELDS);
        const { data, error } = isUuid
          ? await query.eq('id', key).maybeSingle()
          : await query.or(`codigo_interno.eq.${key},codigo_fabrica.eq.${key},codigo.eq.${key}`).maybeSingle();
        if (error) {
          console.error('produto detail failed:', error.message);
          return json({ error: 'Internal error' }, 500);
        }
        if (!data) return json({ error: 'Produto não encontrado' }, 404);
        return json({ data: mapProduto(data as ProdutoRow) });
      }

      // Listagem
      const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50') || 50));
      const from = (page - 1) * limit;
      const search = (url.searchParams.get('search') ?? '').trim().slice(0, 120);
      const categoria = (url.searchParams.get('categoria') ?? '').trim().slice(0, 60);
      const marca = (url.searchParams.get('marca') ?? '').trim().slice(0, 60);
      const somenteDisponiveis = url.searchParams.get('somente_disponiveis') === 'true';
      const atualizadoDesde = url.searchParams.get('atualizado_desde');

      let q = admin
        .from('produtos')
        .select(PUBLIC_FIELDS, { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(from, from + limit - 1);

      if (search) {
        const safe = search.replace(/[,()%]/g, ' ').trim();
        if (safe) {
          q = q.or(
            ['nome', 'marca', 'aplicacao', 'categoria', 'codigo_interno', 'codigo_fabrica']
              .map((c) => `${c}.ilike.%${safe}%`)
              .join(','),
          );
        }
      }
      if (categoria) q = q.eq('categoria', categoria);
      if (marca) q = q.ilike('marca', marca);
      if (somenteDisponiveis) q = q.gt('estoque_total', 0);
      if (atualizadoDesde && !Number.isNaN(Date.parse(atualizadoDesde))) {
        q = q.gte('updated_at', new Date(atualizadoDesde).toISOString());
      }

      const { data, error, count } = await q;
      if (error) {
        console.error('produtos list failed:', error.message);
        return json({ error: 'Internal error' }, 500);
      }

      return json({
        data: (data ?? []).map((p) => mapProduto(p as ProdutoRow)),
        pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
      });
    }

    if (route[0] === 'estoque') {
      if (!can('estoque:read')) return json({ error: 'Scope estoque:read required' }, 403);
      const skusParam = (url.searchParams.get('skus') ?? '').trim();
      let q = admin.from('produtos').select('id, codigo_interno, codigo_fabrica, estoque_total, updated_at');
      if (skusParam) {
        const skus = skusParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
        if (skus.length) q = q.in('codigo_interno', skus);
      } else {
        q = q.limit(1000);
      }
      const { data, error } = await q;
      if (error) {
        console.error('estoque failed:', error.message);
        return json({ error: 'Internal error' }, 500);
      }
      return json({
        data: (data ?? []).map((p) => ({
          id: p.id,
          sku: p.codigo_interno,
          codigo_fabrica: p.codigo_fabrica,
          estoque: Number(p.estoque_total),
          disponivel: Number(p.estoque_total) > 0,
          atualizado_em: p.updated_at,
        })),
      });
    }

    if (route[0] === 'categorias') {
      if (!can('produtos:read')) return json({ error: 'Scope produtos:read required' }, 403);
      const { data, error } = await admin.from('produtos').select('categoria').limit(2000);
      if (error) {
        console.error('categorias failed:', error.message);
        return json({ error: 'Internal error' }, 500);
      }
      const categorias = [...new Set((data ?? []).map((r) => r.categoria).filter(Boolean))].sort();
      return json({ data: categorias });
    }

    return json({ error: 'Endpoint não encontrado' }, 404);
  } catch (err) {
    console.error('ecommerce-api error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});