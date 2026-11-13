
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seu próprio perfil" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuários atualizam seu próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuários criam seu próprio perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Admins veem todos os roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuário vê seu próprio role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Produtos table
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  marca TEXT NOT NULL DEFAULT '',
  aplicacao TEXT NOT NULL DEFAULT '',
  ncm TEXT NOT NULL DEFAULT '',
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  estoque_total INTEGER NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem produtos" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam produtos" ON public.produtos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Lotes table (FIFO)
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL DEFAULT '',
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 0,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  nfe_chave TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem lotes" ON public.lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam lotes" ON public.lotes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. NF-e importadas
CREATE TABLE public.nfe_importadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_acesso TEXT NOT NULL UNIQUE,
  numero TEXT NOT NULL,
  serie TEXT NOT NULL DEFAULT '',
  emitente_cnpj TEXT NOT NULL,
  emitente_nome TEXT NOT NULL DEFAULT '',
  destinatario_cnpj TEXT,
  data_emissao DATE NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'entrada',
  status TEXT NOT NULL DEFAULT 'processada',
  xml_raw TEXT,
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nfe_importadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem nfe" ON public.nfe_importadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins inserem nfe" ON public.nfe_importadas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Trigger para auto-criar profile ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Gestão de usuários: admins podem ver todos os perfis
CREATE POLICY "Admins veem todos os perfis" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Admins podem gerenciar roles
CREATE POLICY "Admins gerenciam roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
