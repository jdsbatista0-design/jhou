import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Twilio sends webhook data as application/x-www-form-urlencoded
    const contentType = req.headers.get("content-type") || "";
    let body: string;
    let from: string;
    let mediaUrl: string | null = null;
    let numMedia = 0;
    let messageType: "text" | "photo" | "audio" = "text";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = (formData.get("Body") as string) || "";
      from = (formData.get("From") as string) || "";
      numMedia = parseInt((formData.get("NumMedia") as string) || "0", 10);

      if (numMedia > 0) {
        mediaUrl = formData.get("MediaUrl0") as string;
        const mediaType = (formData.get("MediaContentType0") as string) || "";
        if (mediaType.startsWith("image/")) {
          messageType = "photo";
        } else if (mediaType.startsWith("audio/")) {
          messageType = "audio";
        }
      }
    } else {
      // JSON fallback for testing
      const json = await req.json();
      body = json.Body || json.body || "";
      from = json.From || json.from || "";
    }

    if (!body && !mediaUrl) {
      return new Response(
        '<Response><Message>Mensagem vazia recebida.</Message></Response>',
        { headers: { ...corsHeaders, "Content-Type": "text/xml" }, status: 200 }
      );
    }

    // Pick the owner user (first profile created — owner of personal Central app)
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const ownerId = ownerProfile?.id || null;

    // Insert into inbox_entries
    const entry: any = {
      content: body || (messageType === "photo" ? "📷 Foto via WhatsApp" : "🎙️ Áudio via WhatsApp"),
      type: messageType,
      status: "pending",
      source: "whatsapp",
      whatsapp_from: from,
      user_id: ownerId,
    };

    if (messageType === "photo" && mediaUrl) {
      entry.photo_url = mediaUrl;
    } else if (messageType === "audio" && mediaUrl) {
      entry.audio_url = mediaUrl;
    }

    const { error } = await supabase.from("inbox_entries").insert(entry);
    if (error) {
      console.error("DB insert error:", error);
      throw new Error("Failed to save inbox entry");
    }

    // Respond with TwiML acknowledgment
    return new Response(
      '<Response><Message>✅ Recebido! Sua mensagem foi adicionada ao inbox.</Message></Response>',
      { headers: { ...corsHeaders, "Content-Type": "text/xml" }, status: 200 }
    );
  } catch (e) {
    console.error("whatsapp-webhook error:", e);
    return new Response(
      '<Response><Message>Erro ao processar mensagem.</Message></Response>',
      { headers: { ...corsHeaders, "Content-Type": "text/xml" }, status: 500 }
    );
  }
});
