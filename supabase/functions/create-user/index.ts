import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = ["admin", "vendedor", "caixa", "estoque"];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Não autorizado");

    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Check if caller is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleData?.role !== "admin") throw new Error("Apenas administradores podem criar usuários");

    const body = await req.json();
    const action = body.action ?? "create";

    // ---- ACTION: update_password ----
    if (action === "update_password") {
      const { user_id, password } = body;
      if (!user_id) throw new Error("user_id obrigatório");
      if (!password || !isValidPassword(password)) {
        throw new Error("Senha deve ter no mínimo 8 caracteres, incluindo uma letra maiúscula e um número");
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // ---- ACTION: reset_password ----
    // Returns the user's email so the caller (admin) can trigger
    // resetPasswordForEmail from the frontend.
    if (action === "reset_password") {
      const { user_id } = body;
      if (!user_id) throw new Error("user_id obrigatório");
      const { data, error } = await adminClient.auth.admin.getUserById(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, email: data.user?.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // ---- ACTION: create (default) ----
    const { email, password, nome, role } = body;

    // Input validation
    if (!email || !isValidEmail(email)) {
      throw new Error("Email inválido");
    }

    if (!password || !isValidPassword(password)) {
      throw new Error("Senha deve ter no mínimo 8 caracteres, incluindo uma letra maiúscula e um número");
    }

    if (!nome || typeof nome !== "string" || nome.trim().length < 2 || nome.trim().length > 100) {
      throw new Error("Nome deve ter entre 2 e 100 caracteres");
    }

    if (!role || !VALID_ROLES.includes(role)) {
      throw new Error("Role inválido. Valores aceitos: " + VALID_ROLES.join(", "));
    }

    // Create user via admin API
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: nome.trim() },
    });

    if (createErr) throw createErr;

    // Assign role
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleErr) throw roleErr;

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
