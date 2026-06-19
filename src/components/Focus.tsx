import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useStore } from "../store";
import { todayISO } from "../lib";
import { Card, SectionHeader } from "./ui";

type Mode = "focus" | "short" | "long";

const MODES: Record<Mode, { label: string; minutes: number; tone: string; icon: typeof Brain }> = {
  focus: { label: "โฟกัส", minutes: 25, tone: "#6366f1", icon: Brain },
  short: { label: "พักสั้น", minutes: 5, tone: "#10b981", icon: Coffee },
  long: { label: "พักยาว", minutes: 15, tone: "#22d3ee", icon: Coffee },
};

export default function Focus() {
  const { subjects, focusLogs, addFocusMinutes, celebrate, toast } = useStore();

  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState<string>("");
  const tickRef = useRef<number | null>(null);

  const total = MODES[mode].minutes * 60;
  const progress = 1 - secondsLeft / total;

  const todayLog = useMemo(
    () => focusLogs.find((l) => l.date === todayISO()),
    [focusLogs],
  );

  // เปลี่ยนโหมด → รีเซ็ตเวลา
  function switchMode(m: Mode) {
    setMode(m);
    setRunning(false);
    setSecondsLeft(MODES[m].minutes * 60);
  }

  // นาฬิกาเดินถอยหลัง
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tickRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  // เมื่อหมดเวลา
  useEffect(() => {
    if (secondsLeft !== 0) return;
    setRunning(false);
    if (mode === "focus") {
      addFocusMinutes(MODES.focus.minutes);
      celebrate(true);
      toast({ emoji: "🍅", title: "จบ 1 รอบโฟกัส!", desc: `+${MODES.focus.minutes} นาที · ได้ XP เพิ่ม` });
      switchMode("short");
    } else {
      toast({ emoji: "☕", title: "หมดเวลาพัก", desc: "พร้อมลุยต่อหรือยัง?" });
      switchMode("focus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  // วงแหวนเวลา
  const size = 280;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const tone = MODES[mode].tone;

  return (
    <div className="space-y-6">
      <SectionHeader title="โหมดโฟกัส" icon={<Timer size={22} />} />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* นาฬิกา */}
        <Card className="lg:col-span-3 flex flex-col items-center">
          {/* เลือกโหมด */}
          <div className="mb-6 inline-flex rounded-2xl border border-line bg-surface/60 p-1">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`relative rounded-xl px-4 py-2 text-sm font-bold transition ${mode === m ? "text-white" : "text-muted hover:text-fg"}`}
              >
                {mode === m && (
                  <motion.span layoutId="focus-mode" className="absolute inset-0 rounded-xl" style={{ background: tone }} transition={{ type: "spring", stiffness: 320, damping: 28 }} />
                )}
                <span className="relative z-10">{MODES[m].label}</span>
              </button>
            ))}
          </div>

          {/* วงแหวน */}
          <div className="relative grid place-items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklab, var(--color-muted) 18%, transparent)" strokeWidth={stroke} />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={tone}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                animate={{ strokeDashoffset: circ * (1 - progress) }}
                transition={{ ease: "linear", duration: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-mono text-6xl font-extrabold tabular-nums text-fg">{mm}:{ss}</p>
                <p className="mt-1 text-sm font-semibold text-muted">
                  {running ? "กำลังโฟกัส…" : "พร้อมเริ่ม"} {subject && mode === "focus" ? `· ${subject}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* ปุ่มควบคุม */}
          <div className="mt-7 flex items-center gap-3">
            <button
              onClick={() => setRunning((r0) => !r0)}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition hover:brightness-110 active:scale-95"
              style={{ background: tone, boxShadow: `0 12px 30px -8px ${tone}` }}
              aria-label={running ? "หยุดชั่วคราว" : "เริ่ม"}
            >
              {running ? <Pause size={26} className="fill-white" /> : <Play size={26} className="ml-1 fill-white" />}
            </button>
            <button
              onClick={() => { setRunning(false); setSecondsLeft(total); }}
              className="grid h-12 w-12 place-items-center rounded-full border border-line text-muted transition hover:text-fg"
              aria-label="รีเซ็ต"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </Card>

        {/* ฝั่งขวา: เลือกวิชา + สรุปวันนี้ */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="mb-3 text-sm font-bold text-fg">โฟกัสวิชาอะไรดี?</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSubject("")}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${subject === "" ? "bg-brand text-white" : "bg-surface2 text-muted hover:text-fg"}`}
              >
                ทั่วไป
              </button>
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${subject === s ? "bg-brand text-white" : "bg-surface2 text-muted hover:text-fg"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-4 text-sm font-bold text-fg">สรุปวันนี้</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface2/70 p-4 text-center">
                <p className="text-3xl font-extrabold text-brand">{todayLog?.sessions ?? 0}</p>
                <p className="text-xs text-muted">รอบโฟกัส</p>
              </div>
              <div className="rounded-2xl bg-surface2/70 p-4 text-center">
                <p className="text-3xl font-extrabold text-brand2">{todayLog?.minutes ?? 0}</p>
                <p className="text-xs text-muted">นาที</p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              เทคนิค Pomodoro: โฟกัส 25 นาที พัก 5 นาที 🍅
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
