/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

// Augment ServiceWorkerRegistration for Push API
declare global {
  interface ServiceWorkerRegistration {
    readonly pushManager: any;
  }
}


interface NotificationPreferences {
  daily_reminder: boolean;
  reminder_hour: number;
  on_appreciation: boolean;
  on_follow: boolean;
  on_note: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  daily_reminder: true,
  reminder_hour: 9,
  on_appreciation: true,
  on_follow: true,
  on_note: true,
};

export function useNotifications() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Check browser support
  useEffect(() => {
    const ok = "PushManager" in window && "Notification" in window && "serviceWorker" in navigator;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  // Load subscription status and preferences
  useEffect(() => {
    if (!user || !supported) return;
    checkSubscription();
    loadPreferences();
  }, [user, supported]);

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  };

  const loadPreferences = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setPrefs({
        daily_reminder: data.daily_reminder,
        reminder_hour: data.reminder_hour,
        on_appreciation: data.on_appreciation,
        on_follow: data.on_follow,
        on_note: data.on_note,
      });
    }
    setPrefsLoaded(true);
  };

  const subscribe = useCallback(async () => {
    if (!user || !supported) return false;
    setLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        "push-subscribe",
        { method: "GET" }
      );

      if (vapidError || !vapidData?.publicKey) {
        console.error("Failed to get VAPID key:", vapidError);
        setLoading(false);
        return false;
      }

      // Convert base64url to Uint8Array for applicationServerKey
      const publicKeyBytes = base64UrlToUint8Array(vapidData.publicKey);

      // Subscribe via Push API
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKeyBytes,
      });

      // Send subscription to backend
      const subJson = sub.toJSON();
      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          action: "subscribe",
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        },
      });

      if (error) {
        console.error("Failed to save subscription:", error);
        setLoading(false);
        return false;
      }

      setSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Subscribe error:", err);
      setLoading(false);
      return false;
    }
  }, [user, supported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const subJson = sub.toJSON();
        // Remove from backend
        await supabase.functions.invoke("push-subscribe", {
          body: {
            action: "unsubscribe",
            subscription: { endpoint: subJson.endpoint },
          },
        });
        // Unsubscribe from push API
        await sub.unsubscribe();
      }

      setSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user) return;
      const newPrefs = { ...prefs, ...updates };
      setPrefs(newPrefs);

      await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, ...newPrefs, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    },
    [user, prefs]
  );

  return {
    supported,
    permission,
    subscribed,
    loading,
    prefs,
    prefsLoaded,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
