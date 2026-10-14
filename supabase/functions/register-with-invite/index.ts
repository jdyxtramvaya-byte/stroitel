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

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim()));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "Server is not configured" }, 503);

  let body: { email?: string; password?: string; displayName?: string; inviteCode?: string };
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim().slice(0, 100);
  const inviteCode = String(body.inviteCode ?? "").trim().toLowerCase();

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "Enter a valid email" }, 400);
  if (password.length < 10 || password.length > 128) return reply({ error: "Password must be 10–128 characters" }, 400);
  if (!/^[a-f0-9]{48}$/.test(inviteCode)) return reply({ error: "Invalid or expired invite" }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await sha256(inviteCode);
  const { data: invite, error: lookupError } = await admin
    .from("invite_codes")
    .select("id, expires_at, redeemed_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError || !invite || invite.redeemed_at || invite.revoked_at ||
      (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now())) {
    return reply({ error: "Invalid or expired invite" }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError || !created.user) return reply({ error: "Could not create account. Check the email or try another." }, 400);

  const { data: consumed, error: consumeError } = await admin.rpc("consume_invite", {
    p_token_hash: tokenHash,
    p_user_id: created.user.id,
  });

  if (consumeError || consumed !== true) {
    await admin.auth.admin.deleteUser(created.user.id);
    return reply({ error: "This invite was already used, revoked, or expired" }, 409);
  }

  return reply({ success: true, message: "Account created. Sign in with your email and password." }, 201);
});
