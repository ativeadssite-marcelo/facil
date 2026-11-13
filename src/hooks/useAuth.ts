import { createContext, createElement, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface AuthUser {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'vendedor' | 'caixa' | 'estoque' | null;
  nome: string;
  loading: boolean;
}

type AppRole = 'admin' | 'vendedor' | 'caixa' | 'estoque';
type UserRoleRow = Pick<Database['public']['Tables']['user_roles']['Row'], 'role'>;

const ROLE_PRIORITY: AppRole[] = ['admin', 'vendedor', 'caixa', 'estoque'];

function pickRole(rows: UserRoleRow[] | null | undefined): AppRole {
  const roles = new Set((rows ?? []).map(row => row.role).filter(Boolean) as AppRole[]);
  return ROLE_PRIORITY.find(role => roles.has(role)) ?? 'vendedor';
}

const AuthContext = createContext<AuthUser | null>(null);

async function loadUserData(userId: string): Promise<{ role: AppRole; nome: string }> {
  const [roleRes, profileRes] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('profiles').select('nome').eq('id', userId).maybeSingle(),
  ]);

  if (roleRes.error) console.error('Erro ao carregar perfil do usuário:', roleRes.error.message);
  if (profileRes.error) console.error('Erro ao carregar nome do usuário:', profileRes.error.message);

  return {
    role: pickRole(roleRes.data),
    nome: profileRes.data?.nome ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'vendedor' | 'caixa' | 'estoque' | null>(null);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (nextSession: Session | null) => {
      const requestId = ++requestIdRef.current;
      const prevUserId = currentUserIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        currentUserIdRef.current = null;
        setRole(null);
        setNome('');
        setLoading(false);
        return;
      }

      if (prevUserId === nextUserId) {
        setLoading(false);
        return;
      }

      currentUserIdRef.current = nextUserId;
      setLoading(true);
      const userData = await loadUserData(nextSession.user.id);
      if (cancelled || requestId !== requestIdRef.current) return;
      setRole(userData.role);
      setNome(userData.nome);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        void applySession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'INITIAL_SESSION') return;
        setTimeout(() => {
          if (!cancelled) void applySession(nextSession);
        }, 0);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { user, session, role, nome, loading } },
    children
  );
}

export function useAuth(): AuthUser {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return auth;
}
