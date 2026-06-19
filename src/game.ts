// ตรรกะระบบเกม (XP / เลเวล / เหรียญตรา) — ฟังก์ชันบริสุทธิ์ ไม่ผูกกับ React
import type { GameState } from "./types";

/** ยศตามเลเวล (สนุก ๆ เป็นกำลังใจ) */
const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 1, title: "น้องใหม่ไฟแรง" },
  { min: 3, title: "นักเรียนขยัน" },
  { min: 5, title: "ติวเตอร์ฝึกหัด" },
  { min: 8, title: "เซียนหนังสือ" },
  { min: 12, title: "จอมยุทธ์การเรียน" },
  { min: 16, title: "ปรมาจารย์" },
  { min: 20, title: "ตำนานเพื่อนติว" },
];

export interface LevelInfo {
  level: number;
  title: string;
  intoLevel: number; // XP ที่ทำได้ในเลเวลปัจจุบัน
  span: number; // XP ทั้งหมดที่ต้องใช้ผ่านเลเวลนี้
  progress: number; // 0..1
  toNext: number; // เหลืออีกกี่ XP จะขึ้นเลเวล
}

/** XP รวมที่ต้องมีเพื่อ "เริ่ม" เลเวล L (L เริ่มที่ 1) */
function totalXpForLevel(level: number): number {
  // เลเวล 1 เริ่มที่ 0, แต่ละเลเวลถัดไปใช้ 120*level สะสม
  let sum = 0;
  for (let i = 1; i < level; i++) sum += 120 * i;
  return sum;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;

  const base = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const span = next - base;
  const intoLevel = xp - base;

  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) if (level >= t.min) title = t.title;

  return {
    level,
    title,
    intoLevel,
    span,
    progress: span > 0 ? intoLevel / span : 1,
    toNext: Math.max(0, next - xp),
  };
}

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  /** ปลดล็อกเมื่อเงื่อนไขเป็นจริง */
  test: (s: GameState) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first-step", emoji: "🌱", name: "ก้าวแรก", desc: "ทำงานสำเร็จชิ้นแรก", test: (s) => s.tasksDone >= 1 },
  { id: "streak-3", emoji: "🔥", name: "ไฟแรง", desc: "เรียนต่อเนื่อง 3 วัน", test: (s) => s.streak >= 3 || s.longestStreak >= 3 },
  { id: "streak-7", emoji: "⚡", name: "สม่ำเสมอ", desc: "เรียนต่อเนื่อง 7 วัน", test: (s) => s.streak >= 7 || s.longestStreak >= 7 },
  { id: "streak-30", emoji: "💎", name: "วินัยเหล็ก", desc: "เรียนต่อเนื่อง 30 วัน", test: (s) => s.longestStreak >= 30 },
  { id: "focus-10", emoji: "🍅", name: "นักโฟกัส", desc: "จบ Pomodoro 10 รอบ", test: (s) => s.pomodoros >= 10 },
  { id: "focus-50", emoji: "🏆", name: "เจ้าสมาธิ", desc: "จบ Pomodoro 50 รอบ", test: (s) => s.pomodoros >= 50 },
  { id: "task-25", emoji: "✅", name: "มือวางอันดับงาน", desc: "ทำงานสำเร็จ 25 ชิ้น", test: (s) => s.tasksDone >= 25 },
  { id: "cards-50", emoji: "🧠", name: "ความจำเป็นเลิศ", desc: "ทบทวนการ์ด 50 ใบ", test: (s) => s.cardsReviewed >= 50 },
  { id: "xp-1000", emoji: "⭐", name: "พันแต้ม", desc: "สะสม XP ครบ 1,000", test: (s) => s.xp >= 1000 },
];

/** id เหรียญที่ควร "ปลดล็อกแล้ว" ตามสถานะปัจจุบัน */
export function earnedBadgeIds(s: GameState): string[] {
  return BADGES.filter((b) => b.test(s)).map((b) => b.id);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

/** XP ที่ได้จากแต่ละกิจกรรม */
export const XP = {
  task: 20,
  checklist: 6,
  focus: 30,
  card: 3,
} as const;
