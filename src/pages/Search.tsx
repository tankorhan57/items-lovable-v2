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
        className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0"
      >
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-serif text-muted-foreground">{u.username[0]?.toUpperCase()}</span>
        )}
      </button>
      <button onClick={() => navigate(`/user/${u.id}`)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
        <p className="text-xs text-muted-foreground">@{u.username}</p>
      </button>
      <FollowButton targetUserId={u.id} isPrivate={u.is_private} />
    </div>
  );

  const displayList = query.trim() ? results : suggested;
  const sectionTitle = query.trim() ? "Results" : "Suggested";

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-serif text-foreground">Search</h1>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="pl-9 bg-card"
            autoFocus
          />
        </div>
      </div>

      <div className="px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{sectionTitle}</p>

        {searching ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {query.trim() ? "No users found." : "No suggestions available."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {displayList.map(u => <UserRow key={u.id} u={u} />)}
          </div>
        )}
      </div>
    </div>
  );
}
