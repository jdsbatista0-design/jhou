import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-twilio-signature",
};

// Validate Twilio's HMAC-SHA1 request signature.
// See https://www.twilio.com/docs/usage/webhooks/webhooks-security
async function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const bytes = new Uint8Array(mac);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const expected = btoa(bin);

  // Constant-time-ish comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }
    if (!TWILIO_AUTH_TOKEN) {
      console.error("TWILIO_AUTH_TOKEN not configured — rejecting webhook");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const contentType = req.headers.get("content-type") || "";
    const signature = req.headers.get("x-twilio-signature") || "";
    // Twilio signs using the exact public URL configured in its console.
    // Reconstruct with the forwarded host/proto when present.
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const reqUrl = new URL(req.url);
    const publicUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}${reqUrl.pathname}${reqUrl.search}`
      : req.url;

    let body: string;
    let from: string;
    let mediaUrl: string | null = null;
    let numMedia = 0;
    let messageType: "text" | "photo" | "audio" = "text";
    const paramsForSig: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const raw = await req.text();
      const params = new URLSearchParams(raw);
      params.forEach((v, k) => { paramsForSig[k] = v; });

      if (!signature) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      const ok = await verifyTwilioSignature(TWILIO_AUTH_TOKEN, signature, publicUrl, paramsForSig);
      if (!ok) {
        console.error("Invalid Twilio signature");
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }

      body = params.get("Body") || "";
      from = params.get("From") || "";
      numMedia = parseInt(params.get("NumMedia") || "0", 10);

      if (numMedia > 0) {
        mediaUrl = params.get("MediaUrl0");
        const mediaType = params.get("MediaContentType0") || "";
        if (mediaType.startsWith("image/")) {
          messageType = "photo";
        } else if (mediaType.startsWith("audio/")) {
          messageType = "audio";
        }
      }
    } else {
      // Non-form requests are not from Twilio — reject.
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    if (!body && !mediaUrl) {
      return new Response(
        '<Response><Message>Mensagem vazia recebida.</Message></Response>',
        { headers: { ...corsHeaders, "Content-Type": "text/xml" }, status: 200 }
      );
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const ownerId = ownerProfile?.id || null;

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

    return new Response(
      '<Response><Message>✅ Recebido! Sua mensagem foi adicionada ao inbox.</Message></Response>',
      { headers: { ...corsHeaders, "Content-Type": "text/xml" }, status: 200 }
    );
  } catch (e) {
    console.error("whatsapp-webhook error");
    return new Response(
      '<Response><Message>Erro ao processar mensagem.</Message></Response>',
      { headers: { ...corsHeaders, "Content-Type": "text/xml" }, status: 500 }
    );
  }
});
