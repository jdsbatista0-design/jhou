import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, imageBase64, audioBase64 } = await req.json();

    // Current date for temporal references (e.g. "amanhã", "próxima semana")
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const dayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const dayOfWeek = dayNames[now.getUTCDay()];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente que interpreta conteúdo recebido (texto, imagem ou áudio transcrito) e sugere como organizar no sistema de gestão pessoal.

IMPORTANTE: A data de HOJE é ${todayStr} (${dayOfWeek}). Use essa referência para interpretar expressões temporais como "amanhã", "próxima semana", "segunda que vem", etc.
Responda SEMPRE em JSON válido com esta estrutura:
{
  "summary": "resumo curto do conteúdo",
  "suggestions": [
    {
      "title": "título do item sugerido",
      "tipo": "um de: Inbox, Ação, Nota",
      "fase": "um de: Inbox, Em andamento, Aguardando, Travado, Concluído",
      "area": "área sugerida (ex: Pessoal, Izi, Mídia, Incorporação, Stone, Casa, Filhas, BJ7Mídia)",
      "priority": "baixa, media, alta ou urgente (opcional)",
      "person": "pessoa mencionada se houver (opcional)",
      "deadline": "data no formato YYYY-MM-DD se houver (opcional)",
      "deadlineTime": "hora no formato HH:mm se houver (opcional)",
      "tags": ["tags sugeridas"],
      "description": "descrição ou contexto adicional"
    }
  ]
}

Regras:
- Extraia TODOS os itens possíveis do conteúdo
- Se mencionar reunião/compromisso com data, inclua deadline e deadlineTime
- Se mencionar pessoa, preencha person
- Sugira apenas tags destes grupos: Contexto (estratégico, operacional, pessoal, delegado) e Status (urgente, importante, aguardando retorno)
- Se for só informação/referência sem ação, coloque tipo "Nota" e fase "Inbox"
- Responda SOMENTE o JSON, sem explicações`;

    const userContent: any[] = [];

    if (type === "image" && imageBase64) {
      userContent.push({
        type: "text",
        text: content
          ? `Analise esta imagem com o contexto: "${content}". Extraia todos os itens de ação, compromissos, informações relevantes.`
          : "Analise esta imagem. Extraia todos os itens de ação, compromissos, informações relevantes que possam ser organizados no sistema.",
      });
      userContent.push({
        type: "image_url",
        image_url: { url: imageBase64 },
      });
    } else if (type === "audio" && audioBase64) {
      // First transcribe audio using AI vision model
      const transcribeResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Transcreva este áudio em português. Retorne APENAS a transcrição, sem comentários.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: audioBase64 },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!transcribeResponse.ok) {
        const errText = await transcribeResponse.text();
        console.error("Transcription error:", transcribeResponse.status, errText);
        // Fall back to using content as-is
        userContent.push({
          type: "text",
          text: `Interprete este conteúdo de áudio: "${content || 'áudio sem transcrição disponível'}". Sugira itens de ação.`,
        });
      } else {
        const transcribeData = await transcribeResponse.json();
        const transcription =
          transcribeData.choices?.[0]?.message?.content || content || "";

        userContent.push({
          type: "text",
          text: `Este é um áudio transcrito: "${transcription}"\n\nExtraia todos os itens de ação, compromissos e informações relevantes.`,
        });
      }
    } else {
      userContent.push({
        type: "text",
        text: `Interprete este texto: "${content}". Extraia todos os itens de ação, compromissos e informações relevantes.`,
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione fundos nas configurações." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let aiContent = data.choices?.[0]?.message?.content || "";

    // Clean markdown code blocks if present
    aiContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      parsed = {
        summary: aiContent.slice(0, 200),
        suggestions: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interpret-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
