import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Camera, Compass, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    checkUnread();
  }, [user, profile, location.pathname]);

  const checkUnread = async () => {
    if (!user) return;
    const lastSeen = profile?.last_seen_activity;

    let query = supabase
      .from("activity")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (lastSeen) {
      query = query.gt("created_at", lastSeen);
    }

    const { count } = await query;
    setHasUnread((count || 0) > 0);
  };

  const navItems = [
    { path: "/", icon: Camera, label: "Capture" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/activity", icon: Bell, label: "Activity", badge: hasUnread },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[72px]">
        <Outlet />
      </main>

      {/* Bottom nav — high-contrast, structured */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around py-2 px-2">
          {navItems.map(({ path, icon: Icon, label, badge }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-5 py-2 rounded-xl tap-scale",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.6} />
                {badge && (
                  <span className="absolute top-1 right-3.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                )}
                <span className={cn("text-[11px]", active ? "font-semibold" : "font-medium")}>{label}</span>
              </button>
            );
          })}
        </div>
        {/* Safe area for home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
