import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Star, Trophy, Zap } from "lucide-react";
import { useStore } from "../store";
import { Button, Card, SectionHeader, Segmented } from "./ui";
import { saveHighScore, getBestScore, getAllScores } from "./games/gameUtils";
import { GlobalCelebrationLayer, triggerCelebration, CELEBRATE_EVENT, type CelebrationDetail } from "./games/CelebrationEffects";
import Hangman from "./games/Hangman";
import MemoryCards from "./games/MemoryCards";
import WordScramble from "./games/WordScramble";
import QuizFormulas from "./games/QuizFormulas";
import WordMatch from "./games/WordMatch";
import SentenceOrder from "./games/SentenceOrder";
import SpeedMath from "./games/SpeedMath";
import type { VocabCategory, GameDifficulty, FormulaSubject } from "../data/gameContent";
import { popPendingGame } from "../nav";

type GameId = "hangman" | "memory" | "scramble" | "quiz" | "match" | "sentence" | "speedmath";
type View = "hub" | "setup" | "playing" | "result";

interface GameDef {
  id: GameId;
  emoji: string;
  name: string;
  desc: string;
  tags: string[];
  needsCategory: boolean;
  needsSubject: boolean;
}

const GAMES: GameDef[] = [
  { id: "hangman", emoji: "🪢", name: "แฮงแมน", desc: "ทายตัวอักษรทีละตัว ก่อนหุ่นถูกแขวน!", tags: ["คำศัพท์", "ตัวอักษร"], needsCategory: true, needsSubject: false },
  { id: "memory", emoji: "🃏", name: "จำไพ่", desc: "พลิกหาคู่คำ-ความหมายให้ครบ", tags: ["ความจำ", "คำศัพท์"], needsCategory: true, needsSubject: false },
  { id: "scramble", emoji: "🔤", name: "Word Scramble", desc: "เรียงตัวอักษรที่สับเรียงให้เป็นคำ", tags: ["สะกดคำ", "คำศัพท์"], needsCategory: true, needsSubject: false },
  { id: "quiz", emoji: "📐", name: "ควิซสูตร", desc: "ทายว่าสูตรนี้คืออะไร? จับเวลา!", tags: ["สูตร", "คณิต/วิทย์"], needsCategory: false, needsSubject: true },
  { id: "match", emoji: "🔗", name: "จับคู่คำ-ความหมาย", desc: "กดคำแล้วกดความหมายให้ตรงกัน", tags: ["คำศัพท์", "จับคู่"], needsCategory: true, needsSubject: false },
  { id: "sentence", emoji: "📝", name: "เรียงประโยค", desc: "เรียงคำให้เป็นประโยคที่ถูกต้อง", tags: ["ประโยค", "ภาษา"], needsCategory: false, needsSubject: false },
  { id: "speedmath", emoji: "⚡", name: "Speed Math", desc: "ตอบโจทย์คณิตให้ได้มากที่สุดใน 60 วินาที", tags: ["คณิต", "จับเวลา"], needsCategory: false, needsSubject: false },
];

const CATEGORIES: { value: VocabCategory; label: string }[] = [
  { value: "science", label: "วิทยาศาสตร์" },
  { value: "business", label: "ธุรกิจ" },
  { value: "daily", label: "ชีวิตประจำวัน" },
  { value: "academic", label: "วิชาการ" },
  { value: "english", label: "ภาษาอังกฤษ" },
  { value: "technology", label: "เทคโนโลยี" },
  { value: "medical", label: "การแพทย์" },
];

const DIFFICULTIES: { value: GameDifficulty; label: string }[] = [
  { value: "easy", label: "ง่าย" },
  { value: "medium", label: "กลาง" },
  { value: "hard", label: "ยาก" },
];

const SUBJECTS: { value: FormulaSubject | "all"; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "calc", label: "แคลคูลัส" },
  { value: "trig", label: "ตรีโกณ" },
  { value: "algebra", label: "พีชคณิต" },
  { value: "physics", label: "ฟิสิกส์" },
  { value: "chemistry", label: "เคมี" },
];

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
  const [result, setResult] = useState<{ score: number; max: number } | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [shaking, setShaking] = useState(false);

  // รับ deep-link จาก Dashboard shortcut (sessionStorage)
  useEffect(() => {
    const pending = popPendingGame();
    if (pending) {
      const game = GAMES.find((g) => g.id === pending);
      if (game) { setActiveGame(game); setView("setup"); }
    }
  }, []);

  // Screen shake on level-3 celebration
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

  const openSetup = (game: GameDef) => {
    setActiveGame(game);
    setView("setup");
  };

  const startGame = () => {
    setResult(null);
    setGameKey((k) => k + 1);
    setView("playing");
  };

  const handleComplete = (score: number, max: number) => {
    setResult({ score, max });
    setView("result");

    // Save high score
    if (activeGame) {
      saveHighScore({
        gameId: activeGame.id,
        difficulty,
        score,
        maxScore: max,
        playedAt: Date.now(),
      });
    }

    // Award XP
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

  const backToHub = () => {
    setView("hub");
    setActiveGame(null);
    setResult(null);
  };

  // Leaderboard summary (top scores)
  const allScores = getAllScores();
  const totalGamesPlayed = allScores.length;
  const totalXpFromGames = allScores.reduce((sum, s) => sum + xpForResult(s.score, s.difficulty as GameDifficulty), 0);

  return (
    <div>
      <GlobalCelebrationLayer />
      <AnimatePresence mode="wait">
        {view === "hub" && (
          <motion.div key="hub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SectionHeader
              title="เกมการเรียน"
              icon={<span>🎮</span>}
            />

            {/* Stats row */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { icon: <Trophy size={18} />, label: "เกมที่เล่น", value: totalGamesPlayed },
                { icon: <Star size={18} />, label: "XP จากเกม", value: totalXpFromGames },
                { icon: <Zap size={18} />, label: "เกมทั้งหมด", value: GAMES.length },
              ].map((s) => (
                <Card key={s.label} className="flex flex-col items-center gap-1 !p-3 text-center">
                  <span className="text-brand">{s.icon}</span>
                  <p className="text-lg font-extrabold text-fg">{s.value}</p>
                  <p className="text-xs text-muted">{s.label}</p>
                </Card>
              ))}
            </div>

            {/* Game grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GAMES.map((game, i) => {
                const best = getBestScore(game.id, difficulty);
                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      onClick={() => openSetup(game)}
                      className="cursor-pointer hover:scale-[1.02] transition-transform duration-200 !p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{game.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-fg">{game.name}</p>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{game.desc}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {game.tags.map((t) => (
                              <span key={t} className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                                {t}
                              </span>
                            ))}
                          </div>
                          {best && (
                            <p className="mt-2 text-[11px] text-muted">
                              🏅 สูงสุด: {best.score}/{best.maxScore}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

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
                <div>
                  <p className="text-sm font-semibold text-muted mb-2">ระดับความยาก</p>
                  <Segmented options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
                </div>

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

                <Button className="w-full" onClick={startGame}>
                  เริ่มเกม!
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

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
                {difficulty === "easy" ? "ง่าย" : difficulty === "medium" ? "กลาง" : "ยาก"}
              </span>
            </div>

            <motion.div
              animate={shaking ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.5 }}
            >
            <Card className="max-w-md mx-auto">
              {activeGame.id === "hangman" && (
                <Hangman key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />
              )}
              {activeGame.id === "memory" && (
                <MemoryCards key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />
              )}
              {activeGame.id === "scramble" && (
                <WordScramble key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />
              )}
              {activeGame.id === "quiz" && (
                <QuizFormulas key={gameKey} subject={subject} onComplete={handleComplete} />
              )}
              {activeGame.id === "match" && (
                <WordMatch key={gameKey} category={category} difficulty={difficulty} onComplete={handleComplete} />
              )}
              {activeGame.id === "sentence" && (
                <SentenceOrder key={gameKey} difficulty={difficulty} onComplete={handleComplete} />
              )}
              {activeGame.id === "speedmath" && (
                <SpeedMath key={gameKey} difficulty={difficulty} onComplete={handleComplete} />
              )}
            </Card>
            </motion.div>
          </motion.div>
        )}

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
              <p className="text-brand font-bold mt-2 text-sm">
                +{xpForResult(result.score, difficulty)} XP ได้รับแล้ว!
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={backToHub}>
                เลือกเกมใหม่
              </Button>
              <Button onClick={startGame}>เล่นอีกรอบ</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
