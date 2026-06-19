import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StudentLevel } from "../../types";
import { playCorrect, playWrong, playComplete, shuffle } from "./gameUtils";
import { triggerCelebration } from "./CelebrationEffects";

interface Props {
  level: StudentLevel;
  onComplete: (score: number, max: number) => void;
}

interface Tile {
  id: string;
  display: string;
  value: number;
  pairId: string;
  matched: boolean;
  selected: boolean;
  wrong: boolean;
}

// ─── โจทย์ตามระดับ ──────────────────────────────────────────────
function generateProblems(level: StudentLevel, count: number): { question: string; answer: number }[] {
  const problems: { question: string; answer: number }[] = [];

  const add = (q: string, a: number) => problems.push({ question: q, answer: a });

  if (level === "pratom1") {
    // บวกลบ 1-10
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(Math.random() * 5) + 1;
      const b = Math.floor(Math.random() * 5) + 1;
      if (Math.random() > 0.5) add(`${a} + ${b}`, a + b);
      else { const big = Math.max(a, b), small = Math.min(a, b); add(`${big} - ${small}`, big - small); }
    }
  } else if (level === "pratom2") {
    // บวกลบ 1-20, คูณ table 2-5
    for (let i = 0; i < 40; i++) {
      const r = Math.random();
      if (r < 0.4) { const a = Math.floor(Math.random() * 10) + 1; const b = Math.floor(Math.random() * 10) + 1; add(`${a} + ${b}`, a + b); }
      else if (r < 0.7) { const a = Math.floor(Math.random() * 10) + 5; const b = Math.floor(Math.random() * a) + 1; add(`${a} - ${b}`, a - b); }
      else { const a = Math.floor(Math.random() * 4) + 2; const b = Math.floor(Math.random() * 5) + 1; add(`${a} × ${b}`, a * b); }
    }
  } else if (level === "matayom1") {
    // คูณหาร พหุนาม
    for (let i = 0; i < 40; i++) {
      const r = Math.random();
      if (r < 0.3) { const a = Math.floor(Math.random() * 9) + 2; const b = Math.floor(Math.random() * 9) + 2; add(`${a} × ${b}`, a * b); }
      else if (r < 0.5) { const b = Math.floor(Math.random() * 9) + 2; const q = Math.floor(Math.random() * 9) + 2; add(`${b * q} ÷ ${b}`, q); }
      else if (r < 0.7) { const a = Math.floor(Math.random() * 15) + 2; const b = Math.floor(Math.random() * 15) + 2; add(`${a} + ${b}`, a + b); }
      else { const a = Math.floor(Math.random() * 50) + 10; const b = Math.floor(Math.random() * a) + 1; add(`${a} - ${b}`, a - b); }
    }
  } else if (level === "matayom2") {
    // สมการ กำลังสอง เปอร์เซ็นต์
    for (let i = 0; i < 40; i++) {
      const r = Math.random();
      if (r < 0.3) { const x = Math.floor(Math.random() * 8) + 2; add(`x² เมื่อ x=${x}`, x * x); }
      else if (r < 0.5) { const a = Math.floor(Math.random() * 12) + 3; const b = Math.floor(Math.random() * 10) + 1; add(`${a}² - ${b}²`, a * a - b * b); }
      else if (r < 0.7) { const p = [10, 20, 25, 50][Math.floor(Math.random() * 4)]; const n = [100, 200, 400, 80][Math.floor(Math.random() * 4)]; add(`${p}% × ${n}`, p * n / 100); }
      else { const a = Math.floor(Math.random() * 20) + 5; const b = Math.floor(Math.random() * 4) + 2; add(`${a} × ${b}`, a * b); }
    }
  } else {
    // ป.ตรี: log, power, ลิมิต
    const uniProbs = [
      { question: "2⁸", answer: 256 }, { question: "3⁴", answer: 81 }, { question: "5³", answer: 125 },
      { question: "log₁₀(1000)", answer: 3 }, { question: "log₂(64)", answer: 6 }, { question: "log₂(32)", answer: 5 },
      { question: "√144", answer: 12 }, { question: "√225", answer: 15 }, { question: "√196", answer: 14 },
      { question: "2¹⁰", answer: 1024 }, { question: "7²", answer: 49 }, { question: "6³", answer: 216 },
      { question: "log₂(128)", answer: 7 }, { question: "4³", answer: 64 }, { question: "9²", answer: 81 },
      { question: "11²", answer: 121 }, { question: "12²", answer: 144 }, { question: "13²", answer: 169 },
      { question: "√289", answer: 17 }, { question: "√361", answer: 19 },
    ];
    return shuffle(uniProbs).slice(0, count);
  }

  // deduplicate by answer
  const seen = new Map<number, string>();
  const result: { question: string; answer: number }[] = [];
  for (const p of shuffle(problems)) {
    if (!seen.has(p.answer) && result.length < count) {
      seen.set(p.answer, p.question);
      result.push(p);
    }
  }
  return result;
}

// ─── หน้าเกม ─────────────────────────────────────────────────────
const PAIRS_PER_ROUND = 6; // 6 คู่ = 12 ไพ่
const TOTAL_ROUNDS = 3;

export default function NumberMatch({ level, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const advancingRef = useRef(false); // กันไม่ให้ตั้ง timeout ซ้ำ + กัน cleanup ยกเลิก timeout

  const generateTiles = useCallback(() => {
    const problems = generateProblems(level, PAIRS_PER_ROUND);
    const raw: Tile[] = [];
    problems.forEach((p, i) => {
      const pairId = `pair-${i}`;
      raw.push({ id: `q-${i}`, display: p.question, value: p.answer, pairId, matched: false, selected: false, wrong: false });
      raw.push({ id: `a-${i}`, display: String(p.answer), value: p.answer, pairId, matched: false, selected: false, wrong: false });
    });
    setTiles(shuffle(raw));
    setSelected(null);
    advancingRef.current = false;
  }, [level]);

  useEffect(() => { generateTiles(); }, [generateTiles]);

  const matchedCount = tiles.filter((t) => t.matched).length;
  const totalTiles = tiles.length;
  const roundDone = matchedCount === totalTiles && totalTiles > 0;

  useEffect(() => {
    if (!roundDone || advancingRef.current) return;
    advancingRef.current = true;
    playComplete();
    triggerCelebration(2, 4);
    const t = setTimeout(() => {
      setScore(round + 1);
      if (round + 1 >= TOTAL_ROUNDS) {
        onComplete(TOTAL_ROUNDS, TOTAL_ROUNDS);
      } else {
        setRound((r) => r + 1);
        generateTiles();
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [roundDone, round, generateTiles, onComplete]);

  const handleTap = (id: string) => {
    if (tiles.find((t) => t.id === id)?.matched) return;

    if (!selected) {
      setTiles((prev) => prev.map((t) => t.id === id ? { ...t, selected: true } : t));
      setSelected(id);
      return;
    }

    if (selected === id) {
      setTiles((prev) => prev.map((t) => t.id === id ? { ...t, selected: false } : t));
      setSelected(null);
      return;
    }

    const sel = tiles.find((t) => t.id === selected)!;
    const cur = tiles.find((t) => t.id === id)!;

    if (sel.pairId === cur.pairId) {
      // คู่ที่ถูกต้อง
      playCorrect();
      triggerCelebration(1);
      setTiles((prev) =>
        prev.map((t) =>
          t.id === selected || t.id === id
            ? { ...t, matched: true, selected: false }
            : t
        )
      );
      setSelected(null);
    } else {
      // ผิด
      playWrong();
      setTiles((prev) =>
        prev.map((t) =>
          t.id === selected || t.id === id
            ? { ...t, wrong: true, selected: false }
            : t
        )
      );
      setSelected(null);
      setTimeout(() => {
        setTiles((prev) => prev.map((t) => ({ ...t, wrong: false })));
      }, 600);
    }
  };

  const pairs = PAIRS_PER_ROUND;
  const matched = matchedCount / 2;

  return (
    <div className="flex flex-col gap-4 text-fg">
      {/* Header */}
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-muted">รอบ {round + 1}/{TOTAL_ROUNDS}</span>
        <span className="text-brand">⭐ {score}</span>
        <span className="text-muted">{matched}/{pairs} คู่</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-brand"
          animate={{ width: `${(matched / pairs) * 100}%` }}
          transition={{ type: "spring", stiffness: 120 }}
        />
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <AnimatePresence>
          {tiles.map((tile) => (
            <motion.button
              key={tile.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: tile.matched ? 0.85 : tile.selected ? 1.05 : 1,
                opacity: tile.matched ? 0.4 : 1,
              }}
              whileTap={{ scale: 0.92 }}
              onClick={() => !tile.matched && handleTap(tile.id)}
              className={`relative min-h-[60px] rounded-2xl p-2 text-center text-sm font-bold transition select-none ${
                tile.matched
                  ? "bg-emerald-500/20 text-emerald-500 cursor-default"
                  : tile.wrong
                  ? "bg-rose-500/20 text-rose-500 ring-2 ring-rose-500"
                  : tile.selected
                  ? "bg-brand text-white ring-2 ring-brand shadow-lg shadow-brand/30"
                  : "bg-surface2 text-fg hover:bg-brand/10 hover:text-brand cursor-pointer"
              }`}
            >
              {tile.matched && (
                <span className="absolute inset-0 flex items-center justify-center text-lg">✓</span>
              )}
              <span className={tile.matched ? "opacity-0" : ""}>{tile.display}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {roundDone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-emerald-500/15 p-4 text-center text-emerald-400"
        >
          <p className="text-xl font-extrabold">🎉 จับคู่ครบแล้ว!</p>
          <p className="text-sm mt-1">กำลังไปรอบถัดไป...</p>
        </motion.div>
      )}

      <p className="text-center text-xs text-muted">กดไพ่โจทย์ แล้วกดไพ่คำตอบที่ตรงกัน</p>
    </div>
  );
}
