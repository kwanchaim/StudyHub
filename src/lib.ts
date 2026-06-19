// ฟังก์ชันช่วยเรื่องวันที่/เวลา ภาษาไทย (พ.ศ. + ชื่อวัน/เดือน)

export const WEEKDAYS_FULL = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
] as const;

export const WEEKDAYS_SHORT = [
  "จ.",
  "อ.",
  "พ.",
  "พฤ.",
  "ศ.",
  "ส.",
  "อา.",
] as const;

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** index วันของวันนี้ ในระบบ จันทร์=0 ... อาทิตย์=6 */
export function todayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
}

/** YYYY-MM-DD ของวันนี้ (เวลาท้องถิ่น) */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** แปลง ISO date/datetime → "20 มิ.ย. 2569" (พ.ศ.) */
export function formatThaiDate(iso: string, opts?: { full?: boolean }): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  const months = opts?.full ? THAI_MONTHS_FULL : THAI_MONTHS;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** "วันเสาร์ที่ 20 มิถุนายน 2569" */
export function formatThaiFull(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  const wd = (d.getDay() + 6) % 7;
  return `วัน${WEEKDAYS_FULL[wd]}ที่ ${formatThaiDate(iso, { full: true })}`;
}

/** แปลง datetime → "13:00 น." */
export function formatThaiTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} น.`;
}

/** จำนวนวันจากวันนี้ (ปัดเป็นวัน) — บวก = อนาคต, ลบ = ผ่านไปแล้ว */
export function daysFromToday(iso: string): number {
  const target = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(target.getTime())) return 0;
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** ข้อความบอกระยะเวลาแบบเป็นกันเอง */
export function relativeDueLabel(iso: string): string {
  const d = daysFromToday(iso);
  if (d < 0) return `เลยกำหนด ${Math.abs(d)} วัน`;
  if (d === 0) return "ครบกำหนดวันนี้";
  if (d === 1) return "ครบกำหนดพรุ่งนี้";
  return `อีก ${d} วัน`;
}

/** จัดกลุ่มรายการตาม key */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = keyFn(item);
    (out[k] ||= []).push(item);
  }
  return out;
}

// ── ระบบเกรด (มาตรฐานมหาวิทยาลัยไทย 4.00) ──
export const GRADE_OPTIONS = ["A", "B+", "B", "C+", "C", "D+", "D", "F"] as const;
export type GradeLetter = (typeof GRADE_OPTIONS)[number];

const GRADE_POINTS: Record<string, number> = {
  A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, "D+": 1.5, D: 1, F: 0,
};

export function gradePoint(grade: string): number | null {
  return grade in GRADE_POINTS ? GRADE_POINTS[grade] : null;
}

/** คำนวณ GPA จากรายวิชา (เฉพาะวิชาที่กรอกเกรดแล้ว) */
export function computeGPA(
  courses: { credits: number; grade: string }[],
): { gpa: number; credits: number } {
  let points = 0;
  let credits = 0;
  for (const c of courses) {
    const gp = gradePoint(c.grade);
    if (gp === null || c.credits <= 0) continue;
    points += gp * c.credits;
    credits += c.credits;
  }
  return { gpa: credits > 0 ? points / credits : 0, credits };
}

/** ชื่อย่อวันสำหรับกราฟ "จ" "อ" ... */
export const WEEKDAY_LETTERS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] as const;
