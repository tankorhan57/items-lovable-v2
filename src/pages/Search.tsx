import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import FollowButton from "@/components/FollowButton";

interface SearchUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

export default function Search() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [suggested, setSuggested] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadSuggested();
  }, [user]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => searchUsers(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadSuggested = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_private")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setSuggested(data || []);
  };

  const searchUsers = async (q: string) => {
    if (!user) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_private")
      .neq("id", user.id)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);
    setResults(data || []);
    setSearching(false);
  };

  const UserRow = ({ u }: { u: SearchUser }) => (
    <div className="flex items-center gap-3 py-3">
      <button
        onClick={() => navigate(`/user/${u.id}`)}
        className="h-11 w-11 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0 tap-scale transition-ritual"
      >
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-serif font-bold text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
        )}
      </button>
      <button onClick={() => navigate(`/user/${u.id}`)} className="flex-1 min-w-0 text-left tap-scale transition-ritual">
        <p className="text-[14px] font-semibold text-foreground truncate">{u.display_name || u.username}</p>
        <p className="text-meta">@{u.username}</p>
      </button>
      <FollowButton targetUserId={u.id} isPrivate={u.is_private} />
    </div>
  );

  const displayList = query.trim() ? results : suggested;
  const sectionTitle = query.trim() ? "Results" : "Suggested";

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary tap-scale transition-ritual">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-serif text-[28px] font-bold tracking-[-0.01em] text-foreground">Search</h1>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="pl-10 bg-card border-border shadow-soft rounded-xl h-11"
            autoFocus
          />
        </div>
      </div>

      <div className="px-6 pt-1">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">{sectionTitle}</p>

        {searching ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-11 w-11 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <h3 className="font-serif text-xl font-bold text-foreground mb-1">
              {query.trim() ? "No users found." : "No suggestions available."}
            </h3>
            <p className="text-meta text-center">
              {query.trim() ? "Try a different username." : ""}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayList.map(u => <UserRow key={u.id} u={u} />)}
          </div>
        )}
      </div>
    </div>
  );
}
