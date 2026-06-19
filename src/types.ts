// โครงสร้างข้อมูลกลางของ Study Hub (เก็บใน localStorage ทั้งหมด)

/** วันในสัปดาห์: 0 = จันทร์ ... 6 = อาทิตย์ (ตรงกับ WEEKDAYS_FULL ใน lib.ts) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** คาบเรียนในตารางเรียนรายสัปดาห์ */
export interface ClassSession {
  id: string;
  subject: string;
  day: Weekday;
  start: string; // "08:30"
  end: string; // "10:00"
  room: string;
  teacher: string;
  color: string; // hex เช่น "#6366f1"
}

/** งานส่ง / การบ้าน */
export interface Assignment {
  id: string;
  title: string;
  subject: string;
  due: string; // ISO date "2026-06-20"
  done: boolean;
  detail: string;
  createdAt: number;
}

/** การสอบ */
export interface Exam {
  id: string;
  subject: string;
  date: string; // ISO datetime "2026-06-30T09:00"
  room: string;
  detail: string;
}

/** โน้ตย่อแยกตามวิชา */
export interface Note {
  id: string;
  subject: string;
  title: string;
  content: string;
  updatedAt: number;
}

/** รายการเช็กลิสต์สั้น ๆ */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

/** สำรับแฟลชการ์ด */
export interface Deck {
  id: string;
  name: string;
  subject: string;
  color: string;
  createdAt: number;
}

/** แฟลชการ์ด + ข้อมูล spaced-repetition (SM-2 อย่างย่อ) */
export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  ease: number; // ค่าความง่าย (เริ่ม 2.5)
  interval: number; // ระยะทบทวนถัดไป (วัน)
  reps: number; // จำนวนครั้งที่ตอบถูกติดต่อกัน
  due: string; // ISO date ครบกำหนดทบทวน
  createdAt: number;
}

/** รายวิชาในเครื่องคำนวณเกรด/GPA */
export interface GradeCourse {
  id: string;
  name: string;
  credits: number;
  grade: string; // "A" | "B+" | ... | "" (ยังไม่กรอก)
  color: string;
}

/** บันทึกเวลาโฟกัส (Pomodoro) ต่อวัน */
export interface FocusLog {
  date: string; // ISO date "2026-06-16"
  minutes: number; // นาทีโฟกัสสะสมของวันนั้น
  sessions: number; // จำนวนรอบ Pomodoro ที่จบ
}

/** สถานะเกมิฟิเคชัน */
export interface GameState {
  xp: number;
  streak: number; // จำนวนวันต่อเนื่อง
  longestStreak: number;
  lastActiveDate: string; // ISO date ที่ active ล่าสุด
  badges: string[]; // id ของ badge ที่ปลดล็อกแล้ว
  pomodoros: number; // จำนวน Pomodoro สะสมตลอดกาล
  tasksDone: number; // จำนวนงานที่ทำเสร็จสะสม
  cardsReviewed: number; // จำนวนการ์ดที่ทบทวนสะสม
}

export type ThemeMode = "light" | "dark";

export type TabKey =
  | "dashboard"
  | "schedule"
  | "assignments"
  | "exams"
  | "focus"
  | "flashcards"
  | "grades"
  | "analytics"
  | "notes"
  | "checklist"
  | "games";
