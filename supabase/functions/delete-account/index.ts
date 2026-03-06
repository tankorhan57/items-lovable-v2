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
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user via their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data in order (respecting foreign keys)
    // 1. Reactions, appreciations, notes referencing user's posts or by user
    await adminClient.from("post_reactions").delete().eq("user_id", userId);
    await adminClient.from("appreciations").delete().eq("user_id", userId);
    await adminClient.from("private_notes").delete().eq("author_id", userId);

    // 2. Activity records
    await adminClient.from("activity").delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`);

    // 3. Follows
    await adminClient.from("follows").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);

    // 4. Push subscriptions & notification preferences
    await adminClient.from("push_subscriptions").delete().eq("user_id", userId);
    await adminClient.from("notification_preferences").delete().eq("user_id", userId);

    // 5. Reaction config
    await adminClient.from("user_reaction_config").delete().eq("user_id", userId);

    // 6. Get user's posts to clean up storage
    const { data: posts } = await adminClient.from("posts").select("id, image_url").eq("user_id", userId);

    // Delete reactions/appreciations/notes on user's posts
    if (posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      await adminClient.from("post_reactions").delete().in("post_id", postIds);
      await adminClient.from("appreciations").delete().in("post_id", postIds);
      await adminClient.from("private_notes").delete().in("post_id", postIds);
    }

    // 7. Delete posts
    await adminClient.from("posts").delete().eq("user_id", userId);

    // 8. Delete streaks
    await adminClient.from("streaks").delete().eq("user_id", userId);

    // 9. Clean up storage files
    if (posts && posts.length > 0) {
      const filePaths = posts
        .map((p) => {
          const match = p.image_url?.match(/post-images\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];
      if (filePaths.length > 0) {
        await adminClient.storage.from("post-images").remove(filePaths);
      }
    }

    // Remove avatar
    const { data: profile } = await adminClient.from("profiles").select("avatar_url").eq("id", userId).single();
    if (profile?.avatar_url) {
      const avatarMatch = profile.avatar_url.match(/avatars\/(.+)$/);
      if (avatarMatch) {
        await adminClient.storage.from("avatars").remove([avatarMatch[1]]);
      }
    }

    // 10. Delete profile
    await adminClient.from("profiles").delete().eq("id", userId);

    // 11. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
