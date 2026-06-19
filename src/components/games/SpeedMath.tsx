import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { generateMathProblems, type GameDifficulty } from "../../data/gameContent";
import { playCorrect, playWrong, playComplete, playTick } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";

const GAME_DURATION = 60;

interface Props {
  difficulty: GameDifficulty;
  onComplete: (score: number, max: number) => void;
}

export default function SpeedMath({ difficulty, onComplete }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [problems] = useState(() => generateMathProblems(difficulty));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0); // กันค่า score ค้างใน closure ของ timer

  const endGame = useCallback((sc: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("done");
    playComplete();
    const maxQ = difficulty === "easy" ? 20 : difficulty === "medium" ? 15 : 12;
    if (sc >= maxQ) triggerCelebration(3);
    setTimeout(() => {
      onComplete(sc, maxQ);
    }, 800);
  }, [difficulty, onComplete]);

  const start = () => {
    setPhase("playing");
    setIdx(0);
    setInput("");
    setScore(0);
    scoreRef.current = 0;
    setTotal(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    inputRef.current?.focus();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame(scoreRef.current);
          return 0;
        }
        if (t <= 10) playTick();
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const submit = useCallback(() => {
    if (phase !== "playing") return;
    const problem = problems[idx % problems.length];
    const ans = parseFloat(input.trim());
    const correct = Math.abs(ans - problem.answer) < 0.01;

    setTotal((t) => t + 1);
    setFlash(correct ? "correct" : "wrong");
    setTimeout(() => setFlash(null), 300);

    if (correct) {
      playCorrect();
      const newScore = score + 1;
      const newCombo = combo + 1;
      setScore(newScore);
      scoreRef.current = newScore;
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));
      if (newCombo >= 10 && newCombo % 5 === 0) triggerCelebration(2, newCombo);
      else triggerCelebration(1, newCombo);
    } else {
      playWrong();
      setCombo(0);
    }
    setIdx((i) => i + 1);
    setInput("");
    inputRef.current?.focus();
  }, [phase, problems, idx, input, score, combo]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  const current = problems[idx % problems.length];
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {phase === "ready" && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="text-5xl">⚡</div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-fg">Speed Math</p>
            <p className="text-sm text-muted mt-1">ตอบโจทย์คณิตศาสตร์ให้ได้มากที่สุดใน {GAME_DURATION} วินาที</p>
            <p className="text-xs text-muted mt-1">ระดับ: {difficulty === "easy" ? "ง่าย" : difficulty === "medium" ? "กลาง" : "ยาก"}</p>
          </div>
          <button
            onClick={start}
            className="rounded-2xl bg-gradient-to-r from-brand to-brand2 px-8 py-3 text-lg font-extrabold text-white shadow-lg shadow-brand/30 hover:brightness-110 transition"
          >
            เริ่มเลย!
          </button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-brand">✅ {score}</span>
            {combo >= 3 && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-500"
              >
                🔥 Combo ×{combo}
              </motion.span>
            )}
            <span className={`font-bold tabular-nums ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-fg"}`}>
              ⏱ {timeLeft}s
            </span>
          </div>

          {/* Timer bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
            <motion.div
              className={`h-full rounded-full transition-colors ${timeLeft <= 10 ? "bg-red-400" : "bg-brand"}`}
              animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Problem */}
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className={`rounded-3xl p-6 text-center transition-colors duration-150 ${
                flash === "correct"
                  ? "bg-emerald-500/20"
                  : flash === "wrong"
                  ? "bg-red-500/20"
                  : "glass"
              }`}
            >
              <p className="text-3xl font-extrabold text-fg tabular-nums">{current?.question}</p>
            </motion.div>
          </AnimatePresence>

          {/* Input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              type="number"
              inputMode="numeric"
              placeholder="พิมพ์คำตอบ..."
              className="flex-1 rounded-xl border border-line bg-surface2 px-4 py-3 text-center text-xl font-bold text-fg outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
              autoComplete="off"
            />
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={submit}
              className="rounded-xl bg-gradient-to-r from-brand to-brand2 px-5 py-3 font-bold text-white shadow shadow-brand/30"
            >
              ↵
            </motion.button>
          </div>

          <p className="text-center text-xs text-muted">แตะ Enter หรือปุ่ม ↵ เพื่อส่งคำตอบ</p>
        </>
      )}

      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <div className="text-5xl">🏁</div>
          <p className="text-2xl font-extrabold text-fg">หมดเวลา!</p>

          <div className="grid grid-cols-3 gap-3 w-full">
            {[
              { label: "ถูกต้อง", value: score, color: "text-emerald-400" },
              { label: "ความแม่นยำ", value: `${accuracy}%`, color: "text-brand" },
              { label: "Combo สูงสุด", value: `×${maxCombo}`, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-3 text-center">
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted">
            {score >= 15 ? "เทพ! ⚡" : score >= 10 ? "เก่งมาก! 🔥" : score >= 5 ? "ดี! 👍" : "ฝึกอีกหน่อยนะ 💪"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
