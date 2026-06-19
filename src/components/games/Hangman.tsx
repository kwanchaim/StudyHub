import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VOCAB, type VocabCategory, type GameDifficulty } from "../../data/gameContent";
import { Button } from "../ui";
import { playCorrect, playWrong, playComplete, shuffle } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";
import EmptyPool from "./EmptyPool";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_WRONG = 6;
const TOTAL_ROUNDS = 5;

interface Props {
  category: VocabCategory;
  difficulty: GameDifficulty;
  onComplete: (score: number, max: number) => void;
}

function HangmanSVG({ errors }: { errors: number }) {
  return (
    <svg viewBox="0 0 110 130" className="w-28 h-36 mx-auto">
      {/* Gallows */}
      <line x1="10" y1="125" x2="100" y2="125" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="125" x2="30" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="8" x2="72" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="72" y1="8" x2="72" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Parts appear with animation */}
      {errors >= 1 && <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} cx="72" cy="31" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" />}
      {errors >= 2 && <motion.line initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: "72px 40px" }} x1="72" y1="40" x2="72" y2="75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
      {errors >= 3 && <motion.line initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} x1="72" y1="50" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
      {errors >= 4 && <motion.line initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} x1="72" y1="50" x2="89" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
      {errors >= 5 && <motion.line initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} x1="72" y1="75" x2="57" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
      {errors >= 6 && <motion.line initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} x1="72" y1="75" x2="87" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

export default function Hangman({ category, difficulty, onComplete }: Props) {
  const pool = shuffle(VOCAB.filter((v) => v.category === category && v.difficulty === difficulty));
  const [poolRef] = useState(pool);
  const [round, setRound] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [resolved, setResolved] = useState(false);

  const current = poolRef[round % poolRef.length];
  const word = current?.word.toUpperCase() ?? "";
  const meaning = current?.meaning ?? "";

  const wrong = [...guessed].filter((l) => !word.includes(l)).length;
  const won = word.length > 0 && word.split("").every((l) => guessed.has(l));
  const lost = wrong >= MAX_WRONG;
  const over = won || lost;

  useEffect(() => {
    if (!over || resolved) return;
    setResolved(true);
    if (won) {
      playComplete();
      setScore((s) => s + 1);
      triggerCelebration(2, 5);
    } else {
      playWrong();
    }
  }, [over, won, resolved]);

  const nextRound = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      onComplete(score + (won ? 1 : 0), TOTAL_ROUNDS);
      return;
    }
    setRound((r) => r + 1);
    setGuessed(new Set());
    setResolved(false);
  }, [round, score, won, onComplete]);

  const guess = (letter: string) => {
    if (guessed.has(letter) || over) return;
    setGuessed((prev) => new Set([...prev, letter]));
    if (word.includes(letter)) { playCorrect(); triggerCelebration(1); }
    else playWrong();
  };

  if (poolRef.length === 0) return <EmptyPool onComplete={onComplete} />;

  return (
    <div className="flex flex-col items-center gap-4 text-fg">
      {/* Header */}
      <div className="flex w-full items-center justify-between text-sm font-semibold">
        <span className="text-muted">รอบ {round + 1}/{TOTAL_ROUNDS}</span>
        <span className="text-brand">⭐ {score}</span>
        <span className="text-red-400">ผิด {wrong}/{MAX_WRONG}</span>
      </div>

      <HangmanSVG errors={wrong} />

      {/* Word blanks */}
      <div className="flex flex-wrap justify-center gap-2">
        {word.split("").map((l, i) => (
          <div key={i} className="flex h-10 w-8 flex-col items-center justify-end">
            <AnimatePresence>
              {guessed.has(l) && (
                <motion.span
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-lg font-extrabold text-brand"
                >
                  {l}
                </motion.span>
              )}
            </AnimatePresence>
            <div className="mt-1 h-0.5 w-full rounded-full bg-fg/40" />
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted">
        💡 ความหมาย: <span className="font-semibold text-fg">{meaning}</span>
      </p>

      {/* Keyboard */}
      <div className="flex flex-wrap justify-center gap-2 max-w-sm">
        {ALPHABET.map((l) => {
          const isGuessed = guessed.has(l);
          const isCorrect = isGuessed && word.includes(l);
          const isWrong = isGuessed && !word.includes(l);
          return (
            <motion.button
              key={l}
              whileTap={{ scale: 0.85 }}
              onClick={() => guess(l)}
              disabled={isGuessed || over}
              className={`h-11 w-11 rounded-xl text-sm font-bold transition select-none ${
                isCorrect
                  ? "bg-emerald-500 text-white"
                  : isWrong
                  ? "bg-red-400/20 text-red-400 line-through opacity-50"
                  : "bg-surface2 text-fg hover:bg-brand hover:text-white active:scale-90 disabled:opacity-30"
              }`}
            >
              {l}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {over && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full rounded-2xl p-4 text-center ${
              won ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            <p className="text-xl font-extrabold">{won ? "🎉 ถูกต้อง!" : "💀 หมดโอกาส"}</p>
            {lost && (
              <p className="mt-1 text-sm">
                คำตอบคือ: <span className="font-bold">{word}</span>
              </p>
            )}
            <Button className="mt-3" size="sm" onClick={nextRound}>
              {round + 1 < TOTAL_ROUNDS ? "รอบถัดไป →" : "ดูผลลัพธ์"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
