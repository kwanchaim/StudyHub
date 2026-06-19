import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Star, Trophy, Zap } from "lucide-react";
import { useStore } from "../store";
import { Button, Card, SectionHeader } from "./ui";
import { saveHighScore, getBestScore, getAllScores } from "./games/gameUtils";
import { GlobalCelebrationLayer, triggerCelebration, CELEBRATE_EVENT, type CelebrationDetail } from "./games/CelebrationEffects";
import Hangman from "./games/Hangman";
import MemoryCards from "./games/MemoryCards";
import WordScramble from "./games/WordScramble";
import QuizFormulas from "./games/QuizFormulas";
import WordMatch from "./games/WordMatch";
import SentenceOrder from "./games/SentenceOrder";
import SpeedMath from "./games/SpeedMath";
import NumberMatch from "./games/NumberMatch";
import type { VocabCategory, GameDifficulty, FormulaSubject } from "../data/gameContent";
import type { StudentLevel } from "../types";
import { popPendingGame } from "../nav";

type GameId = "hangman" | "memory" | "scramble" | "quiz" | "match" | "sentence" | "speedmath" | "numbermatch";
type View = "hub" | "setup" | "playing" | "result";

interface GameDef {
  id: GameId;
  emoji: string;
  name: string;
  desc: string;
  tags: string[];
  needsCategory: boolean;
  needsSubject: boolean;
  needsLevel?: boolean;
}

const GAMES: GameDef[] = [
  { id: "hangman",     emoji: "🪢", name: "แฮงแมน",           desc: "ทายตัวอักษรทีละตัว ก่อนหุ่นถูกแขวน!", tags: ["คำศัพท์", "ตัวอักษร"], needsCategory: true,  needsSubject: false },
  { id: "memory",      emoji: "🃏", name: "จำไพ่",             desc: "พลิกหาคู่คำ-ความหมายให้ครบ",           tags: ["ความจำ", "คำศัพท์"],    needsCategory: true,  needsSubject: false },
  { id: "numbermatch", emoji: "🔢", name: "จับคู่ตัวเลข",      desc: "จับคู่โจทย์กับคำตอบให้ครบก่อนเวลาหมด!", tags: ["คณิต", "ความจำ"],      needsCategory: false, needsSubject: false, needsLevel: true },
  { id: "speedmath",   emoji: "⚡", name: "Speed Math",        desc: "ตอบโจทย์คณิตให้ได้มากที่สุดใน 60 วิ",  tags: ["คณิต", "จับเวลา"],     needsCategory: false, needsSubject: false },
  { id: "match",       emoji: "🔗", name: "จับคู่คำ-ความหมาย", desc: "กดคำแล้วกดความหมายให้ตรงกัน",          tags: ["คำศัพท์", "จับคู่"],    needsCategory: true,  needsSubject: false },
  { id: "scramble",    emoji: "🔤", name: "Word Scramble",     desc: "เรียงตัวอักษรที่สับเรียงให้เป็นคำ",     tags: ["สะกดคำ", "คำศัพท์"],  needsCategory: true,  needsSubject: false },
  { id: "quiz",        emoji: "📐", name: "ควิซสูตร",          desc: "ทายว่าสูตรนี้คืออะไร? จับเวลา!",       tags: ["สูตร", "คณิต/วิทย์"],  needsCategory: false, needsSubject: true },
  { id: "sentence",    emoji: "📝", name: "เรียงประโยค",       desc: "เรียงคำให้เป็นประโยคที่ถูกต้อง",        tags: ["ประโยค", "ภาษา"],      needsCategory: false, needsSubject: false },
];

const CATEGORIES: { value: VocabCategory; label: string }[] = [
  { value: "daily",      label: "ชีวิตประจำวัน" },
  { value: "english",    label: "ภาษาอังกฤษ" },
  { value: "science",    label: "วิทยาศาสตร์" },
  { value: "academic",   label: "วิชาการ" },
  { value: "technology", label: "เทคโนโลยี" },
  { value: "business",   label: "ธุรกิจ" },
  { value: "medical",    label: "การแพทย์" },
];

const STUDENT_LEVELS: { value: StudentLevel; label: string; emoji: string; desc: string }[] = [
  { value: "pratom1",  label: "ประถมต้น",  emoji: "🌱", desc: "ป.1–3 · บวกลบ 1–10, คำง่าย" },
  { value: "pratom2",  label: "ประถมปลาย", emoji: "🌿", desc: "ป.4–6 · คูณหาร, คำศัพท์พื้นฐาน" },
  { value: "matayom1", label: "ม.ต้น",     emoji: "📗", desc: "ม.1–3 · พีชคณิต, ศัพท์วิชาการ" },
  { value: "matayom2", label: "ม.ปลาย",    emoji: "📘", desc: "ม.4–6 · แคลคูลัส, ศัพท์ขั้นสูง" },
  { value: "uni",      label: "ป.ตรี",     emoji: "🎓", desc: "มหาวิทยาลัย · ระดับยากสุด" },
];

const SUBJECTS: { value: FormulaSubject | "all"; label: string }[] = [
  { value: "all",       label: "ทั้งหมด" },
  { value: "calc",      label: "แคลคูลัส" },
  { value: "trig",      label: "ตรีโกณ" },
  { value: "algebra",   label: "พีชคณิต" },
  { value: "physics",   label: "ฟิสิกส์" },
  { value: "chemistry", label: "เคมี" },
];

// map student level → ความยากของคำ/โจทย์
function levelToDifficulty(level: StudentLevel): GameDifficulty {
  if (level === "pratom1" || level === "pratom2") return "easy";
  if (level === "matayom1") return "medium";
  return "hard"; // matayom2, uni
}

function xpForResult(score: number, difficulty: GameDifficulty): number {
  const perCorrect = difficulty === "easy" ? 5 : difficulty === "medium" ? 10 : 15;
  const base = difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;
  return base + score * perCorrect;
}

export default function Games() {
  const { award, celebrate, toast } = useStore();
  const [view, setView] = useState<View>("hub");
  const [activeGame, setActiveGame] = useState<GameDef | null>(null);
  const [category, setCategory] = useState<VocabCategory>("science");
  const [subject, setSubject] = useState<FormulaSubject | "all">("all");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [studentLevel, setStudentLevel] = useState<StudentLevel>("matayom2");
  const [result, setResult] = useState<{ score: number; max: number } | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const pending = popPendingGame();
    if (pending) {
      const game = GAMES.find((g) => g.id === pending);
      if (game) { setActiveGame(game); setView("setup"); }
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<CelebrationDetail>).detail?.level === 3) {
        setShaking(true);
        setTimeout(() => setShaking(false), 600);
      }
    };
    window.addEventListener(CELEBRATE_EVENT, handler);
    return () => window.removeEventListener(CELEBRATE_EVENT, handler);
  }, []);

  const openSetup = (game: GameDef) => { setActiveGame(game); setView("setup"); };

  const startGame = () => {
    // ระดับนักเรียนเป็นตัวกำหนดความยากของคำ/โจทย์
    setDifficulty(levelToDifficulty(studentLevel));
    setResult(null);
    setGameKey((k) => k + 1);
    setView("playing");
  };

  const handleComplete = (score: number, max: number) => {
    // max === 0 หมายถึงหมวด/ระดับนั้นไม่มีคำ (EmptyPool) — กลับฮับโดยไม่บันทึก
    if (max === 0) {
      backToHub();
      return;
    }
    setResult({ score, max });
    setView("result");
    if (activeGame) {
      saveHighScore({ gameId: activeGame.id, difficulty, score, maxScore: max, playedAt: Date.now() });
    }
    const xp = xpForResult(score, difficulty);
    award(xp);
    const pct = max > 0 ? score / max : 0;
    if (pct >= 0.8) {
      celebrate(true);
      triggerCelebration(3);
      toast({ emoji: "🏆", title: `เก่งมาก! +${xp} XP`, desc: `คะแนน ${score}/${max}` });
    } else {
      toast({ emoji: "⭐", title: `+${xp} XP`, desc: `คะแนน ${score}/${max}` });
    }
  };

  const backToHub = () => { setView("hub"); setActiveGame(null); setResult(null); };

  const allScores = getAllScores();
  const totalGamesPlayed = allScores.length;
  const totalXpFromGames = allScores.reduce((sum, s) => sum + xpForResult(s.score, s.difficulty as GameDifficulty), 0);

  return (
    <div>
      <GlobalCelebrationLayer />
      <AnimatePresence mode="wait">

        {/* ── HUB ── */}
        {view === "hub" && (
          <motion.div key="hub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SectionHeader title="เกมการเรียน" icon={<span>🎮</span>} />

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { icon: <Trophy size={18} />, label: "เกมที่เล่น", value: totalGamesPlayed, tone: "#a855f7" },
                { icon: <Star size={18} />, label: "XP จากเกม", value: totalXpFromGames, tone: "#f59e0b" },
                { icon: <Zap size={18} />, label: "เกมทั้งหมด", value: GAMES.length, tone: "#6366f1" },
              ].map((s) => (
                <Card key={s.label} className="flex flex-col items-center gap-2 !p-4 text-center">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-2xl"
                    style={{ backgroundColor: s.tone + "22", color: s.tone, boxShadow: `0 4px 12px ${s.tone}28` }}
                  >
                    {s.icon}
                  </span>
                  <p className="text-lg font-black text-fg">{s.value}</p>
                  <p className="text-xs font-semibold text-muted">{s.label}</p>
                </Card>
              ))}
            </div>

            {/* Game grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GAMES.map((game, i) => {
                const best = getBestScore(game.id, difficulty);
                return (
                  <motion.div key={game.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card onClick={() => openSetup(game)} className="!p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl"
                          style={{ background: "var(--c-surface2)" }}
                        >
                          {game.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-fg">{game.name}</p>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{game.desc}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {game.tags.map((t) => (
                              <span key={t} className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">{t}</span>
                            ))}
                          </div>
                          {best && <p className="mt-2 text-[11px] text-muted">🏅 สูงสุด: {best.score}/{best.maxScore}</p>}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── SETUP ── */}
        {view === "setup" && activeGame && (
          <motion.div key="setup" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <button onClick={backToHub} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg transition">
              <ArrowLeft size={16} /> กลับ
            </button>

            <Card className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <span className="text-5xl">{activeGame.emoji}</span>
                <p className="mt-2 text-xl font-extrabold text-fg">{activeGame.name}</p>
                <p className="text-sm text-muted">{activeGame.desc}</p>
              </div>

              <div className="flex flex-col gap-5">
                {/* ระดับนักเรียน — แสดงเสมอ */}
                <div>
                  <p className="text-sm font-semibold text-muted mb-2">ระดับนักเรียน</p>
                  <div className="grid grid-cols-1 gap-2">
                    {STUDENT_LEVELS.map((lv) => (
                      <button
                        key={lv.value}
                        onClick={() => setStudentLevel(lv.value)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          studentLevel === lv.value
                            ? "bg-gradient-to-r from-brand to-brand2 text-white shadow shadow-brand/30"
                            : "bg-surface2 text-muted hover:text-fg"
                        }`}
                      >
                        <span className="text-xl">{lv.emoji}</span>
                        <div>
                          <p className="text-sm font-bold leading-none">{lv.label}</p>
                          <p className={`text-[11px] mt-0.5 ${studentLevel === lv.value ? "text-white/70" : "text-muted"}`}>{lv.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* หมวดคำศัพท์ */}
                {activeGame.needsCategory && (
                  <div>
                    <p className="text-sm font-semibold text-muted mb-2">หมวดคำศัพท์</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setCategory(c.value)}
                          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            category === c.value
                              ? "bg-gradient-to-r from-brand to-brand2 text-white shadow shadow-brand/30"
                              : "bg-surface2 text-muted hover:text-fg"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* หมวดสูตร */}
                {activeGame.needsSubject && (
                  <div>
                    <p className="text-sm font-semibold text-muted mb-2">หมวดสูตร</p>
                    <div className="grid grid-cols-3 gap-2">
                      {SUBJECTS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setSubject(s.value)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            subject === s.value
                              ? "bg-gradient-to-r from-brand to-brand2 text-white shadow shadow-brand/30"
                              : "bg-surface2 text-muted hover:text-fg"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full" onClick={startGame}>เริ่มเกม!</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── PLAYING ── */}
        {view === "playing" && activeGame && (
          <motion.div key="playing" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="mb-4 flex items-center justify-between">
              <button onClick={backToHub} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg transition">
                <ArrowLeft size={16} /> ออก
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeGame.emoji}</span>
                <span className="font-bold text-fg">{activeGame.name}</span>
              </div>
              <span className="text-xs text-muted">
                {STUDENT_LEVELS.find((l) => l.value === studentLevel)?.label}
              </span>
            </div>

            <motion.div
              animate={shaking ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="max-w-md mx-auto">
                {activeGame.id === "hangman"     && <Hangman key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />}
                {activeGame.id === "memory"      && <MemoryCards key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />}
                {activeGame.id === "scramble"    && <WordScramble key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />}
                {activeGame.id === "quiz"        && <QuizFormulas key={gameKey} subject={subject} onComplete={handleComplete} />}
                {activeGame.id === "match"       && <WordMatch key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />}
                {activeGame.id === "sentence"    && <SentenceOrder key={gameKey} difficulty={difficulty} onComplete={handleComplete} />}
                {activeGame.id === "speedmath"   && <SpeedMath key={gameKey} difficulty={difficulty} onComplete={handleComplete} />}
                {activeGame.id === "numbermatch" && <NumberMatch key={gameKey} level={studentLevel} onComplete={handleComplete} />}
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {view === "result" && activeGame && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            <div className="text-6xl">{result.score / result.max >= 0.8 ? "🏆" : result.score / result.max >= 0.5 ? "🌟" : "💪"}</div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-fg">
                {result.score} <span className="text-muted text-xl">/ {result.max}</span>
              </p>
              <p className="text-muted text-sm mt-1">
                {result.score / result.max >= 0.8 ? "ยอดเยี่ยมมาก!" : result.score / result.max >= 0.5 ? "ดีมาก ฝึกต่อไป!" : "พยายามอีกหน่อยนะ!"}
              </p>
              <p className="text-brand font-bold mt-2 text-sm">+{xpForResult(result.score, difficulty)} XP ได้รับแล้ว!</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={backToHub}>เลือกเกมใหม่</Button>
              <Button onClick={startGame}>เล่นอีกรอบ</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
