import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Base64URL helpers ──
function toBase64Url(buf: Uint8Array): string {
  let b = "";
  for (const byte of buf) b += String.fromCharCode(byte);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { r.set(a, off); off += a.length; }
  return r;
}

// ── VAPID JWT ──
async function createVapidAuth(
  endpoint: string,
  privateKeyJwk: JsonWebKey,
  publicKeyBase64: string
): Promise<{ authorization: string }> {
  const origin = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ aud: origin, exp, sub: "mailto:noreply@items.app" })
    )
  );

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    sigInput
  ));

  const jwt = `${header}.${payload}.${toBase64Url(sig)}`;
  return {
    authorization: `vapid t=${jwt},k=${publicKeyBase64}`,
  };
}

// ── RFC 8291 payload encryption ──
async function encryptPayload(
  p256dhBase64: string,
  authBase64: string,
  payloadBytes: Uint8Array
): Promise<Uint8Array> {
  const subscriberPubRaw = fromBase64Url(p256dhBase64);
  const authSecret = fromBase64Url(authBase64);

  // Import subscriber's ECDH public key
  const subscriberPub = await crypto.subtle.importKey(
    "raw",
    subscriberPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate local ECDH key pair
  const localKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKP.publicKey)
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberPub },
      localKP.privateKey,
      256
    )
  );

  // Derive IKM: HKDF(salt=authSecret, ikm=sharedSecret, info="WebPush: info\0" || sub_pub || local_pub)
  const ecdhKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const keyInfo = concat(
    new TextEncoder().encode("WebPush: info\0"),
    subscriberPubRaw,
    localPubRaw
  );
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo },
      ecdhKey,
      256
    )
  );

  // Generate random salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive CEK and nonce from IKM
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);

  const cekInfo = concat(new TextEncoder().encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1]));
  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      ikmKey,
      128
    )
  );

  const nonceInfo = concat(new TextEncoder().encode("Content-Encoding: nonce\0"), new Uint8Array([1]));
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      ikmKey,
      96
    )
  );

  // Encrypt: plaintext = payload || 0x02 (record delimiter for final record)
  const plaintext = concat(payloadBytes, new Uint8Array([2]));
  const cek = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cek, plaintext)
  );

  // Build aes128gcm body: salt(16) || rs(4) || keyid_len(1) || keyid(65) || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([65]), localPubRaw, encrypted);
}

// ── Send a single push ──
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidConfig: { publicKeyBase64: string; privateKeyJwk: JsonWebKey }
): Promise<boolean> {
  const { authorization } = await createVapidAuth(
    subscription.endpoint,
    vapidConfig.privateKeyJwk,
    vapidConfig.publicKeyBase64
  );

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const body = await encryptPayload(subscription.p256dh, subscription.auth, payloadBytes);

  const resp = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body,
  });

  // 201 = success, 410/404 = subscription expired
  return resp.status >= 200 && resp.status < 300;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, type, title, body: notifBody, url } = await req.json();
    if (!targetUserId || !type) {
      return new Response(JSON.stringify({ error: "Missing targetUserId or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check notification preferences
    const { data: prefs } = await adminClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    // If no prefs row, user hasn't enabled notifications
    if (!prefs) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this notification type is enabled
    const typeMap: Record<string, string> = {
      appreciation: "on_appreciation",
      follow: "on_follow",
      follow_request: "on_follow",
      note: "on_note",
      daily_reminder: "daily_reminder",
    };
    const prefKey = typeMap[type];
    if (prefKey && prefs[prefKey] === false) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscriptions
    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get VAPID keys
    const { data: vapidRow } = await adminClient
      .from("app_config")
      .select("value")
      .eq("key", "vapid")
      .single();

    if (!vapidRow?.value) {
      return new Response(JSON.stringify({ error: "VAPID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidConfig = vapidRow.value as { publicKeyBase64: string; privateKeyJwk: JsonWebKey };
    const payload = { title: title || "Items", body: notifBody || "", url: url || "/", tag: type };

    // Send to all subscriptions
    let sent = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          const ok = await sendWebPush(sub, payload, vapidConfig);
          if (ok) sent++;
          else expiredEndpoints.push(sub.endpoint);
        } catch {
          expiredEndpoints.push(sub.endpoint);
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await adminClient
        .from("push_subscriptions")
        .delete()
        .eq("user_id", targetUserId)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
