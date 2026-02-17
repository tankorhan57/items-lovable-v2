import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Camera, Compass, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Camera, label: "Capture" },
  { path: "/explore", icon: Compass, label: "Explore" },
  { path: "/activity", icon: Bell, label: "Activity" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
