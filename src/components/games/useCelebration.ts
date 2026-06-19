import { useState, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { playCorrect, playWrong, playComplete, playCombo, playFanfare } from "./gameUtils";

export type CelebrationEffect = null | "correct" | "combo" | "end-good" | "end-perfect";

export function useCelebration() {
  const [effect, setEffect] = useState<CelebrationEffect>(null);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCorrect = useCallback(() => {
    comboRef.current += 1;
    const c = comboRef.current;
    setCombo(c);

    if (c >= 3) {
      playCombo(c);
      confetti({
        particleCount: Math.min(25 + c * 6, 70),
        spread: 70,
        origin: { x: 0.5, y: 0.55 },
        colors: ["#f59e0b", "#ef4444", "#f97316", "#fbbf24", "#fde68a"],
        scalar: 1.1,
        disableForReducedMotion: true,
      });
      setEffect("combo");
    } else {
      playCorrect();
      confetti({
        particleCount: 20,
        spread: 52,
        origin: { x: 0.5, y: 0.55 },
        colors: ["#10b981", "#34d399", "#fbbf24", "#6366f1", "#a78bfa"],
        scalar: 0.85,
        disableForReducedMotion: true,
      });
      setEffect("correct");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setEffect(null), 1500);
  }, []);

  const onWrong = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
    playWrong();
  }, []);

  const onComplete = useCallback((score: number, max: number) => {
    const pct = max > 0 ? score / max : 0;
    if (pct >= 0.8) {
      const isPerfect = score > 0 && score === max;
      playFanfare();

      const fireAt = (x: number) =>
        confetti({
          particleCount: isPerfect ? 90 : 55,
          spread: 130,
          origin: { x, y: 0.25 },
          colors: isPerfect
            ? ["#fbbf24", "#f59e0b", "#fcd34d", "#ffffff", "#fde68a"]
            : ["#6366f1", "#10b981", "#3b82f6", "#fbbf24", "#ec4899"],
          disableForReducedMotion: true,
        });

      fireAt(0.25);
      setTimeout(() => fireAt(0.75), 220);
      if (isPerfect) {
        setTimeout(() => fireAt(0.5), 450);
        setTimeout(
          () =>
            confetti({
              particleCount: 50,
              spread: 360,
              origin: { x: 0.5, y: 0.5 },
              startVelocity: 18,
              gravity: 0.55,
              colors: ["#fbbf24", "#f59e0b", "#ffffff"],
              disableForReducedMotion: true,
            }),
          680,
        );
      }

      setEffect(isPerfect ? "end-perfect" : "end-good");
      setTimeout(() => setEffect(null), 3200);
    } else {
      playComplete();
    }
  }, []);

  return { effect, combo, onCorrect, onWrong, onComplete };
}
