import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing Supabase env vars");

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { text, categories } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 40) {
      return json({ error: "Não foi possível ler texto desse PDF." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().split("T")[0];
    const catList: string[] = Array.isArray(categories) ? categories.slice(0, 40) : [];

    const systemPrompt = `Você extrai dados de faturas de cartão de crédito e extratos bancários brasileiros.
Hoje é ${today}.

Regras:
- Valores em número (ponto decimal), sempre positivos.
- Datas em YYYY-MM-DD. Se a linha só tiver dia/mês, use o ano da fatura.
- IGNORE: pagamentos da fatura anterior, créditos, estornos, reversões, saldo anterior, encargos já somados em "total", linhas de resumo.
- Parcelas: quando a descrição indicar "03/10", "PARC 3/10", "3 de 10", preencha installmentNo e installmentTotal.
- Categoria: escolha uma da lista fornecida quando fizer sentido, senão null.
- Não invente lançamentos: extraia apenas o que está no texto.

Responda SOMENTE com JSON válido:
{
  "bank": "nome do banco ou emissor",
  "cardLast4": "1234 ou null",
  "dueDate": "YYYY-MM-DD ou null",
  "closingDate": "YYYY-MM-DD ou null",
  "totalAmount": 0,
  "purchases": [
    { "description": "...", "amount": 0, "date": "YYYY-MM-DD", "installmentNo": null, "installmentTotal": null, "category": null }
  ]
}

Categorias disponíveis: ${catList.length ? catList.join(", ") : "(nenhuma)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 120000) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return json({ error: "Limite de uso da IA atingido. Tente em alguns minutos." }, 429);
    if (res.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
    if (!res.ok) {
      const detail = await res.text();
      console.error("AI gateway error", res.status, detail);
      return json({ error: "Falha ao interpretar a fatura." }, 502);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const purchases = Array.isArray(parsed.purchases) ? parsed.purchases : [];
    const clean = purchases
      .map((p: any) => ({
        description: String(p.description ?? "").trim().slice(0, 160),
        amount: Math.abs(Number(p.amount) || 0),
        date: typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : null,
        installmentNo: Number(p.installmentNo) > 0 ? Math.floor(Number(p.installmentNo)) : null,
        installmentTotal: Number(p.installmentTotal) > 1 ? Math.floor(Number(p.installmentTotal)) : null,
        category: typeof p.category === "string" && p.category.trim() ? p.category.trim() : null,
      }))
      .filter((p: any) => p.description && p.amount > 0);

    return json({
      bank: typeof parsed.bank === "string" ? parsed.bank : null,
      cardLast4: typeof parsed.cardLast4 === "string" ? parsed.cardLast4.replace(/\D/g, "").slice(-4) || null : null,
      dueDate: typeof parsed.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) ? parsed.dueDate : null,
      closingDate: typeof parsed.closingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.closingDate) ? parsed.closingDate : null,
      totalAmount: Math.abs(Number(parsed.totalAmount) || 0),
      purchases: clean,
    });
  } catch (e) {
    console.error("parse-invoice error", e);
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});
