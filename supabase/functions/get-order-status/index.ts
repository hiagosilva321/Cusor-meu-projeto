import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ORDER_STATUS_COLUMNS = [
  "id",
  "tamanho",
  "quantidade",
  "valor_total",
  "status",
  "payment_status",
  "referral_source",
  "pix_qr_code",
  "pix_copy_paste",
  "pix_expires_at",
  "paid_at",
].join(",");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, access_token } = await req.json();

    if (
      typeof order_id !== "string" ||
      !order_id.trim() ||
      typeof access_token !== "string" ||
      !access_token.trim()
    ) {
      return new Response(JSON.stringify({ error: "order_id e access_token são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase service role não configurada.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_STATUS_COLUMNS)
      .eq("id", order_id.trim())
      .eq("public_access_token", access_token.trim())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GET-ORDER-STATUS] Erro:", error);
    return new Response(JSON.stringify({ error: "Erro ao consultar pedido." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
