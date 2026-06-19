import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Command,
  Flame,
  Gamepad2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  NotebookPen,
  HardDrive,
  Sun,
  Timer,
  Trophy,
} from "lucide-react";
import type { TabKey } from "./types";
import { useStore } from "./store";
import { levelInfo } from "./game";
import { todayISO } from "./lib";
import { isDue } from "./srs";
import { onNavigate as onNavEvent } from "./nav";
import { ProgressBar } from "./components/ui";
import CommandPalette from "./components/CommandPalette";
import Dashboard from "./components/Dashboard";
import Schedule from "./components/Schedule";
import Assignments from "./components/Assignments";
import Exams from "./components/Exams";
import Focus from "./components/Focus";
import Flashcards from "./components/Flashcards";
import Grades from "./components/Grades";
import Analytics from "./components/Analytics";
import Notes from "./components/Notes";
import Checklist from "./components/Checklist";
import Games from "./components/Games";
import Backup from "./components/Backup";

interface NavItem {
  key: TabKey;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  group: string;
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "ภาพรวม", icon: LayoutDashboard, group: "หลัก" },
  { key: "schedule", label: "ตารางเรียน", icon: CalendarDays, group: "หลัก" },
  { key: "assignments", label: "งาน/การบ้าน", icon: ListChecks, group: "หลัก" },
  { key: "exams", label: "ปฏิทิน", icon: GraduationCap, group: "หลัก" },
  { key: "focus", label: "โหมดโฟกัส", icon: Timer, group: "ทบทวน" },
  { key: "flashcards", label: "แฟลชการ์ด", icon: Layers, group: "ทบทวน" },
  { key: "notes", label: "โน้ตวิชา", icon: NotebookPen, group: "ทบทวน" },
  { key: "analytics", label: "วิเคราะห์", icon: BarChart3, group: "ก้าวหน้า" },
  { key: "grades", label: "เกรด & GPA", icon: Trophy, group: "ก้าวหน้า" },
  { key: "checklist", label: "เช็กลิสต์", icon: CheckSquare, group: "ก้าวหน้า" },
  { key: "games", label: "เกมการเรียน", icon: Gamepad2, group: "สนุก" },
  { key: "backup", label: "สำรอง/กู้คืน", icon: HardDrive, group: "ระบบ" },
];

const PAGES: Record<TabKey, ComponentType> = {
  dashboard: Dashboard,
  schedule: Schedule,
  assignments: Assignments,
  exams: Exams,
  focus: Focus,
  flashcards: Flashcards,
  grades: Grades,
  analytics: Analytics,
  notes: Notes,
  checklist: Checklist,
  games: Games,
  backup: Backup,
};

const MOBILE_PRIMARY: TabKey[] = ["dashboard", "assignments", "focus", "flashcards"];

export default function App() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { assignments, flashcards } = useStore();
  const today = todayISO();

  const pendingTasks = useMemo(() => assignments.filter((a) => !a.done).length, [assignments]);
  const dueCards = useMemo(() => flashcards.filter((c) => isDue(c, today)).length, [flashcards, today]);

  const badgeFor = (key: TabKey): number | undefined => {
    if (key === "assignments") return pendingTasks || undefined;
    if (key === "flashcards") return dueCards || undefined;
    return undefined;
  };

  // คีย์ลัด Ctrl/Cmd + K เปิด command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // รับคำสั่งสลับแท็บจากภายในหน้า (เช่น การ์ดบนแดชบอร์ด)
  useEffect(() => onNavEvent(setTab), []);

  const Page = PAGES[tab];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Sidebar (เดสก์ท็อป) ── */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-5 border-r border-line/60 bg-surface/50 px-4 py-6 backdrop-blur-2xl lg:flex">
        <Brand />
        <PlayerCard />
        <nav className="-mr-2 flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
          {["หลัก", "ทบทวน", "ก้าวหน้า", "สนุก", "ระบบ"].map((group) => (
            <div key={group}>
              <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-widest text-muted/70">{group}</p>
              <div className="flex flex-col gap-0.5">
                {NAV.filter((n) => n.group === group).map((item) => (
                  <NavButton
                    key={item.key}
                    item={item}
                    active={tab === item.key}
                    badge={badgeFor(item.key)}
                    onClick={() => setTab(item.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <Command size={14} className="shrink-0" />
            <span className="truncate">ค้นหา / สั่งงานด่วน</span>
            <kbd className="ml-auto shrink-0 rounded bg-surface2 px-1.5 py-0.5 text-[10px] font-bold">⌘K</kbd>
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Top bar (มือถือ) ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line/60 bg-surface/70 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-1.5">
          <StreakChip />
          <ThemeToggle />
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="เมนู"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface2 hover:text-fg"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ── เนื้อหา ── */}
      <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Bottom nav (มือถือ) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/60 bg-surface/85 px-1 pb-safe backdrop-blur-2xl lg:hidden">
        {MOBILE_PRIMARY.map((key) => {
          const item = NAV.find((n) => n.key === key)!;
          const Icon = item.icon;
          const b = badgeFor(key);
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-all duration-200 ${
                isActive ? "text-brand" : "text-muted"
              }`}
            >
              {isActive && (
                <span className="nav-line-active absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand2" />
              )}
              <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`}>
                <Icon size={20} />
              </span>
              <span>{item.label}</span>
              {b && (
                <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white shadow">
                  {b}
                </span>
              )}
            </button>
          );
        })}
        <button
          key="backup"
          onClick={() => setTab("backup")}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-all duration-200 ${
            tab === "backup" ? "text-brand" : "text-muted"
          }`}
        >
          {tab === "backup" && (
            <span className="nav-line-active absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand2" />
          )}
          <span className={`transition-transform duration-200 ${tab === "backup" ? "scale-110" : "scale-100"}`}>
            <HardDrive size={20} />
          </span>
          <span>สำรองข้อมูล</span>
        </button>
      </nav>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        nav={NAV}
        onNavigate={(k) => {
          setTab(k);
          setPaletteOpen(false);
        }}
      />
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="animate-float grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 text-white shadow-lg shadow-brand/40">
        <GraduationCap size={22} />
      </div>
      <div>
        <p className="text-lg font-extrabold leading-tight text-fg">
          Study<span className="text-gradient">Hub</span>
        </p>
        {!compact && <p className="text-xs text-muted">เพื่อนติวคู่ใจ</p>}
      </div>
    </div>
  );
}

function PlayerCard() {
  const { game } = useStore();
  const info = levelInfo(game.xp);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 text-lg font-extrabold text-white shadow-lg shadow-brand/40 ring-2 ring-brand/25 ring-offset-1 ring-offset-surface">
          {info.level}
          <span className="absolute -bottom-1 -right-1 rounded-full bg-gradient-to-r from-brand to-brand2 px-1.5 py-0.5 text-[8px] font-black text-white shadow">LV</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-bold text-fg">{info.title}</p>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
              <Flame size={13} className="fill-amber-500" />
              {game.streak}
            </span>
          </div>
          <p className="text-[11px] text-muted">{info.intoLevel} / {info.span} XP · เลเวล {info.level}</p>
        </div>
      </div>
      <ProgressBar value={info.progress} className="mt-3" />
    </div>
  );
}

function StreakChip() {
  const { game } = useStore();
  return (
    <span className="flex items-center gap-1 rounded-xl bg-amber-500/15 px-2.5 py-1.5 text-sm font-bold text-amber-500">
      <Flame size={15} className="fill-amber-500" />
      {game.streak}
    </span>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useStore();
  return (
    <button
      onClick={toggleTheme}
      aria-label="สลับธีม"
      className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-surface2 hover:text-fg"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function NavButton({
  item,
  active,
  badge,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active ? "text-white" : "text-muted hover:bg-surface2 hover:text-fg"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand to-brand2 shadow-lg shadow-brand/30"
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        />
      )}
      <Icon size={18} className="relative z-10" />
      <span className="relative z-10 flex-1 text-left">{item.label}</span>
      {badge && (
        <span className={`relative z-10 rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export type { NavItem };
