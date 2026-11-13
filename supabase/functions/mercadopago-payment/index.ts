import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_ROLES = ['admin', 'caixa', 'vendedor'];
const MAX_AMOUNT = 1_000_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError('Unauthorized', 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return jsonError('Unauthorized', 401);

    // Role check
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!roleRow || !ALLOWED_ROLES.includes(roleRow.role)) {
      return jsonError('Forbidden', 403);
    }

    const ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const body = await req.json();
    const { action, amount, description, installments, payer_email } = body;

    // --- Input validation ---
    if (!['pix', 'installments', 'card_payment'].includes(action)) {
      return jsonError('Invalid action. Use: pix, installments, or card_payment', 400);
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > MAX_AMOUNT) {
      return jsonError('Invalid amount', 400);
    }
    if (payer_email && !EMAIL_RE.test(String(payer_email))) {
      return jsonError('Invalid payer_email', 400);
    }
    const inst = installments == null ? 1 : Number(installments);
    if (!Number.isInteger(inst) || inst < 1 || inst > 12) {
      return jsonError('Invalid installments', 400);
    }
    const desc = typeof description === 'string' ? description.slice(0, 200) : '';

    if (action === 'pix') {
      // Create Pix payment with QR code
      const payment = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          transaction_amount: amt,
          description: desc || 'Pagamento via Pix',
          payment_method_id: 'pix',
          payer: {
            email: payer_email || 'cliente@email.com',
          },
        }),
      });

      const paymentData = await payment.json();
      if (!payment.ok) {
        console.error('MercadoPago Pix error:', JSON.stringify(paymentData));
        throw new Error(`MercadoPago error [${payment.status}]: ${JSON.stringify(paymentData)}`);
      }

      const qrCode = paymentData.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = paymentData.point_of_interaction?.transaction_data?.ticket_url;

      return new Response(JSON.stringify({
        success: true,
        payment_id: paymentData.id,
        status: paymentData.status,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'installments') {
      // Calculate installments for credit card
      const installmentsList = [];
      for (let i = 1; i <= 10; i++) {
        // Simple calculation: no interest up to 3x, interest after
        let totalAmount = amt;
        let rate = 0;
        if (i > 3) {
          rate = 0.0199 * i; // ~1.99% per installment after 3x
          totalAmount = amt * (1 + rate);
        }
        const installmentAmount = totalAmount / i;
        installmentsList.push({
          installments: i,
          installment_amount: Math.round(installmentAmount * 100) / 100,
          total_amount: Math.round(totalAmount * 100) / 100,
          has_interest: i > 3,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        installments: installmentsList,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'card_payment') {
      // Create a preference for card payment with installments
      const preference = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            title: desc || 'Pagamento',
            quantity: 1,
            unit_price: amt,
          }],
          payment_methods: {
            installments: inst || 10,
            default_installments: inst || 1,
          },
          back_urls: {
            success: 'https://pecafacil-auto-manager.lovable.app',
            failure: 'https://pecafacil-auto-manager.lovable.app',
          },
          auto_return: 'approved',
        }),
      });

      const prefData = await preference.json();
      if (!preference.ok) {
        console.error('MercadoPago preference error:', JSON.stringify(prefData));
        throw new Error(`MercadoPago error [${preference.status}]: ${JSON.stringify(prefData)}`);
      }

      return new Response(JSON.stringify({
        success: true,
        preference_id: prefData.id,
        init_point: prefData.init_point,
        sandbox_init_point: prefData.sandbox_init_point,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use: pix, installments, or card_payment');

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
