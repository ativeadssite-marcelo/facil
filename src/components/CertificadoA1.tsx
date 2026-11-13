import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ShieldCheck, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { validateA1Upload } from '../../supabase/functions/_shared/a1-validation';

export default function CertificadoA1() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const status = useQuery({
    queryKey: ['certificado-a1-status'], retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('certificado-a1', { body: { action: 'status' } });
      if (error) throw new Error('Não foi possível consultar o cadastro.');
      return data as { saved: boolean };
    },
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const invalid = validateA1Upload(file.name, file.size, password, cnpj);
    if (invalid) { setMessage(invalid); setFailed(true); return; }
    setBusy(true); setMessage('');
    try {
      const body = new FormData();
      body.append('certificado', file); body.append('senha', password); body.append('cnpj', cnpj);
      const { data, error } = await supabase.functions.invoke('certificado-a1', { body });
      if (error) {
        let text = 'Não foi possível salvar o certificado.';
        if (error instanceof FunctionsHttpError) {
          try { const result = await error.context.json(); if (typeof result.error === 'string') text = result.error; } catch { /* keep safe error */ }
        }
        throw new Error(text);
      }
      if (!data?.saved) throw new Error('Não foi possível confirmar o cadastro.');
      setPassword(''); setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setFailed(false); setMessage('Certificado salvo com segurança.');
      await status.refetch();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Falha no cadastro.'); }
    finally { setBusy(false); }
  };
  return (
    <section className="border-t pt-5 space-y-4" aria-labelledby="a1-title">
      <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-primary" /><h2 id="a1-title" className="font-semibold text-sm">Certificado Digital A1</h2></div>
      <p className="text-sm text-muted-foreground" role="status">{status.isPending ? 'Consultando cadastro…' : status.isError ? 'Cadastro não pôde ser consultado.' : status.data?.saved ? 'Certificado cadastrado pelo envio direto.' : 'Nenhum certificado cadastrado pelo envio direto.'}</p>
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="a1-file" className="block text-sm font-medium mb-1.5">Arquivo A1 (.pfx ou .p12)</label><input ref={fileInput} id="a1-file" type="file" accept=".pfx,.p12" required disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(''); }} className="block w-full min-w-0 text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-foreground" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="a1-cnpj" className="block text-sm font-medium mb-1.5">CNPJ titular</label><input id="a1-cnpj" value={cnpj} onChange={e => setCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))} inputMode="numeric" maxLength={14} required disabled={busy} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
          <div><label htmlFor="a1-password" className="block text-sm font-medium mb-1.5">Senha do certificado</label><input id="a1-password" type="password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        </div>
        <Button type="submit" disabled={busy || !file || !password || cnpj.length !== 14}>{busy ? <Loader2 className="animate-spin" /> : <Upload />}{busy ? 'Validando e salvando…' : status.data?.saved ? 'Substituir certificado' : 'Salvar certificado'}</Button>
        {message && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-destructive' : 'text-sm text-foreground'}>{message}</p>}
      </form>
    </section>
  );
}