import { useMemo } from "react";
import { motion } from "framer-motion";
import { Award, BarChart3, Brain, CheckCircle2, Flame, Star, Timer } from "lucide-react";
import { useStore } from "../store";
import { BADGES, levelInfo } from "../game";
import { WEEKDAY_LETTERS } from "../lib";
import { Card, ProgressBar, SectionHeader } from "./ui";

export default function Analytics() {
  const { focusLogs, assignments, game } = useStore();
  const info = levelInfo(game.xp);

  // โฟกัส 14 วันล่าสุด
  const days = useMemo(() => {
    const out: { label: string; minutes: number; isToday: boolean }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        label: WEEKDAY_LETTERS[(d.getDay() + 6) % 7],
        minutes: focusLogs.find((l) => l.date === iso)?.minutes ?? 0,
        isToday: i === 0,
      });
    }
    return out;
  }, [focusLogs]);
  const maxMin = Math.max(60, ...days.map((d) => d.minutes));
  const totalMin = days.reduce((s, d) => s + d.minutes, 0);

  const doneCount = assignments.filter((a) => a.done).length;
  const completion = assignments.length ? doneCount / assignments.length : 0;

  const stats = [
    { icon: Star, label: "XP สะสม", value: game.xp.toLocaleString(), tone: "#6366f1" },
    { icon: Flame, label: "สตรีคสูงสุด", value: `${game.longestStreak} วัน`, tone: "#f59e0b" },
    { icon: Timer, label: "Pomodoro รวม", value: game.pomodoros, tone: "#10b981" },
    { icon: Brain, label: "ทบทวนการ์ด", value: game.cardsReviewed, tone: "#22d3ee" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="วิเคราะห์ความก้าวหน้า" icon={<BarChart3 size={22} />} />

      {/* ── ระดับผู้เล่น ── */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 text-2xl font-extrabold text-white shadow-lg shadow-brand/40">
              {info.level}
            </div>
            <div>
              <p className="text-lg font-extrabold text-fg">{info.title}</p>
              <p className="text-sm text-muted">เลเวล {info.level} · เหลือ {info.toNext} XP จะขึ้นเลเวล</p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
              <span>{info.intoLevel} XP</span><span>{info.span} XP</span>
            </div>
            <ProgressBar value={info.progress} />
          </div>
        </div>
      </Card>

      {/* ── สถิติ ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="!p-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: s.tone + "22", color: s.tone }}><Icon size={20} /></span>
              <p className="mt-3 text-2xl font-extrabold text-fg">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* กราฟโฟกัส */}
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-fg"><Timer size={18} className="text-brand" /> เวลาโฟกัส 14 วัน</h3>
            <span className="text-sm font-semibold text-muted">รวม {totalMin} นาที</span>
          </div>
          <div className="flex h-44 items-end justify-between gap-1.5">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  className={`w-full rounded-lg ${d.isToday ? "bg-gradient-to-t from-brand to-brand2" : "bg-brand/30"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.minutes / maxMin) * 100}%` }}
                  transition={{ delay: i * 0.02, type: "spring", stiffness: 120, damping: 18 }}
                  style={{ minHeight: d.minutes > 0 ? 4 : 0 }}
                  title={`${d.minutes} นาที`}
                />
                <span className="text-[9px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ความสำเร็จงาน */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-fg"><CheckCircle2 size={18} className="text-brand" /> งานที่ทำสำเร็จ</h3>
          <div className="flex items-center gap-4">
            <div className="relative grid h-24 w-24 shrink-0 place-items-center">
              <svg width={96} height={96} className="-rotate-90">
                <circle cx={48} cy={48} r={40} fill="none" stroke="color-mix(in oklab, var(--color-muted) 18%, transparent)" strokeWidth={10} />
                <motion.circle cx={48} cy={48} r={40} fill="none" stroke="#10b981" strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - completion) }}
                  transition={{ type: "spring", stiffness: 90, damping: 20 }}
                />
              </svg>
              <span className="absolute text-lg font-extrabold text-fg">{Math.round(completion * 100)}%</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-fg"><span className="text-2xl font-extrabold text-emerald-500">{doneCount}</span> สำเร็จ</p>
              <p className="text-muted">จากทั้งหมด {assignments.length} งาน</p>
              <p className="text-muted">ทำสำเร็จสะสม {game.tasksDone} ครั้ง</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── เหรียญรางวัล ── */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-bold text-fg"><Award size={18} className="text-brand" /> เหรียญรางวัล ({game.badges.length}/{BADGES.length})</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BADGES.map((b) => {
            const unlocked = game.badges.includes(b.id);
            return (
              <div key={b.id} className={`rounded-2xl border p-4 text-center transition ${unlocked ? "border-brand/30 bg-brand/5" : "border-line bg-surface2/40 opacity-60"}`}>
                <div className={`text-3xl ${unlocked ? "" : "grayscale"}`}>{unlocked ? b.emoji : "🔒"}</div>
                <p className="mt-2 text-sm font-bold text-fg">{b.name}</p>
                <p className="text-[11px] text-muted">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
