import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppShell from "@/components/AppShell";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Capture from "@/pages/Capture";
import Explore from "@/pages/Explore";
import Profile from "@/pages/Profile";
import Activity from "@/pages/Activity";
import SettingsPage from "@/pages/SettingsPage";
import Search from "@/pages/Search";
import UserProfile from "@/pages/UserProfile";
import FollowList from "@/pages/FollowList";
import NoteThread from "@/pages/NoteThread";
import PostDetail from "@/pages/PostDetail";
import Archive from "@/pages/Archive";
import Install from "@/pages/Install";
import FriendsFeed from "@/pages/FriendsFeed";
import ReactionSettings from "@/pages/ReactionSettings";
import ResetPassword from "@/pages/ResetPassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "./pages/NotFound";
import GamePreview from "@/pages/GamePreview";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="/onboarding"
        element={
          !user ? <Navigate to="/auth" replace /> :
          profile?.onboarding_completed ? <Navigate to="/" replace /> :
          <Onboarding />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Capture />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/user/:userId/:type" element={<ProtectedRoute><FollowList /></ProtectedRoute>} />
      <Route path="/notes/:postId" element={<ProtectedRoute><NoteThread /></ProtectedRoute>} />
      <Route path="/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
      <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
      <Route path="/friends-feed" element={<ProtectedRoute><FriendsFeed /></ProtectedRoute>} />
      <Route path="/settings/reactions" element={<ProtectedRoute><ReactionSettings /></ProtectedRoute>} />
      <Route path="/install" element={<Install />} />
      <Route path="/game-preview" element={<ProtectedRoute><GamePreview /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
