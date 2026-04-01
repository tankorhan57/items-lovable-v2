import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { HelpCircle, X, ArrowRight, Trophy, Target, Skull } from "lucide-react";
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
  const [lastRevealed, setLastRevealed] = useState<string | null>(null);

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
    setLastRevealed(letter);
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

  // Progress bar
  const totalLetters = normalised.split("").filter(ch => /[A-Z]/.test(ch)).length;
  const uniqueLetters = new Set(normalised.split("").filter(ch => /[A-Z]/.test(ch))).size;
  const guessedCorrect = [...guessedLetters].filter(l => normalised.includes(l)).length;
  const progress = uniqueLetters > 0 ? Math.round((guessedCorrect / uniqueLetters) * 100) : 0;

  /* ── GREETING — character walks in from left ── */
  if (phase === "greeting") {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background cursor-pointer"
        onClick={() => setPhase("game")}
      >
        {/* Ground line */}
        <div className="relative flex flex-col items-center">
          {/* Character walks in */}
          <div className="animate-walk-in">
            <GameCharacter state={0} size={5} animate={false} />
          </div>

          {/* Ground shadow */}
          <div className="w-24 h-2 bg-muted/40 rounded-full mt-1 animate-walk-in" />
        </div>

        {/* Speech bubble pops in after walk */}
        <div className="mt-6 relative animate-bubble-pop">
          {/* Bubble arrow */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-card" />
          <div className="bg-card border border-border rounded-2xl px-6 py-4 max-w-[300px] text-center shadow-card">
            <p className="text-[16px] text-foreground font-medium">
              Ready for today's challenge? 🎯
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Guess the hidden prompt!
            </p>
          </div>
        </div>

        <p className="mt-10 text-[12px] text-muted-foreground animate-delayed-fade-in tracking-wide uppercase">
          tap anywhere to start
        </p>
      </div>
    );
  }

  /* ── RESULT ── */
  if (phase === "result") {
    const solved = wrongCount < 6;
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6 animate-fade-in">
        {/* Character */}
        <div className="animate-scale-in">
          <GameCharacter state={solved ? 0 : 6} size={5} animate={false} />
        </div>

        <div className="mt-6 text-center w-full max-w-[320px]">
          {solved ? (
            <div className="animate-slide-up">
              <h2 className="text-[26px] font-serif text-foreground mb-4">You cracked it! 🎉</h2>

              {/* Stats row */}
              <div className="flex gap-3 justify-center mb-4">
                <div className="bg-card border border-border rounded-xl px-5 py-3 flex-1 text-center">
                  <p className="text-[28px] font-bold text-foreground">{wrongCount}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">wrong</p>
                </div>
                <div className="bg-card border border-border rounded-xl px-5 py-3 flex-1 text-center">
                  <p className="text-[28px] font-bold text-foreground">{totalLetters}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">letters</p>
                </div>
              </div>

              {ranking && (
                <div className="space-y-2 mb-2">
                  <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-[14px] font-medium">
                    <Trophy className="h-4 w-4" />
                    Top {ranking.topPercent}% today
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Community average: {ranking.avgWrong} wrong
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Skull className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-[22px] font-serif text-foreground">Not this time</h2>
              </div>

              <p className="text-[12px] text-muted-foreground mb-3">Today's item was:</p>
              <div className="bg-card border border-border rounded-xl px-5 py-3 mb-4">
                <p className="text-[17px] font-serif italic text-foreground">&ldquo;{prompt}&rdquo;</p>
              </div>
              <p className="text-[14px] text-muted-foreground">Better luck tomorrow, adventurer</p>
              {ranking && (
                <p className="text-[12px] text-muted-foreground mt-2">
                  Community average: {ranking.avgWrong} wrong
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 w-full max-w-[320px] animate-delayed-fade-in">
          <Button
            className="w-full h-12 rounded-xl tap-scale text-[15px]"
            onClick={() => onComplete(wrongCount)}
          >
            Continue to Camera
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-2 tracking-wide">
            auto-continuing in {countdown}s
          </p>
        </div>
      </div>
    );
  }

  /* ── GAME ── */
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center bg-background px-4 pt-6 pb-4 animate-fade-in overflow-y-auto">
      {/* Top bar */}
      <div className="w-full max-w-[400px] flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">Guess the Item</span>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Character + wrong counter */}
      <div className="flex items-end gap-4 mb-3">
        <div className="relative">
          <GameCharacter state={characterState} size={3} />
        </div>
        <div className="pb-2">
          {/* Wrong dots */}
          <div className="flex gap-1 mb-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                  i < wrongCount
                    ? 'bg-destructive'
                    : 'bg-muted border border-border'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{wrongCount}/6 wrong</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[340px] mb-4">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* How to play tooltip */}
      {showHelp && (
        <div className="relative bg-card border border-border rounded-xl px-4 py-3 max-w-[320px] mb-3 shadow-card animate-scale-in">
          <button onClick={dismissHelp} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <p className="text-[13px] text-foreground pr-5 leading-relaxed">
            Tap letters to guess the hidden phrase. 6 wrong guesses and the adventure ends — but you can always continue to the camera!
          </p>
        </div>
      )}

      {/* Phrase display — tiles */}
      <div className="flex flex-wrap justify-center gap-y-2.5 gap-x-5 mb-5 px-2">
        {words.map((word, wi) => (
          <div key={wi} className="flex gap-[3px]">
            {word.map((ch, ci) => {
              const isRevealed = ch !== "_";
              const justRevealed = isRevealed && lastRevealed === ch;
              return (
                <div
                  key={`${wi}-${ci}`}
                  className={`w-[30px] h-[38px] flex items-center justify-center rounded-lg text-[17px] font-mono font-bold transition-all duration-200
                    ${isRevealed
                      ? 'bg-primary/10 border-2 border-primary/30 text-foreground'
                      : 'bg-card border-2 border-border text-transparent'
                    }
                    ${justRevealed ? 'animate-tile-reveal' : ''}
                  `}
                >
                  {isRevealed ? ch : "·"}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* A-Z keyboard */}
      <div className="flex flex-col gap-1.5 items-center w-full max-w-[380px]">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((letter) => {
              const lState = getLetterState(letter);
              return (
                <button
                  key={letter}
                  disabled={lState !== "default"}
                  onClick={() => handleLetterTap(letter)}
                  className={`w-[36px] h-[42px] rounded-xl text-[14px] font-semibold transition-all duration-150 tap-scale
                    ${lState === "default" ? "bg-card border border-border text-foreground hover:bg-accent active:bg-accent shadow-sm" : ""}
                    ${lState === "correct" ? "bg-green-500/90 text-white border border-green-600 shadow-sm" : ""}
                    ${lState === "wrong" ? "bg-muted/60 text-muted-foreground/50 border border-transparent" : ""}
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
        className="mt-4 text-[12px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
      >
        I give up
      </button>
    </div>
  );
}
