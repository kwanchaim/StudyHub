import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { ClassSession, Weekday } from "../types";
import { useStore } from "../store";
import { SUBJECT_COLORS, uid } from "../storage";
import { WEEKDAYS_FULL, todayWeekday, daysFromToday, formatThaiDate } from "../lib";
import { Button, Modal, inputCls, labelCls } from "./ui";

const emptyForm = {
  subject: "",
  day: 0 as Weekday,
  start: "08:30",
  end: "10:00",
  room: "",
  teacher: "",
  book: "",
  color: SUBJECT_COLORS[0],
};

// วันเริ่มต้น/สิ้นสุดของสัปดาห์ปัจจุบัน (จันทร์–อาทิตย์)
function weekRange(): { start: string; end: string } {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(monday), end: fmt(sunday) };
}

export default function Schedule() {
  const { schedule, setSchedule, assignments, exams } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showWeekend, setShowWeekend] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const days: Weekday[] = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const td = todayWeekday();

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (s: ClassSession) => {
    setEditingId(s.id);
    setForm({
      subject: s.subject,
      day: s.day,
      start: s.start,
      end: s.end,
      room: s.room,
      teacher: s.teacher,
      book: s.book ?? "",
      color: s.color,
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.subject.trim() || !form.start || !form.end) return;
    const data = {
      ...form,
      subject: form.subject.trim(),
      room: form.room.trim(),
      teacher: form.teacher.trim(),
      book: form.book.trim() || undefined,
    };
    if (editingId) {
      setSchedule((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...data } : s)));
    } else {
      setSchedule((prev) => [...prev, { id: uid(), ...data }]);
    }
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  };

  const remove = (id: string) => setSchedule((prev) => prev.filter((s) => s.id !== id));

  // งาน/กิจกรรมสัปดาห์นี้
  const { start: weekStart, end: weekEnd } = useMemo(() => weekRange(), []);
  const gcalEvents = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("sh:gcal_events") ?? "[]"); } catch { return []; }
  }, []);

  const weekItems = useMemo(() => {
    const items: { id: string; label: string; date: string; type: "assignment" | "exam" | "gcal"; done?: boolean }[] = [];

    for (const a of assignments) {
      if (a.due >= weekStart && a.due <= weekEnd) {
        items.push({ id: a.id, label: a.title, date: a.due, type: "assignment", done: a.done });
      }
    }
    for (const e of exams) {
      const d = e.date.slice(0, 10);
      if (d >= weekStart && d <= weekEnd) {
        items.push({ id: e.id, label: e.subject, date: d, type: "exam" });
      }
    }
    for (const e of gcalEvents) {
      const d = (e.date as string).slice(0, 10);
      if (d >= weekStart && d <= weekEnd) {
        items.push({ id: e.id, label: e.subject, date: d, type: "gcal" });
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [assignments, exams, gcalEvents, weekStart, weekEnd]);

  const colorForType = {
    assignment: "#f59e0b",
    exam: "#6366f1",
    gcal: "#10b981",
  };
  const labelForType = {
    assignment: "📝 การบ้าน",
    exam: "📋 สอบ/กิจกรรม",
    gcal: "📅 Google",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fg">ตารางเรียน</h1>
          <p className="text-sm text-muted">ตารางเรียนรายสัปดาห์ของคุณ</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface/50 px-3 py-2 text-sm font-medium text-muted">
            <input
              type="checkbox"
              checked={showWeekend}
              onChange={(e) => setShowWeekend(e.target.checked)}
              className="accent-[var(--color-brand)]"
            />
            เสาร์–อาทิตย์
          </label>
          <Button onClick={openNew}>
            <Plus size={18} /> เพิ่มคาบเรียน
          </Button>
        </div>
      </div>

      <div className={`grid gap-3 ${showWeekend ? "lg:grid-cols-7" : "lg:grid-cols-5"}`}>
        {days.map((day) => {
          const items = schedule
            .filter((s) => s.day === day)
            .sort((a, b) => a.start.localeCompare(b.start));
          const isToday = day === td;
          return (
            <div key={day} className={`glass rounded-3xl p-3 transition-shadow ${isToday ? "ring-2 ring-brand/55 shadow-lg shadow-brand/15" : ""}`}>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className={`text-sm font-bold ${isToday ? "text-brand" : "text-fg"}`}>{WEEKDAYS_FULL[day]}</p>
                {isToday && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">วันนี้</span>}
              </div>
              <div className="space-y-2">
                {items.length === 0 && <p className="py-6 text-center text-xs text-muted/50">ว่าง</p>}
                {items.map((s) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative rounded-2xl p-3 transition-colors hover:brightness-[1.06]"
                    style={{ backgroundColor: s.color + "1e" }}
                  >
                    <p className="pr-12 text-sm font-bold text-fg">{s.subject}</p>
                    <p className="text-xs font-semibold" style={{ color: s.color }}>{s.start}–{s.end}</p>
                    <p className="mt-0.5 text-xs text-muted">ห้อง {s.room || "-"}{s.teacher ? ` · ${s.teacher}` : ""}</p>
                    {s.book && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                        <BookOpen size={11} />
                        <span className="truncate">{s.book}</span>
                      </p>
                    )}
                    <div className="absolute right-1.5 top-1.5 hidden gap-0.5 group-hover:flex">
                      <button
                        onClick={() => openEdit(s)}
                        aria-label="แก้ไข"
                        className="rounded-lg p-1 text-muted hover:bg-brand/15 hover:text-brand"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        aria-label="ลบ"
                        className="rounded-lg p-1 text-muted hover:bg-rose-500/15 hover:text-rose-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* งาน / กิจกรรมสัปดาห์นี้ */}
      <div className="glass rounded-3xl p-5">
        <p className="mb-3 text-sm font-bold text-fg">📌 งาน / กิจกรรมสัปดาห์นี้</p>
        {weekItems.length === 0 ? (
          <p className="text-center text-xs text-muted py-4">ไม่มีงานหรือกิจกรรมในสัปดาห์นี้</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weekItems.map((item) => {
              const color = colorForType[item.type];
              const typeLabel = labelForType[item.type];
              const d = daysFromToday(item.date);
              return (
                <div
                  key={item.id + item.type}
                  className="rounded-2xl p-3"
                  style={{ backgroundColor: color + "1f" }}
                >
                  <p className={`truncate text-sm font-bold ${item.done ? "line-through text-muted" : "text-fg"}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted">{typeLabel}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>
                    {d < 0 ? `เลยกำหนด ${Math.abs(d)} วัน` : d === 0 ? "วันนี้!" : d === 1 ? "พรุ่งนี้" : formatThaiDate(item.date)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ชื่อวิชา</label>
            <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="เช่น แคลคูลัส 1" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>วัน</label>
              <select className={inputCls} value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) as Weekday })}>
                {WEEKDAYS_FULL.map((w, i) => <option key={i} value={i}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>สีประจำวิชา</label>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className="h-7 w-7 rounded-full transition"
                    style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${c}` : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>เริ่ม</label><input type="time" className={inputCls} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><label className={labelCls}>เลิก</label><input type="time" className={inputCls} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>ห้อง</label><input className={inputCls} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="เช่น 234" /></div>
            <div><label className={labelCls}>อาจารย์</label><input className={inputCls} value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="เช่น อ.สมชาย" /></div>
          </div>
          <div>
            <label className={labelCls}>หนังสือเรียน <span className="text-muted/60">(ไม่บังคับ)</span></label>
            <input className={inputCls} value={form.book} onChange={(e) => setForm({ ...form, book: e.target.value })} placeholder="เช่น Calculus Early Transcendentals" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={save}>บันทึก</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
