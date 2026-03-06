import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, LogOut, Moon, Sparkles, Bell, Heart, UserPlus, MessageSquare, Clock, Trash2, FileText } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";
import { useNotifications } from "@/hooks/use-notifications";

export default function SettingsPage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false);
  const [saving, setSaving] = useState(false);

  const {
    supported: pushSupported,
    permission: pushPermission,
    subscribed: pushSubscribed,
    loading: pushLoading,
    prefs: notifPrefs,
    prefsLoaded,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
    updatePreferences,
  } = useNotifications();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio, is_private: isPrivate })
      .eq("id", user.id);
    
    if (error) {
      toast.error("Failed to save");
    } else {
      await refreshProfile();
      toast.success("Profile updated");
    }
    setSaving(false);
  };

  const handleTogglePush = async () => {
    if (pushSubscribed) {
      await pushUnsubscribe();
      toast("Push notifications disabled");
    } else {
      const ok = await pushSubscribe();
      if (ok) {
        toast.success("Push notifications enabled!");
      } else if (pushPermission === "denied") {
        toast.error("Notifications blocked — enable them in your browser settings");
      } else {
        toast.error("Failed to enable notifications");
      }
    }
  };

  // Convert local hour to UTC hour for storage
  const localHourToUtc = (localHour: number): number => {
    const now = new Date();
    now.setHours(localHour, 0, 0, 0);
    return now.getUTCHours();
  };

  // Convert UTC hour to local hour for display
  const utcHourToLocal = (utcHour: number): number => {
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), utcHour));
    return utcDate.getHours();
  };

  const localReminderHour = utcHourToLocal(notifPrefs.reminder_hour);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-serif text-foreground">Settings</h1>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <AvatarUpload size="lg" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Display Name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-card" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Bio</label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few words about you..." className="bg-card" />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-sm text-foreground">Private account</p>
              <p className="text-xs text-muted-foreground">Only approved followers can see your photos</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-foreground" />
              <div>
                <p className="text-sm text-foreground">Dark mode</p>
                <p className="text-xs text-muted-foreground">Switch to a darker color scheme</p>
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>

          {/* Notifications Section */}
          {pushSupported && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1">
                <Bell className="h-4 w-4 text-foreground" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Notifications</p>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="text-sm text-foreground">Push notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {pushPermission === "denied"
                      ? "Blocked in browser settings"
                      : "Get notified about activity and reminders"}
                  </p>
                </div>
                <Switch
                  checked={pushSubscribed}
                  onCheckedChange={handleTogglePush}
                  disabled={pushLoading || pushPermission === "denied"}
                />
              </div>

              {pushSubscribed && prefsLoaded && (
                <div className="space-y-0 pl-2">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">Daily item reminder</p>
                    </div>
                    <Switch
                      checked={notifPrefs.daily_reminder}
                      onCheckedChange={(v) => updatePreferences({ daily_reminder: v })}
                    />
                  </div>

                  {notifPrefs.daily_reminder && (
                    <div className="flex items-center justify-between py-2.5 pl-6">
                      <p className="text-xs text-muted-foreground">Remind me at</p>
                      <select
                        value={localReminderHour}
                        onChange={(e) => {
                          const utcHour = localHourToUtc(parseInt(e.target.value));
                          updatePreferences({ reminder_hour: utcHour });
                        }}
                        className="text-sm bg-card border border-border rounded-lg px-2 py-1 text-foreground"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">Appreciations</p>
                    </div>
                    <Switch
                      checked={notifPrefs.on_appreciation}
                      onCheckedChange={(v) => updatePreferences({ on_appreciation: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">New followers</p>
                    </div>
                    <Switch
                      checked={notifPrefs.on_follow}
                      onCheckedChange={(v) => updatePreferences({ on_follow: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm text-foreground">Private notes</p>
                    </div>
                    <Switch
                      checked={notifPrefs.on_note}
                      onCheckedChange={(v) => updatePreferences({ on_note: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => navigate("/settings/reactions")}
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors py-3 border-t border-border w-full"
          >
            <Sparkles className="h-4 w-4" />
            Customize reactions
          </button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 border-t border-border">
            <FileText className="h-4 w-4" />
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-destructive/60 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your data — posts, followers, reactions, and notes. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      toast("Deleting account...");
                      const { error } = await supabase.functions.invoke("delete-account");
                      if (error) {
                        toast.error("Failed to delete account. Please try again.");
                        return;
                      }
                      await supabase.auth.signOut();
                      navigate("/auth");
                      toast.success("Account deleted.");
                    }}
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
