import { useNavigate } from "react-router-dom";
import { ArrowUp, RefreshCw } from "lucide-react";
import { isToday } from "date-fns";

interface FollowedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  latestPost?: {
    id: string;
    image_url: string;
    confirmed_at: string;
  } | null;
}

interface FollowingOverviewProps {
  users: FollowedUser[];
  onBackToTop: () => void;
  onRefresh: () => void;
  todayPrompt?: string | null;
  totalPosts?: number;
}

export default function FollowingOverview({ users, onBackToTop, onRefresh, todayPrompt, totalPosts }: FollowingOverviewProps) {
  const navigate = useNavigate();

  // Sort: posted today first, then alphabetical
  const sorted = [...users].sort((a, b) => {
    const aToday = a.latestPost?.confirmed_at && isToday(new Date(a.latestPost.confirmed_at));
    const bToday = b.latestPost?.confirmed_at && isToday(new Date(b.latestPost.confirmed_at));
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return (a.display_name || a.username).localeCompare(b.display_name || b.username);
  });

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-16 pb-8">
        {/* Completion card */}
        <div className="text-center mb-8">
          {todayPrompt && (
            <>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Today's Item</p>
              <p className="text-[22px] italic font-serif text-foreground/70 leading-relaxed mb-3">
                "{todayPrompt}"
              </p>
            </>
          )}
          {typeof totalPosts === "number" && totalPosts > 0 && (
            <p className="text-[12px] text-muted-foreground">
              {totalPosts} moment{totalPosts !== 1 ? "s" : ""} shared today
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {sorted.map(u => (
            <div key={u.id} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => {
                  if (u.latestPost) navigate(`/post/${u.latestPost.id}`);
                  else navigate(`/user/${u.id}`);
                }}
                className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted group"
              >
                {u.latestPost ? (
                  <img
                    src={u.latestPost.image_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-2xl text-muted-foreground/40">
                      {(u.display_name || u.username)[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Avatar overlay */}
                <div className="absolute bottom-1.5 left-1.5">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-6 w-6 rounded-full border-2 border-background object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                      <span className="text-[9px] font-medium text-muted-foreground">
                        {(u.display_name || u.username)[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Today indicator */}
                {u.latestPost?.confirmed_at && isToday(new Date(u.latestPost.confirmed_at)) && (
                  <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
              <button
                onClick={() => navigate(`/user/${u.id}`)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate w-full text-center"
              >
                {u.display_name || u.username}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet actions */}
      <div className="flex items-center justify-center gap-4 py-5 border-t border-border bg-background">
        <button
          onClick={onBackToTop}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Back to top
        </button>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    </div>
  );
}
