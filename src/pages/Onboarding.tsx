import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Globe, Flame } from "lucide-react";

const slides = [
  {
    icon: Camera,
    title: "One photo a day",
    description: "Each day, a single prompt appears. Capture your response with one photo. No filters, no retakes after you confirm.",
  },
  {
    icon: Globe,
    title: "Unlock the world",
    description: "Post your photo to see how others around the globe responded to the same prompt. A shared moment, a thousand perspectives.",
  },
  {
    icon: Flame,
    title: "Build your ritual",
    description: "Show up daily. Your private streak tracks your consistency. Miss two days and it resets — but there's always tomorrow.",
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const handleComplete = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      await refreshProfile();
    }
    navigate("/");
  };

  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-fade-in" key={step}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <Icon className="h-9 w-9 text-primary" />
          </div>
          <h2 className="text-3xl font-serif text-foreground mb-3">{slide.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            {slide.description}
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <Button
            onClick={() => (isLast ? handleComplete() : setStep(step + 1))}
            size="sm"
          >
            {isLast ? "Begin" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
