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

  let body: { action?: string; inviteId?: string };
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (body.action === "list") {
    const { data, error } = await admin.from("invite_codes")
      .select("id, label, created_at, expires_at, redeemed_at, redeemed_by, revoked_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return reply({ error: "Could not load invites" }, 500);
    return reply({ invites: data ?? [] });
  }

  if (body.action === "revoke") {
    const inviteId = String(body.inviteId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return reply({ error: "Invalid invite ID" }, 400);
    const { data, error } = await admin.from("invite_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inviteId)
      .is("redeemed_at", null)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error) return reply({ error: "Could not revoke invite" }, 500);
    if (!data) return reply({ error: "Invite not found, already used, or already revoked" }, 409);
    return reply({ success: true });
  }

  return reply({ error: "Unknown action" }, 400);
});
