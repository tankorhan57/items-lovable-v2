import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const currentHourUTC = new Date().getUTCHours();

    // Find users who want reminders at this hour and haven't posted today
    const { data: eligibleUsers } = await adminClient
      .from("notification_preferences")
      .select("user_id")
      .eq("daily_reminder", true)
      .eq("reminder_hour", currentHourUTC);

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(JSON.stringify({ ok: true, reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get today's prompt
    const today = new Date().toISOString().split("T")[0];
    const { data: dailyItem } = await adminClient
      .from("daily_items")
      .select("prompt_text")
      .eq("active_date", today)
      .maybeSingle();

    const promptText = dailyItem?.prompt_text || "today's item";

    // Check which users have already posted today
    const userIds = eligibleUsers.map((u) => u.user_id);
    const { data: todayPosts } = await adminClient
      .from("posts")
      .select("user_id, daily_item_id")
      .in("user_id", userIds)
      .not("confirmed_at", "is", null);

    // Filter: get daily_item ids for today
    const { data: todayItems } = await adminClient
      .from("daily_items")
      .select("id")
      .eq("active_date", today);

    const todayItemIds = new Set(todayItems?.map((i) => i.id) || []);
    const postedUserIds = new Set(
      todayPosts
        ?.filter((p) => todayItemIds.has(p.daily_item_id))
        .map((p) => p.user_id) || []
    );

    const usersToRemind = userIds.filter((id) => !postedUserIds.has(id));

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ ok: true, reminded: 0 }), {
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

    // Fetch all subscriptions for eligible users
    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", usersToRemind);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send notifications via the send-notification pattern (inline here for efficiency)
    // We'll call the send-notification function for each user
    // But since we're in the same runtime, let's send directly using fetch
    const notifUrl = `${supabaseUrl}/functions/v1/send-notification`;
    let reminded = 0;

    // Group subs by user_id and send one notification per user via the edge function
    const userSubMap = new Map<string, typeof subs>();
    for (const sub of subs) {
      if (!userSubMap.has(sub.user_id)) userSubMap.set(sub.user_id, []);
      userSubMap.get(sub.user_id)!.push(sub);
    }

    // We can't call send-notification as ourselves (no user JWT), so we'll send pushes directly
    // Reuse the Web Push logic inline (import from send-notification isn't possible in Supabase)
    // Instead, make an HTTP call to the send-notification function with service role key
    await Promise.all(
      Array.from(userSubMap.keys()).map(async (userId) => {
        try {
          const resp = await fetch(notifUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              targetUserId: userId,
              type: "daily_reminder",
              title: "Today's Item",
              body: `"${promptText}" — capture your perspective`,
              url: "/",
            }),
          });
          if (resp.ok) reminded++;
        } catch {
          // Silent fail per user
        }
      })
    );

    return new Response(JSON.stringify({ ok: true, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-reminder error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
