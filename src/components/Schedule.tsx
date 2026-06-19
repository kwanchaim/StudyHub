import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import type { ClassSession, Weekday } from "../types";
import { useStore } from "../store";
import { SUBJECT_COLORS, uid } from "../storage";
import { WEEKDAYS_FULL, todayWeekday } from "../lib";
import { Button, Modal, inputCls, labelCls } from "./ui";

const emptyForm = {
  subject: "",
  day: 0 as Weekday,
  start: "08:30",
  end: "10:00",
  room: "",
  teacher: "",
  color: SUBJECT_COLORS[0],
};

export default function Schedule() {
  const { schedule, setSchedule } = useStore();
  const [open, setOpen] = useState(false);
  const [showWeekend, setShowWeekend] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const days: Weekday[] = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const td = todayWeekday();

  const add = () => {
    if (!form.subject.trim() || !form.start || !form.end) return;
    const session: ClassSession = {
      id: uid(),
      ...form,
      subject: form.subject.trim(),
      room: form.room.trim(),
      teacher: form.teacher.trim(),
    };
    setSchedule((prev) => [...prev, session]);
    setForm(emptyForm);
    setOpen(false);
  };

  const remove = (id: string) => setSchedule((prev) => prev.filter((s) => s.id !== id));

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
          <Button onClick={() => setOpen(true)}>
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
            <div key={day} className={`glass rounded-3xl p-3 ${isToday ? "ring-2 ring-brand/50" : ""}`}>
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
                    className="group relative rounded-2xl p-3"
                    style={{ backgroundColor: s.color + "1f", borderLeft: `3px solid ${s.color}` }}
                  >
                    <p className="pr-6 text-sm font-bold text-fg">{s.subject}</p>
                    <p className="text-xs font-semibold" style={{ color: s.color }}>{s.start}–{s.end}</p>
                    <p className="mt-0.5 text-xs text-muted">ห้อง {s.room || "-"}{s.teacher ? ` · ${s.teacher}` : ""}</p>
                    <button
                      onClick={() => remove(s.id)}
                      aria-label="ลบ"
                      className="absolute right-2 top-2 hidden rounded-lg p-1 text-muted hover:bg-rose-500/15 hover:text-rose-500 group-hover:block"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มคาบเรียน">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={add}>บันทึก</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
