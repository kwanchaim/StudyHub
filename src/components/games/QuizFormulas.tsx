import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FORMULAS, type FormulaSubject, type FormulaItem } from "../../data/gameContent";
import { playCorrect, playWrong, playTick, pickRandom, shuffle } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";

const TOTAL = 10;
const TIME_PER_Q = 15;

interface Props {
  subject: FormulaSubject | "all";
  onComplete: (score: number, max: number) => void;
}

// Extends FormulaItem with pre-shuffled choices so correct answer isn't always at index 0
interface QuizQuestion extends FormulaItem {
  shuffledChoices: string[];
}

function buildPool(subject: FormulaSubject | "all"): QuizQuestion[] {
  const filtered = subject === "all" ? FORMULAS : FORMULAS.filter((f) => f.subject === subject);
  return pickRandom(filtered, TOTAL).map((f) => ({
    ...f,
    shuffledChoices: shuffle([...f.choices]),
  }));
}

export default function QuizFormulas({ subject, onComplete }: Props) {
  const [pool] = useState<QuizQuestion[]>(() => buildPool(subject));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboRef = useRef(0);

  const current = pool[round];

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const advance = useCallback((isCorrect: boolean) => {
    stopTimer();
    const newScore = score + (isCorrect ? 1 : 0);
    if (round + 1 >= TOTAL) {
      setDone(true);
      setScore(newScore);
      if (newScore >= 8) triggerCelebration(3);
      setTimeout(() => onComplete(newScore, TOTAL), 1200);
    } else {
      setTimeout(() => {
        setRound((r) => r + 1);
        setSelected(null);
        setTimeLeft(TIME_PER_Q);
        setScore(newScore);
      }, 900);
    }
  }, [score, round, stopTimer, onComplete]);

  const answer = useCallback((choice: string) => {
    if (selected) return;
    setSelected(choice);
    const correct = choice === current.name;
    if (correct) {
      playCorrect();
      comboRef.current += 1;
      triggerCelebration(1, comboRef.current);
    } else {
      playWrong();
      comboRef.current = 0;
    }
    advance(correct);
  }, [selected, current, advance]);

  useEffect(() => {
    if (done || selected) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          playWrong();
          setSelected("__timeout__");
          advance(false);
          return 0;
        }
        if (t <= 5) playTick();
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [round, done, selected, advance, stopTimer]);

  if (!current) return null;

  const timePct = timeLeft / TIME_PER_Q;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-muted">ข้อ {round + 1}/{TOTAL}</span>
        <span className="text-brand">⭐ {score}</span>
        <span className={`font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-fg"}`}>
          ⏱ {timeLeft}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <motion.div
          className={`h-full rounded-full transition-colors ${timeLeft <= 5 ? "bg-red-400" : "bg-brand"}`}
          animate={{ width: `${timePct * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Formula display */}
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-xs text-muted mb-2">สูตรนี้คืออะไร?</p>
        <p className="text-xl font-mono font-bold text-fg tracking-wide">{current.formula}</p>
        <p className="text-xs text-muted mt-2">
          หมวด: {current.subject === "calc" ? "แคลคูลัส" : current.subject === "trig" ? "ตรีโกณมิติ" : current.subject === "algebra" ? "พีชคณิต" : current.subject === "physics" ? "ฟิสิกส์" : "เคมี"}
        </p>
      </div>

      {/* Choices — shuffledChoices ensures correct answer is at a random position each question */}
      <div className="grid grid-cols-1 gap-2">
        {current.shuffledChoices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrect = choice === current.name;
          const revealed = selected !== null;
          return (
            <motion.button
              key={choice}
              whileTap={{ scale: 0.98 }}
              onClick={() => answer(choice)}
              disabled={!!selected}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-left transition ${
                revealed && isCorrect
                  ? "bg-emerald-500 text-white"
                  : revealed && isSelected && !isCorrect
                  ? "bg-red-500 text-white"
                  : revealed
                  ? "bg-surface2 text-muted opacity-60"
                  : "bg-surface2 text-fg hover:bg-brand/15 hover:text-brand"
              }`}
            >
              {revealed && isCorrect ? "✓ " : revealed && isSelected && !isCorrect ? "✗ " : ""}
              {choice}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center glass rounded-2xl p-4"
          >
            <p className="text-2xl font-extrabold text-brand">
              {score}/{TOTAL} คะแนน
            </p>
            <p className="text-sm text-muted mt-1">
              {score >= 8 ? "ยอดเยี่ยม! 🏆" : score >= 5 ? "ดีมาก! 👍" : "ฝึกเพิ่มอีกหน่อย 💪"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
