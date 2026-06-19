import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VOCAB, type VocabCategory, type GameDifficulty } from "../../data/gameContent";
import { Button } from "../ui";
import { playWrong, playComplete, shuffle, pickRandom } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";

const TOTAL = 6;

interface Props {
  category: VocabCategory;
  difficulty: GameDifficulty;
  onComplete: (score: number, max: number) => void;
}

function scramble(word: string): string[] {
  const letters = word.toUpperCase().split("");
  let shuffled = shuffle(letters);
  // ensure it's actually scrambled
  let tries = 0;
  while (shuffled.join("") === word.toUpperCase() && tries < 10) {
    shuffled = shuffle(letters);
    tries++;
  }
  return shuffled;
}

export default function WordScramble({ category, difficulty, onComplete }: Props) {
  const [pool] = useState(() => pickRandom(VOCAB.filter((v) => v.category === category && v.difficulty === difficulty), TOTAL));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"playing" | "correct" | "wrong">("playing");

  const current = pool[round];
  const [tiles, setTiles] = useState<string[]>(() => scramble(pool[0]?.word ?? ""));
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array(pool[0]?.word.length ?? 0).fill(null));

  const resetRound = useCallback((idx: number) => {
    const w = pool[idx]?.word ?? "";
    setTiles(scramble(w));
    setPlaced(Array(w.length).fill(null));
    setPhase("playing");
  }, [pool]);

  const placeTile = (letter: string, tileIdx: number) => {
    if (phase !== "playing") return;
    const firstEmpty = placed.findIndex((p) => p === null);
    if (firstEmpty === -1) return;
    const newTiles = [...tiles];
    newTiles[tileIdx] = "";
    const newPlaced = [...placed];
    newPlaced[firstEmpty] = letter;
    setTiles(newTiles);
    setPlaced(newPlaced);

    const answer = newPlaced.join("").toUpperCase();
    const target = current.word.toUpperCase();
    if (!newPlaced.includes(null)) {
      if (answer === target) {
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
    const letter = placed[idx];
    if (!letter) return;
    const newPlaced = [...placed];
    newPlaced[idx] = null;
    setPlaced(newPlaced);
    const newTiles = [...tiles];
    const emptySlot = newTiles.findIndex((t) => t === "");
    if (emptySlot !== -1) newTiles[emptySlot] = letter;
    else newTiles.push(letter);
    setTiles(newTiles);
  };

  const clearPlaced = () => {
    const orig = scramble(current.word);
    setTiles(orig);
    setPlaced(Array(current.word.length).fill(null));
    setPhase("playing");
  };

  const nextRound = () => {
    if (round + 1 >= TOTAL) {
      playComplete();
      if (score >= TOTAL) triggerCelebration(3);
      onComplete(score, TOTAL);
      return;
    }
    const next = round + 1;
    setRound(next);
    resetRound(next);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between text-sm font-semibold">
        <span className="text-muted">ข้อ {round + 1}/{TOTAL}</span>
        <span className="text-brand">⭐ {score}</span>
      </div>

      <div className="glass rounded-2xl p-4 text-center w-full max-w-sm">
        <p className="text-xs text-muted mb-1">ความหมาย:</p>
        <p className="font-bold text-fg text-base">{current?.meaning}</p>
        <p className="text-xs text-muted mt-1">หมวด: {current?.category}</p>
      </div>

      {/* Answer slots */}
      <div className="flex gap-2 flex-wrap justify-center">
        {placed.map((l, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={() => removePlaced(i)}
            className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center font-extrabold text-sm transition ${
              l
                ? phase === "correct"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                  : phase === "wrong"
                  ? "border-red-400 bg-red-400/20 text-red-400"
                  : "border-brand bg-brand/15 text-brand"
                : "border-line bg-surface2 text-transparent"
            }`}
          >
            {l ?? "_"}
          </motion.button>
        ))}
      </div>

      {/* Tile bank */}
      <div className="flex gap-2 flex-wrap justify-center max-w-xs">
        {tiles.map((l, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={() => l && placeTile(l, i)}
            disabled={!l || phase !== "playing"}
            className={`h-10 w-10 rounded-xl font-extrabold text-sm transition ${
              l
                ? "bg-surface2 text-fg hover:bg-brand hover:text-white"
                : "opacity-0 pointer-events-none"
            }`}
          >
            {l}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={clearPlaced} disabled={phase !== "playing"}>
          ล้าง
        </Button>
      </div>

      <AnimatePresence>
        {phase !== "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-sm rounded-2xl p-4 text-center ${
              phase === "correct" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            <p className="text-xl font-extrabold">{phase === "correct" ? "🎉 ถูกต้อง!" : "❌ ผิด"}</p>
            {phase === "wrong" && (
              <p className="text-sm mt-1">
                คำตอบ: <span className="font-bold">{current.word.toUpperCase()}</span>
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
