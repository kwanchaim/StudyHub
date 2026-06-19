import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ChecklistItem } from "../types";
import { useStore } from "../store";
import { uid } from "../storage";
import { XP } from "../game";
import { Button, ProgressBar, inputCls } from "./ui";

export default function Checklist() {
  const { checklist, setChecklist, award, celebrate } = useStore();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const sorted = useMemo(
    () => [...checklist].sort((a, b) => (a.done === b.done ? a.createdAt - b.createdAt : a.done ? 1 : -1)),
    [checklist],
  );
  const doneCount = checklist.filter((i) => i.done).length;

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const item: ChecklistItem = { id: uid(), text: t, done: false, createdAt: Date.now() };
    setChecklist((prev) => [...prev, item]);
    setText("");
  };

  const toggle = (item: ChecklistItem) => {
    const nowDone = !item.done;
    setChecklist((prev) => prev.map((x) => (x.id === item.id ? { ...x, done: nowDone } : x)));
    if (nowDone) {
      award(XP.checklist);
      celebrate();
    } else {
      award(-XP.checklist);
    }
  };

  const remove = (id: string) => setChecklist((prev) => prev.filter((i) => i.id !== id));
  const clearDone = () => setChecklist((prev) => prev.filter((i) => !i.done));

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };
  const saveEdit = () => {
    const t = editText.trim();
    if (t && editingId) {
      setChecklist((prev) => prev.map((x) => (x.id === editingId ? { ...x, text: t } : x)));
    }
    setEditingId(null);
    setEditText("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-fg">เช็กลิสต์</h1>
        <p className="text-sm text-muted">สิ่งที่ต้องทำ/เตรียม รับ +{XP.checklist} XP ต่อรายการ</p>
      </div>

      <div className="glass flex items-center gap-2 rounded-2xl p-2">
        <input
          className={`${inputCls} border-0 bg-transparent focus:ring-0`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="เพิ่มรายการใหม่… เช่น เตรียมอุปกรณ์สอบ"
        />
        <Button onClick={add}><Plus size={18} /> เพิ่ม</Button>
      </div>

      {checklist.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-fg">เสร็จแล้ว {doneCount} / {checklist.length} รายการ</span>
            <span className="text-muted">{Math.round((doneCount / checklist.length) * 100)}%</span>
          </div>
          <ProgressBar value={checklist.length ? doneCount / checklist.length : 0} />
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {sorted.map((item) => (
            <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} className="glass group flex items-center gap-3 rounded-2xl p-3.5">
              <button
                onClick={() => toggle(item)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${item.done ? "border-brand bg-brand text-white" : "border-line hover:border-brand"}`}
                aria-label="ทำเสร็จ"
              >
                {item.done && <Check size={14} strokeWidth={3} />}
              </button>
              {editingId === item.id ? (
                <>
                  <input
                    className={`${inputCls} flex-1 py-1.5`}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    autoFocus
                  />
                  <button onClick={saveEdit} aria-label="บันทึก" className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-500/15"><Check size={15} /></button>
                  <button onClick={cancelEdit} aria-label="ยกเลิก" className="rounded-lg p-1.5 text-muted hover:bg-surface2"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 cursor-pointer ${item.done ? "text-muted line-through opacity-70" : "text-fg"}`}
                    onDoubleClick={() => startEdit(item)}
                  >
                    {item.text}
                  </span>
                  <button onClick={() => startEdit(item)} aria-label="แก้ไข" className="rounded-lg p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-brand/15 hover:text-brand"><Pencil size={14} /></button>
                  <button onClick={() => remove(item.id)} aria-label="ลบ" className="rounded-lg p-1.5 text-muted hover:bg-rose-500/15 hover:text-rose-500"><Trash2 size={15} /></button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {checklist.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-line py-16 text-center">
            <p className="text-4xl">📝</p>
            <p className="mt-2 font-semibold text-muted">ยังไม่มีรายการ</p>
            <p className="text-sm text-muted/70">เพิ่มสิ่งที่ต้องทำด้านบน</p>
          </div>
        )}
      </div>

      {doneCount > 0 && (
        <button onClick={clearDone} className="mx-auto block text-sm font-medium text-muted hover:text-rose-500">
          ล้างรายการที่เสร็จแล้ว ({doneCount})
        </button>
      )}
    </div>
  );
}
