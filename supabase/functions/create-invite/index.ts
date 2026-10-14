import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://jdyxtramvaya-byte.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ownerId = Deno.env.get("OWNER_USER_ID");
  if (!url || !anonKey || !serviceKey || !ownerId) return reply({ error: "Server is not configured" }, 503);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return reply({ error: "Unauthorized" }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user || user.id !== ownerId) return reply({ error: "Forbidden" }, 403);

  let body: { label?: string; expiresInDays?: number };
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const label = String(body.label ?? "").trim().slice(0, 120);
  const days = Number(body.expiresInDays ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 90) return reply({ error: "expiresInDays must be 1..90" }, 400);

  const tokenBytes = crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("invite_codes").insert({
    token_hash: tokenHash,
    label,
    created_by: user.id,
    expires_at: new Date(Date.now() + days * 86400000).toISOString(),
  });
  if (error) return reply({ error: "Could not create invite" }, 500);

  // The raw token is returned once only; only its SHA-256 hash is stored.
  return reply({ token, expiresAt: new Date(Date.now() + days * 86400000).toISOString() }, 201);
});
