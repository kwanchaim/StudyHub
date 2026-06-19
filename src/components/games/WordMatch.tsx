import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VOCAB, type VocabCategory, type GameDifficulty } from "../../data/gameContent";
import { playCorrect, playWrong, playComplete, shuffle, pickRandom } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";

const PAIR_COUNT = 6;

interface Pair { word: string; meaning: string; id: number; }

interface Props {
  category: VocabCategory;
  difficulty: GameDifficulty;
  onComplete: (score: number, max: number) => void;
}

function buildPairs(category: VocabCategory, difficulty: GameDifficulty): Pair[] {
  return pickRandom(VOCAB.filter((v) => v.category === category && v.difficulty === difficulty), PAIR_COUNT)
    .map((v, i) => ({ word: v.word, meaning: v.meaning, id: i }));
}

export default function WordMatch({ category, difficulty, onComplete }: Props) {
  const [pairs] = useState(() => buildPairs(category, difficulty));
  const [wordOrder] = useState(() => shuffle(pairs.map((p) => p.id)));
  const [meaningOrder] = useState(() => shuffle(pairs.map((p) => p.id)));
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [selWord, setSelWord] = useState<number | null>(null);
  const [selMeaning, setSelMeaning] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const doneRef = { current: false };

  const check = useCallback((wordId: number, meaningId: number) => {
    if (wordId === meaningId) {
      playCorrect();
      triggerCelebration(1);
      const next = new Set(matched);
      next.add(wordId);
      setMatched(next);
      setSelWord(null);
      setSelMeaning(null);
      if (next.size === PAIR_COUNT && !doneRef.current) {
        doneRef.current = true;
        playComplete();
        if (errors === 0) triggerCelebration(3);
        setTimeout(() => onComplete(PAIR_COUNT - errors, PAIR_COUNT), 700);
      }
    } else {
      playWrong();
      setErrors((e) => e + 1);
      setWrong(new Set([wordId, meaningId]));
      setTimeout(() => {
        setWrong(new Set());
        setSelWord(null);
        setSelMeaning(null);
      }, 700);
    }
  }, [matched, errors, onComplete]);

  const tapWord = (id: number) => {
    if (matched.has(id)) return;
    setSelWord(id);
    if (selMeaning !== null) check(id, selMeaning);
  };

  const tapMeaning = (id: number) => {
    if (matched.has(id)) return;
    setSelMeaning(id);
    if (selWord !== null) check(selWord, id);
  };

  const score = PAIR_COUNT - errors;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-muted">จับคู่ {matched.size}/{PAIR_COUNT}</span>
        <span className={errors > 0 ? "text-red-400" : "text-brand"}>ผิด: {errors}</span>
        <span className="text-brand">คะแนน: {Math.max(0, score)}</span>
      </div>

      <p className="text-xs text-muted text-center">กดคำทางซ้าย แล้วกดความหมายทางขวาเพื่อจับคู่</p>

      <div className="grid grid-cols-2 gap-2">
        {/* Words column */}
        <div className="flex flex-col gap-2">
          {wordOrder.map((id) => {
            const pair = pairs[id];
            const isMatched = matched.has(id);
            const isSel = selWord === id;
            const isWrong = wrong.has(id);
            return (
              <motion.button
                key={`w-${id}`}
                whileTap={{ scale: 0.96 }}
                onClick={() => !isMatched && tapWord(id)}
                disabled={isMatched}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition ${
                  isMatched
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : isWrong
                    ? "bg-red-500/20 text-red-400"
                    : isSel
                    ? "bg-brand text-white shadow-lg shadow-brand/30"
                    : "bg-surface2 text-fg hover:bg-brand/15 hover:text-brand"
                }`}
              >
                {pair.word}
              </motion.button>
            );
          })}
        </div>
        {/* Meanings column */}
        <div className="flex flex-col gap-2">
          {meaningOrder.map((id) => {
            const pair = pairs[id];
            const isMatched = matched.has(id);
            const isSel = selMeaning === id;
            const isWrong = wrong.has(id);
            return (
              <motion.button
                key={`m-${id}`}
                whileTap={{ scale: 0.96 }}
                onClick={() => !isMatched && tapMeaning(id)}
                disabled={isMatched}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition ${
                  isMatched
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : isWrong
                    ? "bg-red-500/20 text-red-400"
                    : isSel
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                    : "bg-surface2 text-fg hover:bg-cyan-500/15 hover:text-cyan-500"
                }`}
              >
                {pair.meaning}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {matched.size === PAIR_COUNT && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center glass rounded-2xl p-4"
          >
            <p className="text-2xl font-extrabold text-emerald-400">🎊 จับคู่ครบ!</p>
            <p className="text-sm text-muted mt-1">ผิดไป {errors} ครั้ง</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
