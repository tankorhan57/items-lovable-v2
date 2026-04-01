import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { HelpCircle, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameCharacter from "@/components/GameCharacter";

interface PromptGameProps {
  prompt: string;
  dailyItemId: string;
  dateKey: string;
  onComplete: (wrongGuesses: number) => void;
}

type Phase = "greeting" | "game" | "result";

interface Ranking {
  topPercent: number;
  avgWrong: number;
  solved: boolean;
}

const KEYBOARD_ROWS = [
  "QWERTYUIO".split(""),
  "ASDFGHJKL".split(""),
  "ZXCVBNMP".split(""),
];

export default function PromptGame({ prompt, dailyItemId, dateKey, onComplete }: PromptGameProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("greeting");
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const normalised = useMemo(() => prompt.toUpperCase(), [prompt]);

  const displayPrompt = useMemo(() => {
    return normalised.split("").map((ch) => {
      if (ch === " " || !/[A-Z]/.test(ch)) return ch;
      return guessedLetters.has(ch) ? ch : "_";
    });
  }, [normalised, guessedLetters]);

  const isSolved = useMemo(() => !displayPrompt.includes("_"), [displayPrompt]);
  const isFailed = wrongCount >= 6;
  const characterState = Math.min(wrongCount, 6) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // Check localStorage on mount — skip if already played
  useEffect(() => {
    const stored = localStorage.getItem(`items-game-${dateKey}`);
    if (stored !== null) {
      onComplete(Number(stored));
    }
  }, [dateKey, onComplete]);

  // Greeting auto-advance
  useEffect(() => {
    if (phase !== "greeting") return;
    const t = setTimeout(() => setPhase("game"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // Show help for first-timers
  useEffect(() => {
    if (phase === "game" && !localStorage.getItem("items-game-seen")) {
      setShowHelp(true);
    }
  }, [phase]);

  // Result countdown auto-advance
  useEffect(() => {
    if (phase !== "result") return;
    if (countdown <= 0) {
      onComplete(wrongCount);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, wrongCount, onComplete]);

  const handleEnd = useCallback(
    async (wrong: number) => {
      localStorage.setItem(`items-game-${dateKey}`, String(wrong));

      // Save to DB
      try {
        if (user) {
          await supabase.from("game_results").insert({
            user_id: user.id,
            daily_item_id: dailyItemId,
            wrong_guesses: wrong,
          });

          const { data } = await supabase.rpc("get_game_ranking", {
            p_daily_item_id: dailyItemId,
            p_wrong_guesses: wrong,
          });

          if (data && data.length > 0) {
            setRanking({
              topPercent: Number(data[0].top_percent),
              avgWrong: Number(data[0].avg_wrong),
              solved: wrong < 6,
            });
          }
        }
      } catch (err: unknown) {
        console.error("Game save error:", err);
      }

      setPhase("result");
    },
    [dateKey, dailyItemId, user]
  );

  // Check win/lose after each guess
  useEffect(() => {
    if (phase !== "game") return;
    if (isSolved) {
      handleEnd(wrongCount);
    } else if (isFailed) {
      handleEnd(6);
    }
  }, [isSolved, isFailed, phase, wrongCount, handleEnd]);

  const handleLetterTap = (letter: string) => {
    if (guessedLetters.has(letter) || isSolved || isFailed) return;
    const next = new Set(guessedLetters);
    next.add(letter);
    setGuessedLetters(next);
    if (!normalised.includes(letter)) {
      setWrongCount((c) => c + 1);
    }
  };

  const handleGiveUp = () => {
    handleEnd(6);
  };

  const dismissHelp = () => {
    setShowHelp(false);
    localStorage.setItem("items-game-seen", "1");
  };

  // Split prompt into words for display
  const words = useMemo(() => {
    const result: string[][] = [];
    let current: string[] = [];
    displayPrompt.forEach((ch) => {
      if (ch === " ") {
        if (current.length) result.push(current);
        current = [];
      } else {
        current.push(ch);
      }
    });
    if (current.length) result.push(current);
    return result;
  }, [displayPrompt]);

  const getLetterState = (letter: string): "default" | "correct" | "wrong" => {
    if (!guessedLetters.has(letter)) return "default";
    return normalised.includes(letter) ? "correct" : "wrong";
  };

  /* ── GREETING ── */
  if (phase === "greeting") {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background animate-fade-in cursor-pointer"
        onClick={() => setPhase("game")}
      >
        <GameCharacter state={0} size={4} animate={false} />
        <div className="mt-6 bg-card border border-border rounded-2xl px-5 py-4 max-w-[280px] text-center animate-delayed-fade-in shadow-soft">
          <p className="text-[15px] text-foreground">Hey! Can you guess today's item? 🎯</p>
        </div>
        <p className="mt-8 text-[12px] text-muted-foreground animate-delayed-fade-in">
          tap anywhere to start
        </p>
      </div>
    );
  }

  /* ── RESULT ── */
  if (phase === "result") {
    const solved = wrongCount < 6;
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6 animate-scale-in">
        <GameCharacter state={solved ? 0 : 6} size={4} animate={false} />

        <div className="mt-6 text-center animate-fade-in">
          {solved ? (
            <>
              <h2 className="text-[24px] font-serif text-foreground mb-3">You cracked it!</h2>
              <div className="bg-card border border-border rounded-xl px-6 py-4 mb-3">
                <p className="text-[32px] font-bold text-foreground">{wrongCount}</p>
                <p className="text-[12px] text-muted-foreground">wrong guesses</p>
              </div>
              {ranking && (
                <>
                  <div className="inline-block bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-[13px] font-medium mb-2">
                    Top {ranking.topPercent}% today 🏆
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Community average: {ranking.avgWrong} wrong
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground mb-2">Today's item was:</p>
              <div className="bg-card border border-border rounded-xl px-5 py-3 mb-4">
                <p className="text-[16px] font-serif italic text-foreground">"{prompt}"</p>
              </div>
              <p className="text-[15px] text-foreground mb-2">Better luck tomorrow</p>
              {ranking && (
                <p className="text-[12px] text-muted-foreground">
                  Community average: {ranking.avgWrong} wrong
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-8 w-full max-w-[300px]">
          <Button
            className="w-full h-12 rounded-xl tap-scale"
            onClick={() => onComplete(wrongCount)}
          >
            Continue to Camera
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            continuing in {countdown}s...
          </p>
        </div>
      </div>
    );
  }

  /* ── GAME ── */
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center bg-background px-4 pt-10 pb-6 animate-fade-in overflow-y-auto">
      {/* Help icon */}
      <button
        onClick={() => setShowHelp(true)}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Character */}
      <div className="mb-2">
        <GameCharacter state={characterState} size={3} />
      </div>

      {/* Wrong counter */}
      <p className="text-[12px] text-muted-foreground mb-1">
        ✕ {wrongCount} / 6
      </p>

      {/* How to play tooltip */}
      {showHelp && (
        <div className="relative bg-card border border-border rounded-xl px-4 py-3 max-w-[300px] mb-3 shadow-soft animate-scale-in">
          <button onClick={dismissHelp} className="absolute top-2 right-2 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
          <p className="text-[13px] text-foreground pr-5">
            Tap letters to guess the hidden phrase. 6 wrong guesses and the adventure ends — but you
            can always continue to the camera!
          </p>
        </div>
      )}

      {/* Phrase display */}
      <div className="flex flex-wrap justify-center gap-y-2 gap-x-4 mt-4 mb-6 px-2">
        {words.map((word, wi) => (
          <div key={wi} className="flex gap-[3px]">
            {word.map((ch, ci) => (
              <div
                key={`${wi}-${ci}`}
                className="w-[28px] h-[34px] flex items-center justify-center rounded border border-border bg-card text-[16px] font-mono font-bold text-foreground"
              >
                {ch !== "_" ? ch : ""}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* A-Z keyboard */}
      <div className="flex flex-col gap-1.5 items-center w-full max-w-[360px]">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((letter) => {
              const state = getLetterState(letter);
              return (
                <button
                  key={letter}
                  disabled={state !== "default"}
                  onClick={() => handleLetterTap(letter)}
                  className={`w-[34px] h-[38px] rounded-lg text-[13px] font-semibold transition-colors tap-scale
                    ${state === "default" ? "bg-card border border-border text-foreground active:bg-accent" : ""}
                    ${state === "correct" ? "bg-green-500 text-white border border-green-600" : ""}
                    ${state === "wrong" ? "bg-muted text-muted-foreground border border-transparent" : ""}
                  `}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Give up */}
      <button
        onClick={handleGiveUp}
        className="mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
      >
        Give up
      </button>
    </div>
  );
}
