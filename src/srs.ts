import type { Flashcard } from "./types";
import { toISODate } from "./lib";

export type Rating = "again" | "hard" | "good" | "easy";

export const RATING_LABEL: Record<Rating, string> = {
  again: "ลืม",
  hard: "ยาก",
  good: "ได้",
  easy: "ง่าย",
};

/** ช่วงทบทวนถัดไปแบบคร่าว ๆ (ข้อความ) เพื่อแสดงบนปุ่ม */
export function previewInterval(card: Flashcard, rating: Rating): string {
  const next = schedule(card, rating).interval;
  if (next < 1) return "< 1 วัน";
  if (next === 1) return "1 วัน";
  return `${next} วัน`;
}

/**
 * อัลกอริทึม spaced-repetition แบบ SM-2 ย่อ
 * คืนค่าการ์ดใหม่ที่อัปเดต ease / interval / reps / due แล้ว
 */
export function schedule(card: Flashcard, rating: Rating): Flashcard {
  let { ease, interval, reps } = card;

  if (rating === "again") {
    reps = 0;
    interval = 0; // กลับมาทบทวนวันนี้
    ease = Math.max(1.3, ease - 0.2);
  } else {
    const quality = rating === "hard" ? 3 : rating === "good" ? 4 : 5;
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    if (reps === 0) {
      interval = rating === "easy" ? 3 : 1;
    } else if (reps === 1) {
      interval = rating === "hard" ? 3 : 6;
    } else {
      const mult = rating === "hard" ? 1.2 : rating === "easy" ? ease * 1.3 : ease;
      interval = Math.round(interval * mult);
    }
    interval = Math.max(1, interval);
    reps += 1;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return { ...card, ease: Math.round(ease * 100) / 100, interval, reps, due: toISODate(dueDate) };
}

/** การ์ดที่ครบกำหนดทบทวน (due <= วันนี้) */
export function isDue(card: Flashcard, todayIso: string): boolean {
  return card.due <= todayIso;
}
