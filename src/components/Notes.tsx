import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Note } from "../types";
import { useStore } from "../store";
import { uid } from "../storage";
import { Button, Modal, inputCls, labelCls } from "./ui";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  return `${Math.floor(hr / 24)} วันที่แล้ว`;
}

const BLANK = { id: "", subject: "", title: "", content: "" };

export default function Notes() {
  const { notes, setNotes, subjects } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(BLANK);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // รวม subjects จาก store + subjects ที่มีในโน้ตเดิม (ป้องกันโน้ตเก่าหายหมวด)
  const allSubjects = useMemo(
    () => Array.from(new Set([...subjects, ...notes.map((n) => n.subject)])).filter(Boolean).sort(),
    [subjects, notes],
  );

  const subjectOptions = allSubjects.length > 0 ? allSubjects : [];

  const colorOf = (subject: string) => {
    const palette = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
    let h = 0;
    for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  };

  const filtered = useMemo(
    () =>
      [...notes]
        .filter((n) => !activeSubject || n.subject === activeSubject)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [notes, activeSubject],
  );

  const openNew = () => {
    setEditing({ ...BLANK, subject: allSubjects[0] ?? "ทั่วไป" });
    setOpen(true);
  };

  const openEdit = (n: Note) => {
    setEditing({ id: n.id, subject: n.subject, title: n.title, content: n.content });
    setOpen(true);
  };

  const save = () => {
    if (!editing.title.trim() || !editing.content.trim()) return;
    const subject = editing.subject.trim() || "ทั่วไป";
    if (editing.id) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editing.id
            ? { ...n, subject, title: editing.title.trim(), content: editing.content, updatedAt: Date.now() }
            : n,
        ),
      );
    } else {
      const note: Note = {
        id: uid(),
        subject,
        title: editing.title.trim(),
        content: editing.content,
        updatedAt: Date.now(),
      };
      setNotes((prev) => [note, ...prev]);
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fg">โน้ตวิชา</h1>
          <p className="text-sm text-muted">บันทึกย่อแยกตามวิชา</p>
        </div>
        <Button onClick={openNew}><Plus size={18} /> เพิ่มโน้ต</Button>
      </div>

      {/* ตัวกรองตามวิชา */}
      {allSubjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip active={activeSubject === null} onClick={() => setActiveSubject(null)}>ทั้งหมด</Chip>
          {allSubjects.map((s) => (
            <Chip key={s} active={activeSubject === s} color={colorOf(s)} onClick={() => setActiveSubject(s)}>
              {s}
            </Chip>
          ))}
        </div>
      )}

      {/* กริดโน้ต */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {filtered.map((n) => {
            const c = colorOf(n.subject);
            const isConfirm = confirmId === n.id;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3 }}
                className="glass group flex cursor-pointer flex-col rounded-3xl p-4"
                onClick={() => { if (!isConfirm) openEdit(n); }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: c + "22", color: c }}
                  >
                    {n.subject}
                  </span>

                  {isConfirm ? (
                    /* ยืนยันลบ — inline */
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-semibold text-rose-500">ลบแน่ใจ?</span>
                      <button
                        onClick={() => remove(n.id)}
                        className="rounded-lg bg-rose-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-rose-600 transition"
                      >
                        ลบ
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg bg-surface2 px-2 py-0.5 text-xs font-bold text-muted hover:text-fg transition"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(n); }}
                        aria-label="แก้ไข"
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-brand/15 hover:text-brand transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(n.id); }}
                        aria-label="ลบ"
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-rose-500/15 hover:text-rose-500 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="font-bold text-fg">{n.title}</p>
                <p className="mt-1 line-clamp-5 whitespace-pre-line text-sm text-muted">{n.content}</p>
                <p className="mt-3 text-[11px] text-muted/60">แก้ไข {timeAgo(n.updatedAt)}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-line py-16 text-center">
          <p className="text-4xl">📓</p>
          <p className="mt-2 font-semibold text-muted">ยังไม่มีโน้ต</p>
          <p className="text-sm text-muted/70">
            {activeSubject ? `ไม่มีโน้ตวิชา "${activeSubject}"` : 'กด "เพิ่มโน้ต" เพื่อเริ่มจดบันทึก'}
          </p>
        </div>
      )}

      {/* Modal เพิ่ม / แก้ไขโน้ต */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing.id ? "แก้ไขโน้ต" : "เพิ่มโน้ต"}>
        <div className="space-y-4">
          {/* วิชา — select dropdown เมื่อมีวิชาในระบบ */}
          <div>
            <label className={labelCls}>วิชา</label>
            {subjectOptions.length > 0 ? (
              <select
                className={inputCls}
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              >
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="ทั่วไป">ทั่วไป</option>
              </select>
            ) : (
              <input
                className={inputCls}
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                placeholder="เช่น คณิตศาสตร์"
              />
            )}
          </div>

          {/* หัวข้อ */}
          <div>
            <label className={labelCls}>หัวข้อโน้ต</label>
            <input
              className={inputCls}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="เช่น สูตรการเคลื่อนที่"
              autoFocus
            />
          </div>

          {/* เนื้อหา */}
          <div>
            <label className={labelCls}>เนื้อหา</label>
            <textarea
              className={inputCls}
              rows={6}
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="พิมพ์บันทึกของคุณที่นี่…"
            />
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

function Chip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
        active ? "text-white shadow" : "bg-surface2 text-muted hover:text-fg"
      }`}
      style={active ? { backgroundColor: color ?? "var(--color-brand)" } : undefined}
    >
      {children}
    </button>
  );
}
