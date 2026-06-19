import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Assignment } from "../types";
import { useStore } from "../store";
import { uid } from "../storage";
import { XP } from "../game";
import { daysFromToday, formatThaiDate, relativeDueLabel, todayISO } from "../lib";
import { Button, Modal, Segmented, inputCls, labelCls } from "./ui";

type Filter = "all" | "pending" | "done";

export default function Assignments() {
  const { assignments, setAssignments, subjects, award, celebrate } = useStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState({ title: "", subject: subjects[0] ?? "", due: todayISO(), detail: "" });

  const colorOf = (subject: string) => {
    const palette = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
    let h = 0;
    for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  };

  const sorted = useMemo(() => {
    return [...assignments].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.due.localeCompare(b.due);
    });
  }, [assignments]);

  const filtered = sorted.filter((a) =>
    filter === "all" ? true : filter === "pending" ? !a.done : a.done,
  );

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => !a.done).length,
    done: assignments.filter((a) => a.done).length,
  };

  const toggle = (a: Assignment) => {
    const nowDone = !a.done;
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: nowDone } : x)));
    if (nowDone) {
      award(XP.task, { tasksDone: 1 });
      celebrate();
    } else {
      award(-XP.task, { tasksDone: -1 });
    }
  };

  const remove = (id: string) => setAssignments((prev) => prev.filter((a) => a.id !== id));

  const add = () => {
    if (!form.title.trim()) return;
    const item: Assignment = {
      id: uid(),
      title: form.title.trim(),
      subject: form.subject.trim() || "ทั่วไป",
      due: form.due,
      detail: form.detail.trim(),
      done: false,
      createdAt: Date.now(),
    };
    setAssignments((prev) => [item, ...prev]);
    setForm({ title: "", subject: subjects[0] ?? "", due: todayISO(), detail: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fg">งาน / การบ้าน</h1>
          <p className="text-sm text-muted">ทำเสร็จแต่ละชิ้นรับ +{XP.task} XP 🎉</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={18} /> เพิ่มงาน</Button>
      </div>

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `ทั้งหมด ${counts.all}` },
          { value: "pending", label: `ค้างอยู่ ${counts.pending}` },
          { value: "done", label: `เสร็จแล้ว ${counts.done}` },
        ]}
      />

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {filtered.map((a) => {
            const d = daysFromToday(a.due);
            const tone = a.done ? "text-muted" : d < 0 ? "text-rose-500" : d <= 2 ? "text-amber-500" : "text-muted";
            const c = colorOf(a.subject);
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass flex items-start gap-3 rounded-2xl p-4"
              >
                <button
                  onClick={() => toggle(a)}
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                    a.done ? "border-brand bg-brand text-white" : "border-line hover:border-brand"
                  }`}
                  aria-label="ทำเสร็จ"
                >
                  {a.done && <Check size={14} strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${a.done ? "text-muted line-through" : "text-fg"}`}>{a.title}</p>
                  {a.detail && <p className="mt-0.5 text-sm text-muted">{a.detail}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: c + "22", color: c }}>{a.subject}</span>
                    <span className={`text-xs font-bold ${tone}`}>{relativeDueLabel(a.due)}</span>
                    <span className="text-xs text-muted/60">· {formatThaiDate(a.due)}</span>
                  </div>
                </div>
                <button onClick={() => remove(a.id)} aria-label="ลบ" className="rounded-lg p-1.5 text-muted transition hover:bg-rose-500/15 hover:text-rose-500">
                  <Trash2 size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-line py-16 text-center">
            <p className="text-4xl">🎯</p>
            <p className="mt-2 font-semibold text-muted">{filter === "done" ? "ยังไม่มีงานที่ทำเสร็จ" : "ไม่มีงานค้าง เยี่ยมมาก!"}</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มงาน / การบ้าน">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>ชื่องาน</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น การบ้านบทที่ 3" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>วิชา</label>
              {subjects.length > 0 ? (
                <select className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="ทั่วไป">ทั่วไป</option>
                </select>
              ) : (
                <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="ชื่อวิชา" />
              )}
            </div>
            <div>
              <label className={labelCls}>กำหนดส่ง</label>
              <input type="date" className={inputCls} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>รายละเอียด (ถ้ามี)</label>
            <textarea className={inputCls} rows={3} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="โจทย์ข้อ 1–20 หน้า 88" />
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
