import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget push notification trigger.
 * Called from social event handlers after the activity row is created.
 */
export function triggerPushNotification(
  targetUserId: string,
  type: string,
  title: string,
  body: string,
  url?: string
) {
  // Don't await — this is best-effort
  supabase.functions
    .invoke("send-notification", {
      body: { targetUserId, type, title, body, url },
    })
    .catch(() => {
      // Silent fail — notifications are supplementary
    });
}
