import { useCallback, useEffect, useState } from "react";
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
} from "./types";

const PREFIX = "study-hub:";

/** สร้าง id แบบสุ่มสั้น ๆ */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Hook เก็บ state ลง localStorage อัตโนมัติ (sync ข้ามแท็บด้วย) */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const storageKey = PREFIX + key;

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ไม่เป็นไร ใช้ค่าเริ่มต้น */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* เต็มหรือถูกปิด */
    }
  }, [storageKey, state]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey || e.newValue == null) return;
      try {
        setState(JSON.parse(e.newValue) as T);
      } catch {
        /* ข้าม */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => setState(v),
    [],
  );

  return [state, set];
}

// ─────────────────────────────────────────────
// จานสี + ข้อมูลตัวอย่างเริ่มต้น (ลบทิ้งได้จากในแอป)
// ─────────────────────────────────────────────

export const SUBJECT_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
];

export const seedSchedule: ClassSession[] = [
  { id: uid(), subject: "คณิตศาสตร์", day: 0, start: "08:30", end: "10:00", room: "234", teacher: "อ.สมชาย", color: "#6366f1" },
  { id: uid(), subject: "ภาษาอังกฤษ", day: 0, start: "10:15", end: "11:45", room: "ENG-1", teacher: "อ.Jane", color: "#ec4899" },
  { id: uid(), subject: "ฟิสิกส์", day: 1, start: "09:00", end: "10:30", room: "Lab-2", teacher: "อ.วิทยา", color: "#3b82f6" },
  { id: uid(), subject: "เคมี", day: 2, start: "13:00", end: "14:30", room: "Lab-3", teacher: "อ.มาลี", color: "#10b981" },
  { id: uid(), subject: "ภาษาไทย", day: 3, start: "08:30", end: "10:00", room: "112", teacher: "อ.ประไพ", color: "#f59e0b" },
  { id: uid(), subject: "ประวัติศาสตร์", day: 4, start: "10:15", end: "11:45", room: "120", teacher: "อ.ธีระ", color: "#8b5cf6" },
];

export const seedAssignments: Assignment[] = [
  { id: uid(), title: "การบ้านแคลคูลัส บทที่ 3", subject: "คณิตศาสตร์", due: "2026-06-20", done: false, detail: "ทำโจทย์ข้อ 1–20 หน้า 88", createdAt: Date.now() },
  { id: uid(), title: "เรียงความภาษาอังกฤษ", subject: "ภาษาอังกฤษ", due: "2026-06-18", done: false, detail: "หัวข้อ My Future Career 300 คำ", createdAt: Date.now() },
  { id: uid(), title: "รายงานแล็บฟิสิกส์", subject: "ฟิสิกส์", due: "2026-06-25", done: true, detail: "การทดลองการเคลื่อนที่แบบโพรเจกไทล์", createdAt: Date.now() },
];

export const seedExams: Exam[] = [
  { id: uid(), subject: "คณิตศาสตร์", date: "2026-06-30T09:00", room: "หอประชุม A", detail: "สอบกลางภาค บทที่ 1–4" },
  { id: uid(), subject: "เคมี", date: "2026-07-02T13:00", room: "Lab-3", detail: "สอบปฏิบัติ + ทฤษฎี" },
];

export const seedNotes: Note[] = [
  { id: uid(), subject: "ฟิสิกส์", title: "สูตรการเคลื่อนที่", content: "v = u + at\ns = ut + ½at²\nv² = u² + 2as", updatedAt: Date.now() },
  { id: uid(), subject: "ภาษาอังกฤษ", title: "Irregular verbs", content: "go → went → gone\nsee → saw → seen\neat → ate → eaten", updatedAt: Date.now() },
];

export const seedChecklist: ChecklistItem[] = [
  { id: uid(), text: "เตรียมหนังสือสำหรับพรุ่งนี้", done: false, createdAt: Date.now() },
  { id: uid(), text: "ชาร์จแล็ปท็อป", done: true, createdAt: Date.now() },
  { id: uid(), text: "ส่งใบลาที่ห้องธุรการ", done: false, createdAt: Date.now() },
];

// ── แฟลชการ์ด (spaced repetition) ──
const deckMath = "deck-math";
const deckEng = "deck-eng";

export const seedDecks: Deck[] = [
  { id: deckMath, name: "แคลคูลัส — สูตรสำคัญ", subject: "คณิตศาสตร์", color: "#6366f1", createdAt: Date.now() },
  { id: deckEng, name: "ศัพท์อังกฤษ TOEIC", subject: "ภาษาอังกฤษ", color: "#ec4899", createdAt: Date.now() },
];

export const seedFlashcards: Flashcard[] = [
  { id: uid(), deckId: deckMath, front: "อนุพันธ์ของ sin(x)", back: "cos(x)", ease: 2.5, interval: 0, reps: 0, due: "2026-06-16", createdAt: Date.now() },
  { id: uid(), deckId: deckMath, front: "อนุพันธ์ของ ln(x)", back: "1/x", ease: 2.5, interval: 0, reps: 0, due: "2026-06-16", createdAt: Date.now() },
  { id: uid(), deckId: deckMath, front: "∫ x² dx", back: "x³/3 + C", ease: 2.5, interval: 0, reps: 0, due: "2026-06-16", createdAt: Date.now() },
  { id: uid(), deckId: deckEng, front: "abundant", back: "มากมาย, อุดมสมบูรณ์", ease: 2.5, interval: 0, reps: 0, due: "2026-06-16", createdAt: Date.now() },
  { id: uid(), deckId: deckEng, front: "deadline", back: "กำหนดส่ง, เส้นตาย", ease: 2.5, interval: 0, reps: 0, due: "2026-06-16", createdAt: Date.now() },
  { id: uid(), deckId: deckEng, front: "diligent", back: "ขยันหมั่นเพียร", ease: 2.5, interval: 0, reps: 0, due: "2026-06-16", createdAt: Date.now() },
];

// ── เกรด / GPA ──
export const seedGrades: GradeCourse[] = [
  { id: uid(), name: "แคลคูลัส 1", credits: 3, grade: "A", color: "#6366f1" },
  { id: uid(), name: "ฟิสิกส์ทั่วไป", credits: 3, grade: "B+", color: "#3b82f6" },
  { id: uid(), name: "ภาษาอังกฤษ", credits: 2, grade: "B", color: "#ec4899" },
  { id: uid(), name: "เคมีพื้นฐาน", credits: 3, grade: "", color: "#10b981" },
];

// ── ประวัติเวลาโฟกัส (ให้กราฟมีข้อมูลสวย ๆ ตั้งแต่แรก) ──
export const seedFocusLogs: FocusLog[] = [
  { date: "2026-06-10", minutes: 75, sessions: 3 },
  { date: "2026-06-11", minutes: 50, sessions: 2 },
  { date: "2026-06-12", minutes: 100, sessions: 4 },
  { date: "2026-06-13", minutes: 25, sessions: 1 },
  { date: "2026-06-14", minutes: 125, sessions: 5 },
  { date: "2026-06-15", minutes: 75, sessions: 3 },
];

export const initialGameState: GameState = {
  xp: 320,
  streak: 4,
  longestStreak: 6,
  lastActiveDate: "2026-06-15",
  badges: ["first-step", "streak-3"],
  pomodoros: 18,
  tasksDone: 12,
  cardsReviewed: 40,
};
