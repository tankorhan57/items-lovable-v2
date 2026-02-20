import { useState } from "react";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        if (!username.trim()) {
          toast.error("Username is required");
          setLoading(false);
          return;
        }

        const cleanUsername = username.toLowerCase().replace(/\s+/g, '_');

        // Check username availability
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (existing) {
          toast.error("That username is already taken");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: cleanUsername },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      }
    } catch (error: unknown) {
      toast.error(mapErrorToUserMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-serif tracking-tight text-foreground">Items.</h1>
          <p className="mt-3 text-muted-foreground text-sm">
            One prompt. One photo. A shared moment.
          </p>
        </div>

        <div className="surface-card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background border-border"
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border"
              minLength={6}
              required
            />
            <Button type="submit" className="w-full tap-scale" disabled={loading}>
              {loading ? "..." : isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-8 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-ritual"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
