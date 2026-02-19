import { useState, useEffect } from "react";
import { Download, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8 bg-background animate-fade-in">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <Check className="h-6 w-6 text-foreground/60" />
        </div>
        <h1 className="text-2xl font-serif text-center mb-3">Items is installed</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          You can now open Items from your home screen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 bg-background animate-fade-in">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-card">
          <Download className="h-7 w-7 text-foreground/60" />
        </div>

        <h1 className="text-2xl font-serif mb-3">Install Items</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Add Items to your home screen for the full ritual experience — open it like a native app, every day.
        </p>

        {deferredPrompt ? (
          <Button onClick={handleInstall} className="w-full" size="lg">
            <Download className="mr-2 h-4 w-4" />
            Add to Home Screen
          </Button>
        ) : isIOS ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70 leading-relaxed">
              Tap the <Share className="inline h-4 w-4 -mt-0.5 text-primary" /> share button in Safari, then select <strong>"Add to Home Screen"</strong>.
            </p>
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-meta">
                Items works best when installed — it opens full-screen without browser bars.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open the browser menu and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
            </p>
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-meta">
                Items works best when installed — it opens full-screen without browser bars.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
