import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VOCAB, type VocabCategory, type GameDifficulty } from "../../data/gameContent";
import { Button } from "../ui";
import { playCorrect, playWrong, playComplete, shuffle } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";
import EmptyPool from "./EmptyPool";

interface CardData {
  id: string;
  pairId: string;
  text: string;
  type: "word" | "meaning";
  matched: boolean;
  flipped: boolean;
}

interface Props {
  category: VocabCategory;
  difficulty: GameDifficulty;
  onComplete: (score: number, max: number) => void;
}

function buildDeck(category: VocabCategory, difficulty: GameDifficulty): CardData[] {
  const pool = shuffle(VOCAB.filter((v) => v.category === category && v.difficulty === difficulty)).slice(0, 6);
  const cards: CardData[] = [];
  pool.forEach((v, i) => {
    const pairId = `pair-${i}`;
    cards.push({ id: `w-${i}`, pairId, text: v.word, type: "word", matched: false, flipped: false });
    cards.push({ id: `m-${i}`, pairId, text: v.meaning, type: "meaning", matched: false, flipped: false });
  });
  return shuffle(cards);
}

export default function MemoryCards({ category, difficulty, onComplete }: Props) {
  const [cards, setCards] = useState<CardData[]>(() => buildDeck(category, difficulty));
  const [selected, setSelected] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [locked, setLocked] = useState(false);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const completeRef = useRef(false);

  const total = cards.length / 2;

  const flip = useCallback((id: string) => {
    if (locked) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped) return;

    const next = cards.map((c) => c.id === id ? { ...c, flipped: true } : c);
    setCards(next);

    if (!selected) {
      setSelected(id);
      return;
    }

    // second card selected
    const first = next.find((c) => c.id === selected)!;
    const second = next.find((c) => c.id === id)!;
    setMoves((m) => m + 1);
    setSelected(null);
    setLocked(true);

    if (first.pairId === second.pairId) {
      playCorrect();
      triggerCelebration(1);
      setCards((prev) => prev.map((c) => c.pairId === first.pairId ? { ...c, matched: true } : c));
      const newMatches = matches + 1;
      setMatches(newMatches);
      setLocked(false);
      if (newMatches === total && !completeRef.current) {
        completeRef.current = true;
        playComplete();
        triggerCelebration(3);
        setTimeout(() => onComplete(total, total), 600);
      }
    } else {
      playWrong();
      setWrongPair([selected, id]);
      setTimeout(() => {
        setCards((prev) => prev.map((c) => (c.id === first.id || c.id === second.id) ? { ...c, flipped: false } : c));
        setWrongPair(null);
        setLocked(false);
      }, 900);
    }
  }, [cards, selected, locked, matches, total, onComplete]);

  const restart = () => {
    setCards(buildDeck(category, difficulty));
    setSelected(null);
    setMoves(0);
    setMatches(0);
    setLocked(false);
    setWrongPair(null);
    completeRef.current = false;
  };

  if (total === 0) return <EmptyPool onComplete={onComplete} />;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm font-semibold">
        <span className="text-muted">จับคู่ {matches}/{total}</span>
        <span className="text-brand">ครั้งที่พลิก: {moves}</span>
        <Button size="sm" variant="ghost" onClick={restart}>เริ่มใหม่</Button>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
        {cards.map((card) => {
          const isSelected = selected === card.id;
          const isWrong = wrongPair?.includes(card.id) ?? false;
          return (
            <motion.button
              key={card.id}
              onClick={() => flip(card.id)}
              whileTap={{ scale: 0.95 }}
              disabled={card.matched || card.flipped || locked}
              className="relative aspect-square"
            >
              <motion.div
                animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                style={{ transformStyle: "preserve-3d", position: "relative", width: "100%", height: "100%" }}
              >
                {/* Back face */}
                <div
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-white text-xl font-bold shadow-lg"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  ?
                </div>
                {/* Front face */}
                <div
                  className={`absolute inset-0 rounded-xl flex items-center justify-center p-1 text-center text-[10px] font-semibold shadow-lg ${
                    card.matched
                      ? "bg-emerald-500 text-white"
                      : isWrong
                      ? "bg-red-500 text-white"
                      : isSelected
                      ? "bg-brand text-white"
                      : card.type === "word"
                      ? "bg-violet-500 text-white"
                      : "bg-cyan-500 text-white"
                  }`}
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {card.text}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {matches === total && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-2xl font-extrabold text-emerald-400">🎊 ครบทุกคู่!</p>
            <p className="text-sm text-muted mt-1">ใช้ {moves} ครั้ง</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
