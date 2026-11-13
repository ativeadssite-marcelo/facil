import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import forge from 'npm:node-forge@1.3.3';
import { canManageA1, MAX_A1_BYTES, validateA1Upload } from '../_shared/a1-validation.ts';

const reply = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const bucket = 'certificados-a1';
const path = 'empresa/a1.enc';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryption = Deno.env.get('A1_STORAGE_ENCRYPTION_KEY');
    if (!url || !service || !encryption) return reply({ error: 'Cadastro seguro indisponível.' }, 503);
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Faça login novamente.' }, 401);
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return reply({ error: 'Faça login novamente.' }, 401);
    const { data: roles, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', auth.user.id);
    if (roleError || !canManageA1((roles ?? []).map(r => r.role))) return reply({ error: 'Apenas administradores podem cadastrar o A1.' }, 403);
    if (req.headers.get('Content-Type')?.includes('application/json')) {
      const body = await req.json();
      if (body.action !== 'status') return reply({ error: 'Solicitação inválida.' }, 400);
      const { data, error } = await admin.storage.from(bucket).list('empresa', { search: 'a1.enc', limit: 1 });
      if (error) return reply({ error: 'Não foi possível consultar o cadastro.' }, 503);
      return reply({ saved: data?.some(file => file.name === 'a1.enc') ?? false });
    }
    const length = Number(req.headers.get('Content-Length'));
    if (length > MAX_A1_BYTES + 16384) return reply({ error: 'Arquivo muito grande.' }, 413);
    // Limit streaming requests too, before parsing multipart.
    if (!req.body) return reply({ error: 'Envie o certificado.' }, 400);
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_A1_BYTES + 16384) { await reader.cancel(); return reply({ error: 'Arquivo muito grande.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const form = await new Response(bytes, { headers: { 'Content-Type': req.headers.get('Content-Type') ?? '' } }).formData();
    const file = form.get('certificado');
    const password = form.get('senha');
    const cnpj = form.get('cnpj');
    if (!(file instanceof File) || typeof password !== 'string' || typeof cnpj !== 'string') return reply({ error: 'Preencha arquivo, senha e CNPJ.' }, 400);
    const validation = validateA1Upload(file.name, file.size, password, cnpj);
    if (validation) return reply({ error: validation }, 400);
    const binary = new Uint8Array(await file.arrayBuffer());
    let encoded = '';
    for (const byte of binary) encoded += String.fromCharCode(byte);
    try {
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(encoded), false, password);
      const keys = [...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []), ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [])];
      const certs = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
      const key = keys.find(b => b.key)?.key;
      const cert = certs.find(b => b.cert && key && b.cert.publicKey.n?.equals(key.n) && b.cert.publicKey.e?.equals(key.e))?.cert;
      if (!key || !cert) return reply({ error: 'O A1 deve conter certificado e chave privada correspondentes.' }, 400);
      const now = new Date();
      if (now < cert.validity.notBefore || now > cert.validity.notAfter) return reply({ error: 'O certificado está fora do período de validade.' }, 400);
    } catch {
      return reply({ error: 'Não foi possível abrir o A1. Confira o arquivo e sua senha.' }, 400);
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryption));
    const key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payload = new TextEncoder().encode(JSON.stringify({ pfx: forge.util.encode64(encoded), password, cnpj }));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('pecafacil:a1:v1') }, key, payload));
    const encrypted = new Uint8Array(1 + iv.length + cipher.length);
    encrypted[0] = 1; encrypted.set(iv, 1); encrypted.set(cipher, 13);
    const { error: saveError } = await admin.storage.from(bucket).upload(path, encrypted, { upsert: true, contentType: 'application/octet-stream' });
    if (saveError) return reply({ error: 'Não foi possível salvar o certificado. Tente novamente.' }, 503);
    return reply({ saved: true });
  } catch {
    return reply({ error: 'Não foi possível processar o cadastro do A1.' }, 400);
  }
});