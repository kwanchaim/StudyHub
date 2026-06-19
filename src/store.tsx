import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import type {
  Assignment,
  ChecklistItem,
  ClassSession,
  Deck,
  Exam,
  Flashcard,
  FocusLog,
  GameState,
  GradeCourse,
  Note,
  ThemeMode,
} from "./types";
import {
  initialGameState,
  seedAssignments,
  seedChecklist,
  seedDecks,
  seedExams,
  seedFlashcards,
  seedFocusLogs,
  seedGrades,
  seedNotes,
  seedSchedule,
  usePersistentState,
} from "./storage";
import { badgeById, earnedBadgeIds, levelInfo, XP } from "./game";
import { todayISO } from "./lib";

type Setter<T> = (v: T | ((prev: T) => T)) => void;

interface Toast {
  id: string;
  emoji: string;
  title: string;
  desc?: string;
}

interface Store {
  schedule: ClassSession[];
  setSchedule: Setter<ClassSession[]>;
  assignments: Assignment[];
  setAssignments: Setter<Assignment[]>;
  exams: Exam[];
  setExams: Setter<Exam[]>;
  notes: Note[];
  setNotes: Setter<Note[]>;
  checklist: ChecklistItem[];
  setChecklist: Setter<ChecklistItem[]>;
  decks: Deck[];
  setDecks: Setter<Deck[]>;
  flashcards: Flashcard[];
  setFlashcards: Setter<Flashcard[]>;
  grades: GradeCourse[];
  setGrades: Setter<GradeCourse[]>;
  gradeGoal: number;
  setGradeGoal: Setter<number>;
  focusLogs: FocusLog[];
  setFocusLogs: Setter<FocusLog[]>;
  subjects: string[];

  game: GameState;
  theme: ThemeMode;
  toggleTheme: () => void;

  /** ให้รางวัล XP + อัปเดตสตรีก (+ ตัวนับสะสมถ้าระบุ) */
  award: (xp: number, counters?: Partial<Pick<GameState, "tasksDone" | "pomodoros" | "cardsReviewed">>) => void;
  /** บันทึกเวลาโฟกัส + ให้ XP + นับ Pomodoro */
  addFocusMinutes: (minutes: number, sessions?: number) => void;
  celebrate: (big?: boolean) => void;
  toast: (t: Omit<Toast, "id">) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [schedule, setSchedule] = usePersistentState<ClassSession[]>("schedule", seedSchedule);
  const [assignments, setAssignments] = usePersistentState<Assignment[]>("assignments", seedAssignments);
  const [exams, setExams] = usePersistentState<Exam[]>("exams", seedExams);
  const [notes, setNotes] = usePersistentState<Note[]>("notes", seedNotes);
  const [checklist, setChecklist] = usePersistentState<ChecklistItem[]>("checklist", seedChecklist);
  const [decks, setDecks] = usePersistentState<Deck[]>("decks", seedDecks);
  const [flashcards, setFlashcards] = usePersistentState<Flashcard[]>("flashcards", seedFlashcards);
  const [grades, setGrades] = usePersistentState<GradeCourse[]>("grades", seedGrades);
  const [gradeGoal, setGradeGoal] = usePersistentState<number>("gradeGoal", 3.5);
  const [focusLogs, setFocusLogs] = usePersistentState<FocusLog[]>("focusLogs", seedFocusLogs);
  const [game, setGame] = usePersistentState<GameState>("game", initialGameState);
  const [theme, setTheme] = usePersistentState<ThemeMode>("theme", "light");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── ธีม: ใส่/ถอด .dark ที่ <html> ──
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [setTheme],
  );

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3800);
  }, []);

  const celebrate = useCallback((big = false) => {
    const colors = ["#6366f1", "#a855f7", "#22d3ee", "#ec4899", "#f59e0b"];
    confetti({
      particleCount: big ? 130 : 60,
      spread: big ? 100 : 70,
      startVelocity: big ? 45 : 32,
      ticks: big ? 200 : 120,
      origin: { y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    if (big) {
      window.setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 80, origin: { x: 0, y: 0.7 }, colors }), 150);
      window.setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 80, origin: { x: 1, y: 0.7 }, colors }), 250);
    }
  }, []);

  const award: Store["award"] = useCallback(
    (xp, counters) => {
      setGame((prev) => {
        const today = todayISO();
        let { streak, longestStreak } = prev;
        if (prev.lastActiveDate !== today) {
          const prevDate = new Date(prev.lastActiveDate + "T00:00:00");
          const now = new Date(today + "T00:00:00");
          const diffDays = Math.round((now.getTime() - prevDate.getTime()) / 86_400_000);
          streak = diffDays === 1 ? streak + 1 : 1;
          longestStreak = Math.max(longestStreak, streak);
        }
        return {
          ...prev,
          xp: Math.max(0, prev.xp + xp),
          streak,
          longestStreak,
          lastActiveDate: today,
          tasksDone: Math.max(0, prev.tasksDone + (counters?.tasksDone ?? 0)),
          pomodoros: Math.max(0, prev.pomodoros + (counters?.pomodoros ?? 0)),
          cardsReviewed: Math.max(0, prev.cardsReviewed + (counters?.cardsReviewed ?? 0)),
        };
      });
    },
    [setGame],
  );

  const addFocusMinutes = useCallback(
    (minutes: number, sessions = 1) => {
      const today = todayISO();
      setFocusLogs((prev) => {
        const idx = prev.findIndex((l) => l.date === today);
        if (idx === -1) return [...prev, { date: today, minutes, sessions }];
        const next = [...prev];
        next[idx] = { ...next[idx], minutes: next[idx].minutes + minutes, sessions: next[idx].sessions + sessions };
        return next;
      });
      award(XP.focus * sessions, { pomodoros: sessions });
    },
    [award, setFocusLogs],
  );

  // ── ตรวจเหรียญใหม่ + เลเวลอัป เมื่อสถานะเกมเปลี่ยน ──
  // "armed" ป้องกันไม่ให้เด้ง toast ตอนโหลดครั้งแรก (รวมถึง StrictMode double-invoke)
  const prevLevel = useRef(levelInfo(game.xp).level);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const fresh = earnedBadgeIds(game).filter((id) => !game.badges.includes(id));
    if (fresh.length > 0) {
      // เพิ่มเหรียญที่ "ควรมีอยู่แล้ว" แบบเงียบ ๆ เสมอ
      setGame((prev) => ({ ...prev, badges: Array.from(new Set([...prev.badges, ...fresh])) }));
      if (armed) {
        fresh.forEach((id, i) => {
          const b = badgeById(id);
          if (b) window.setTimeout(() => { toast({ emoji: b.emoji, title: `ปลดล็อกเหรียญ: ${b.name}`, desc: b.desc }); celebrate(true); }, i * 450);
        });
      }
    }

    const lv = levelInfo(game.xp).level;
    if (armed && lv > prevLevel.current) {
      toast({ emoji: "🎉", title: `เลเวลอัป! ระดับ ${lv}`, desc: levelInfo(game.xp).title });
      celebrate(true);
    }
    prevLevel.current = lv;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, game.xp, game.tasksDone, game.pomodoros, game.cardsReviewed, game.streak, game.longestStreak]);

  const subjects = useMemo(
    () => Array.from(new Set(schedule.map((s) => s.subject))).sort(),
    [schedule],
  );

  const value: Store = {
    schedule, setSchedule,
    assignments, setAssignments,
    exams, setExams,
    notes, setNotes,
    checklist, setChecklist,
    decks, setDecks,
    flashcards, setFlashcards,
    grades, setGrades,
    gradeGoal, setGradeGoal,
    focusLogs, setFocusLogs,
    subjects,
    game, theme, toggleTheme,
    award, addFocusMinutes, celebrate, toast,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastLayer toasts={toasts} />
    </Ctx.Provider>
  );
}

function ToastLayer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-strong pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl"
          >
            <span className="text-2xl">{t.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-fg">{t.title}</p>
              {t.desc && <p className="truncate text-xs text-muted">{t.desc}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export { levelInfo, XP } from "./game";
