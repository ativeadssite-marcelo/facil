import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Users, ShieldCheck, UserCheck, Loader2, Search, Plus, X, Package, DollarSign, KeyRound, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppRole = 'admin' | 'vendedor' | 'caixa' | 'estoque';

const ROLE_CONFIG: Record<AppRole, { label: string; cls: string; icon: any; desc: string }> = {
  admin: { label: 'Administrador', cls: 'bg-primary/15 text-primary', icon: ShieldCheck, desc: 'Acesso total ao sistema' },
  vendedor: { label: 'Vendedor', cls: 'bg-blue-500/15 text-blue-600', icon: UserCheck, desc: 'Vendas, orçamentos e clientes' },
  caixa: { label: 'Caixa', cls: 'bg-emerald-500/15 text-emerald-600', icon: DollarSign, desc: 'Orçamentos, vendas e pagamentos' },
  estoque: { label: 'Estoque', cls: 'bg-amber-500/15 text-amber-600', icon: Package, desc: 'Produtos, lotes e NF-e' },
};

interface UsuarioRow {
  id: string;
  nome: string;
  role: AppRole | null;
  created_at: string;
}

export default function GestaoUsuarios() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', role: 'vendedor' as AppRole });
  const [pwdModal, setPwdModal] = useState<{ id: string; nome: string } | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data: profiles, error } = await (supabase as any)
      .from('profiles')
      .select('id, nome, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar usuários', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: roles } = await (supabase as any)
      .from('user_roles')
      .select('user_id, role');

    const roleMap: Record<string, AppRole> = {};
    (roles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const rows: UsuarioRow[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      role: roleMap[p.id] ?? null,
      created_at: p.created_at,
    }));

    setUsuarios(rows);
    setLoading(false);
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const setRole = async (userId: string, newRole: AppRole) => {
    setUpdatingId(userId);
    await (supabase as any).from('user_roles').delete().eq('user_id', userId);
    const { error } = await (supabase as any).from('user_roles').insert({ user_id: userId, role: newRole });
    if (error) {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil atualizado!', description: `Usuário definido como ${ROLE_CONFIG[newRole].label}.` });
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setUpdatingId(null);
  };

  const handleCreateUser = async () => {
    if (!newUser.nome || !newUser.email || !newUser.password) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: newUser,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || 'Erro ao criar usuário');
      }

      toast({ title: 'Usuário criado com sucesso!', description: `${newUser.nome} adicionado como ${ROLE_CONFIG[newUser.role].label}.` });
      setShowModal(false);
      setNewUser({ nome: '', email: '', password: '', role: 'vendedor' });
      fetchUsuarios();
    } catch (e: any) {
      toast({ title: 'Erro ao criar usuário', description: e.message, variant: 'destructive' });
    }
    setCreating(false);
  };

  const callFn = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('create-user', {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error || res.data?.error) {
      throw new Error(res.data?.error || res.error?.message || 'Erro');
    }
    return res.data;
  };

  const handleUpdatePassword = async () => {
    if (!pwdModal) return;
    if (newPwd.length < 8 || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      toast({ title: 'Senha fraca', description: 'Mínimo 8 caracteres, 1 maiúscula e 1 número.', variant: 'destructive' });
      return;
    }
    setSavingPwd(true);
    try {
      await callFn({ action: 'update_password', user_id: pwdModal.id, password: newPwd });
      toast({ title: 'Senha atualizada!', description: `Nova senha definida para ${pwdModal.nome}.` });
      setPwdModal(null);
      setNewPwd('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setSavingPwd(false);
  };

  const handleResetPassword = async (userId: string, nome: string) => {
    setResettingId(userId);
    try {
      const data = await callFn({ action: 'reset_password', user_id: userId });
      const email = data?.email;
      if (!email) throw new Error('E-mail do usuário não encontrado');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'E-mail enviado!', description: `Link de redefinição enviado para ${email}.` });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setResettingId(null);
  };

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <ShieldCheck size={48} className="opacity-30" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Apenas administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  const filtered = usuarios.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie perfis de acesso e crie novos usuários.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 self-start sm:self-auto bg-primary"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['admin', 'vendedor', 'caixa', 'estoque'] as AppRole[]).map(r => {
          const cfg = ROLE_CONFIG[r];
          const Icon = cfg.icon;
          const count = usuarios.filter(u => u.role === r).length;
          return (
            <div key={r} className="rounded-xl border bg-card p-4 flex items-center gap-3">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.cls)}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Users size={36} className="opacity-30" />
            <p className="text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cadastro</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Perfil atual</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Alterar perfil</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const cfg = u.role ? ROLE_CONFIG[u.role] : null;
                return (
                  <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-foreground">
                            {u.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{u.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold', cfg?.cls ?? 'bg-muted text-muted-foreground')}>
                        {cfg?.label ?? 'Sem perfil'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {updatingId === u.id ? (
                        <Loader2 size={16} className="animate-spin inline text-primary" />
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {(['admin', 'vendedor', 'caixa', 'estoque'] as AppRole[]).map(r => (
                            <button
                              key={r}
                              onClick={() => setRole(u.id, r)}
                              disabled={u.role === r}
                              className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
                                u.role === r ? 'opacity-30' : 'hover:bg-muted'
                              )}
                            >
                              {ROLE_CONFIG[r].label}
                            </button>
                          ))}
                          <button
                            onClick={() => { setPwdModal({ id: u.id, nome: u.nome }); setNewPwd(''); }}
                            className="px-2.5 py-1 rounded-md text-xs font-medium border hover:bg-muted flex items-center gap-1"
                            title="Definir nova senha"
                          >
                            <KeyRound size={12} /> Senha
                          </button>
                          <button
                            onClick={() => handleResetPassword(u.id, u.nome)}
                            disabled={resettingId === u.id}
                            className="px-2.5 py-1 rounded-md text-xs font-medium border hover:bg-muted flex items-center gap-1 disabled:opacity-50"
                            title="Enviar link de redefinição por e-mail"
                          >
                            {resettingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Resetar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Update Password Modal */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPwdModal(null)} />
          <div className="relative bg-background rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">Atualizar senha</h2>
              <button onClick={() => setPwdModal(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Defina uma nova senha para <strong>{pwdModal.nome}</strong>.
              </p>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nova senha</label>
                <input
                  type="text"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Mín. 8 caracteres, 1 maiúscula e 1 número"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setPwdModal(null)} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={handleUpdatePassword}
                disabled={savingPwd}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 disabled:opacity-50"
              >
                {savingPwd ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Salvando...</span> : 'Salvar senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-background rounded-2xl shadow-lg w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">Novo Usuário</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Nome completo', key: 'nome', type: 'text', placeholder: 'Ex: João da Silva' },
                { label: 'E-mail', key: 'email', type: 'email', placeholder: 'joao@empresa.com' },
                { label: 'Senha', key: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={(newUser as any)[key]}
                    onChange={e => setNewUser(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Perfil de Acesso</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['vendedor', 'caixa', 'estoque', 'admin'] as AppRole[]).map(r => {
                    const cfg = ROLE_CONFIG[r];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewUser(prev => ({ ...prev, role: r }))}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all',
                          newUser.role === r
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                            : 'hover:border-primary/40'
                        )}
                      >
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.cls)}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{cfg.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{cfg.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 bg-primary"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Criando...</span>
                ) : (
                  'Criar Usuário'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
