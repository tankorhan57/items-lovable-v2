import { useState } from "react";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "check-inbox">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMode("check-inbox");
      } else if (mode === "login") {
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
        setMode("check-inbox");
      }
    } catch (error: unknown) {
      toast.error(mapErrorToUserMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Confirmation email resent!");
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "check-inbox") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-serif tracking-tight text-foreground">Check your inbox</h1>
            <p className="mt-3 text-muted-foreground text-sm">
              We sent an email to <span className="text-foreground font-medium">{email}</span>. Tap the link inside to continue.
            </p>
          </div>

          <Button variant="outline" onClick={handleResend} disabled={loading} className="w-full">
            {loading ? "Sending..." : "Resend email"}
          </Button>

          <button
            onClick={() => setMode("login")}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

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
            {mode === "signup" && (
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
            {mode !== "forgot" && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border"
                minLength={6}
                required
              />
            )}
            <Button type="submit" className="w-full tap-scale" disabled={loading}>
              {loading
                ? "..."
                : mode === "forgot"
                ? "Send reset link"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </Button>
          </form>

          {mode === "login" && (
            <button
              onClick={() => setMode("forgot")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-8 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-ritual"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : mode === "forgot"
            ? "Back to sign in"
            : "Don't have an account? Sign up"}
        </button>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>
          {" "}and{" "}
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
