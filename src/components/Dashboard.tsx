import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  ChevronRight,
  Clock,
  Flame,
  ListTodo,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useStore } from "../store";
import { levelInfo } from "../game";
import { goTo, goToGame } from "../nav";
import {
  computeGPA,
  daysFromToday,
  formatThaiFull,
  formatThaiTime,
  relativeDueLabel,
  todayISO,
  todayWeekday,
  WEEKDAY_LETTERS,
} from "../lib";
import { isDue } from "../srs";
import { quoteOfTheDay } from "../quotes";
import { Card, ProgressBar } from "./ui";

const GAME_SHORTCUTS = [
  { id: "hangman",   emoji: "🪢", name: "แฮงแมน",      color: "#6366f1" },
  { id: "memory",    emoji: "🃏", name: "จำไพ่",        color: "#ec4899" },
  { id: "scramble",  emoji: "🔤", name: "Scramble",    color: "#f59e0b" },
  { id: "quiz",      emoji: "📐", name: "ควิซสูตร",    color: "#10b981" },
  { id: "match",     emoji: "🔗", name: "จับคู่",       color: "#3b82f6" },
  { id: "sentence",  emoji: "📝", name: "เรียงประโยค",  color: "#8b5cf6" },
  { id: "speedmath", emoji: "⚡", name: "Speed Math",  color: "#ef4444" },
] as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "อรุณสวัสดิ์";
  if (h < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนค่ำ";
}

export default function Dashboard() {
  const { schedule, assignments, exams, flashcards, grades, focusLogs, game } = useStore();
  const today = todayISO();
  const info = levelInfo(game.xp);
  const quote = quoteOfTheDay();

  const colorOf = (subject: string) =>
    schedule.find((s) => s.subject === subject)?.color ?? "#6366f1";

  const todayClasses = useMemo(
    () => schedule.filter((s) => s.day === todayWeekday()).sort((a, b) => a.start.localeCompare(b.start)),
    [schedule],
  );

  const pendingTasks = useMemo(
    () => assignments.filter((a) => !a.done).sort((a, b) => a.due.localeCompare(b.due)),
    [assignments],
  );

  const dueCards = useMemo(() => flashcards.filter((c) => isDue(c, today)).length, [flashcards, today]);
  const upcomingExams = useMemo(
    () => exams.filter((e) => daysFromToday(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)),
    [exams],
  );
  const gpa = useMemo(() => computeGPA(grades), [grades]);

  // โฟกัส 7 วันล่าสุด (กราฟแท่งเล็ก)
  const focus7 = useMemo(() => {
    const out: { label: string; minutes: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const wd = (d.getDay() + 6) % 7;
      out.push({
        label: WEEKDAY_LETTERS[wd],
        minutes: focusLogs.find((l) => l.date === iso)?.minutes ?? 0,
        isToday: iso === today,
      });
    }
    return out;
  }, [focusLogs, today]);
  const maxFocus = Math.max(60, ...focus7.map((d) => d.minutes));
  const todayFocus = focus7[focus7.length - 1]?.minutes ?? 0;

  const stats = [
    { icon: Clock, label: "คาบเรียนวันนี้", value: todayClasses.length, tone: "#6366f1", go: "schedule" as const },
    { icon: ListTodo, label: "งานค้างส่ง", value: pendingTasks.length, tone: "#ec4899", go: "assignments" as const },
    { icon: Brain, label: "การ์ดรอทบทวน", value: dueCards, tone: "#22d3ee", go: "flashcards" as const },
    { icon: TrendingUp, label: "GPA สะสม", value: gpa.gpa.toFixed(2), tone: "#10b981", go: "grades" as const },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-40 w-40 rounded-full bg-brand2/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand">
              <Sparkles size={15} /> {formatThaiFull(today)}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-fg sm:text-3xl">
              {greeting()} 👋 <span className="text-gradient">{info.title}</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              “{quote.text}” <span className="text-muted/70">— {quote.author}</span>
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => goTo("focus")}
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 px-5 py-3 text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
            >
              <Timer size={20} />
              <span className="text-left">
                <span className="block text-sm font-bold">เริ่มโฟกัส</span>
                <span className="block text-xs text-white/80">วันนี้ {todayFocus} นาที</span>
              </span>
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </Card>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.label}
              onClick={() => goTo(s.go)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-3xl p-4 text-left shadow-lg shadow-slate-900/5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ backgroundColor: s.tone + "22", color: s.tone }}>
                <Icon size={20} />
              </span>
              <p className="mt-3 text-2xl font-extrabold text-fg">{s.value}</p>
              <p className="text-xs font-medium text-muted">{s.label}</p>
            </motion.button>
          );
        })}
      </div>

      {/* ── เกมการเรียน shortcuts ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-fg">
            🎮 เกมการเรียน
          </h2>
          <button
            onClick={() => goTo("games")}
            className="flex items-center gap-0.5 text-xs font-semibold text-brand hover:underline"
          >
            ดูทั้งหมด <ChevronRight size={13} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {GAME_SHORTCUTS.map((g, i) => (
            <motion.button
              key={g.id}
              onClick={() => goToGame(g.id)}
              whileHover={{ y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 18 }}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center transition"
              style={{ background: g.color + "18" }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl text-xl shadow-sm"
                style={{ background: g.color + "30", boxShadow: `0 2px 8px ${g.color}30` }}
              >
                {g.emoji}
              </span>
              <span className="w-full truncate text-[10px] font-bold leading-tight" style={{ color: g.color }}>
                {g.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* คาบเรียนวันนี้ */}
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-fg"><BookOpen size={18} className="text-brand" /> คาบเรียนวันนี้</h2>
            <button onClick={() => goTo("schedule")} className="text-xs font-semibold text-brand hover:underline">ดูตาราง</button>
          </div>
          {todayClasses.length === 0 ? (
            <p className="rounded-2xl bg-surface2 py-8 text-center text-sm text-muted">วันนี้ไม่มีคาบเรียน พักผ่อนหรือทบทวนได้เต็มที่ 🎉</p>
          ) : (
            <div className="space-y-2">
              {todayClasses.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface2/70 p-3">
                  <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{c.subject}</p>
                    <p className="text-xs text-muted">ห้อง {c.room} · {c.teacher}</p>
                  </div>
                  <span className="rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-muted">{c.start}–{c.end}</span>
                </div>
              ))}
            </div>
          )}

          {/* กราฟโฟกัส 7 วัน */}
          <div className="mt-5 rounded-2xl bg-surface2/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-fg"><Timer size={15} className="text-brand" /> เวลาโฟกัส 7 วันล่าสุด</p>
              <span className="text-xs text-muted">รวม {focus7.reduce((s, d) => s + d.minutes, 0)} นาที</span>
            </div>
            <div className="flex h-24 items-end justify-between gap-2">
              {focus7.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.minutes / maxFocus) * 100}%` }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 120, damping: 18 }}
                    className={`w-full rounded-lg ${d.isToday ? "bg-gradient-to-t from-brand to-brand2" : "bg-brand/30"}`}
                    style={{ minHeight: d.minutes > 0 ? 6 : 2 }}
                  />
                  <span className={`text-[10px] ${d.isToday ? "font-bold text-brand" : "text-muted"}`}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* งานใกล้ครบกำหนด + สอบ */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-fg"><ListTodo size={18} className="text-brand" /> งานใกล้ครบกำหนด</h2>
              <button onClick={() => goTo("assignments")} className="text-xs font-semibold text-brand hover:underline">ทั้งหมด</button>
            </div>
            {pendingTasks.length === 0 ? (
              <p className="rounded-2xl bg-surface2 py-6 text-center text-sm text-muted">ไม่มีงานค้าง สุดยอด! ✨</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 3).map((a) => {
                  const d = daysFromToday(a.due);
                  const tone = d < 0 ? "text-rose-500" : d <= 2 ? "text-amber-500" : "text-muted";
                  return (
                    <div key={a.id} className="rounded-2xl bg-surface2/70 p-3">
                      <p className="truncate text-sm font-semibold text-fg">{a.title}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: colorOf(a.subject) + "22", color: colorOf(a.subject) }}>{a.subject}</span>
                        <span className={`text-xs font-bold ${tone}`}>{relativeDueLabel(a.due)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-fg"><CalendarClock size={18} className="text-brand" /> การสอบที่จะถึง</h2>
            {upcomingExams.length === 0 ? (
              <p className="rounded-2xl bg-surface2 py-6 text-center text-sm text-muted">ยังไม่มีตารางสอบ</p>
            ) : (
              <div className="space-y-2">
                {upcomingExams.slice(0, 2).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface2/70 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold" style={{ backgroundColor: colorOf(e.subject) + "22", color: colorOf(e.subject) }}>
                      {daysFromToday(e.date)}ว
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{e.subject}</p>
                      <p className="text-xs text-muted">{formatThaiFull(e.date).replace("วัน", "")} · {formatThaiTime(e.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* แถบเลเวล (มือถือ) */}
      <Card className="lg:hidden">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-amber-500"><Flame size={18} className="fill-amber-500" /> <b>{game.streak}</b></span>
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs text-muted"><span>เลเวล {info.level} · {info.title}</span><span>{info.intoLevel}/{info.span} XP</span></div>
            <ProgressBar value={info.progress} />
          </div>
        </div>
      </Card>
    </div>
  );
}
