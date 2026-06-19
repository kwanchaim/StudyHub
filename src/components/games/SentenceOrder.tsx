import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SENTENCES, type GameDifficulty } from "../../data/gameContent";
import { Button } from "../ui";
import { playWrong, playComplete, pickRandom, shuffle } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";
import EmptyPool from "./EmptyPool";

const DESIRED = 5;

interface Props {
  difficulty: GameDifficulty;
  onComplete: (score: number, max: number) => void;
}

export default function SentenceOrder({ difficulty, onComplete }: Props) {
  const [pool] = useState(() => pickRandom(SENTENCES.filter((s) => s.difficulty === difficulty), DESIRED));
  const TOTAL = pool.length;
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"playing" | "correct" | "wrong">("playing");

  const current = pool[round];
  const [available, setAvailable] = useState<string[]>(() => shuffle(pool[0]?.words ?? []));
  const [placed, setPlaced] = useState<string[]>([]);

  const resetRound = useCallback((idx: number) => {
    setAvailable(shuffle(pool[idx]?.words ?? []));
    setPlaced([]);
    setPhase("playing");
  }, [pool]);

  const placeWord = (word: string, fromIdx: number) => {
    if (phase !== "playing") return;
    const newAvail = [...available];
    newAvail.splice(fromIdx, 1);
    const newPlaced = [...placed, word];
    setAvailable(newAvail);
    setPlaced(newPlaced);

    if (newPlaced.length === current.words.length) {
      const correct = newPlaced.join(" ") === current.words.join(" ");
      if (correct) {
        playComplete();
        triggerCelebration(1);
        setPhase("correct");
        setScore((s) => s + 1);
      } else {
        playWrong();
        setPhase("wrong");
      }
    }
  };

  const removePlaced = (idx: number) => {
    if (phase !== "playing") return;
    const word = placed[idx];
    const newPlaced = [...placed];
    newPlaced.splice(idx, 1);
    setPlaced(newPlaced);
    setAvailable((prev) => [...prev, word]);
  };

  const nextRound = () => {
    if (round + 1 >= TOTAL) {
      if (score >= TOTAL) triggerCelebration(3);
      onComplete(score, TOTAL);
      return;
    }
    const next = round + 1;
    setRound(next);
    resetRound(next);
  };

  if (TOTAL === 0) return <EmptyPool onComplete={onComplete} />;
  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-muted">ข้อ {round + 1}/{TOTAL}</span>
        <span className="text-brand">⭐ {score}</span>
      </div>

      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-xs text-muted mb-1">คำใบ้:</p>
        <p className="font-semibold text-fg">{current.hint}</p>
      </div>

      {/* Answer area */}
      <div className="min-h-16 rounded-2xl border-2 border-dashed border-line bg-surface/40 p-3">
        <p className="text-xs text-muted mb-2">ประโยคที่เรียง (แตะเพื่อถอน):</p>
        <div className="flex flex-wrap gap-1.5">
          {placed.map((w, i) => (
            <motion.button
              key={`p-${i}-${w}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => removePlaced(i)}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                phase === "correct"
                  ? "bg-emerald-500 text-white"
                  : phase === "wrong"
                  ? "bg-red-500 text-white"
                  : "bg-brand text-white"
              }`}
            >
              {w}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Word bank */}
      <div>
        <p className="text-xs text-muted mb-2">คลังคำ (แตะเพื่อวาง):</p>
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence>
            {available.map((w, i) => (
              <motion.button
                key={`a-${i}-${w}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => placeWord(w, i)}
                disabled={phase !== "playing"}
                className="rounded-lg bg-surface2 px-2.5 py-1.5 text-sm font-semibold text-fg hover:bg-brand/20 hover:text-brand transition"
              >
                {w}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {phase !== "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 text-center ${
              phase === "correct" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            <p className="text-xl font-extrabold">{phase === "correct" ? "🎉 ถูกต้อง!" : "❌ ผิด"}</p>
            {phase === "wrong" && (
              <p className="text-sm mt-1">
                คำตอบ: <span className="font-bold">{current.words.join(" ")}</span>
              </p>
            )}
            <Button className="mt-3" size="sm" onClick={nextRound}>
              {round + 1 < TOTAL ? "ข้อถัดไป →" : "ดูผลลัพธ์"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
