import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Trash2, Trophy } from "lucide-react";
import { useStore } from "../store";
import { SUBJECT_COLORS, uid } from "../storage";
import { computeGPA, GRADE_OPTIONS } from "../lib";
import type { GradeCourse } from "../types";
import { Button, Card, EmptyState, Modal, SectionHeader, inputCls, labelCls } from "./ui";

export default function Grades() {
  const { grades, setGrades, gradeGoal, setGradeGoal } = useStore();
  const [addOpen, setAddOpen] = useState(false);

  const { gpa, credits } = useMemo(() => computeGPA(grades), [grades]);
  const goalReached = gpa >= gradeGoal && credits > 0;
  const ringProgress = Math.min(1, gpa / 4);

  const size = 168;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  function update(id: string, patch: Partial<GradeCourse>) {
    setGrades((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="เกรด & GPA"
        icon={<Trophy size={22} />}
        action={<Button onClick={() => setAddOpen(true)}><Plus size={16} /> เพิ่มวิชา</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* การ์ด GPA */}
        <Card className="lg:col-span-2 flex flex-col items-center justify-center">
          <div className="relative grid place-items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklab, var(--color-muted) 18%, transparent)" strokeWidth={stroke} />
              <motion.circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="url(#gpaGrad)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - ringProgress) }}
                transition={{ type: "spring", stiffness: 90, damping: 20 }}
              />
              <defs>
                <linearGradient id="gpaGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-4xl font-extrabold text-fg">{gpa.toFixed(2)}</p>
                <p className="text-xs text-muted">GPA</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">{credits} หน่วยกิตที่นับเกรดแล้ว</p>
          <div className={`mt-3 rounded-full px-3 py-1 text-sm font-bold ${goalReached ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
            {goalReached ? "ถึงเป้าแล้ว! 🎉" : `เป้าหมาย ${gradeGoal.toFixed(2)}`}
          </div>
        </Card>

        {/* รายวิชา */}
        <div className="space-y-3 lg:col-span-3">
          <Card>
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><Target size={14} /> เป้าหมาย GPA</span></label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={4} step={0.05} value={gradeGoal}
                onChange={(e) => setGradeGoal(Number(e.target.value))}
                className="flex-1 accent-brand"
              />
              <span className="w-14 rounded-lg bg-surface2 py-1 text-center text-sm font-bold text-fg">{gradeGoal.toFixed(2)}</span>
            </div>
          </Card>

          {grades.length === 0 ? (
            <EmptyState icon={<Trophy size={40} />} title="ยังไม่มีรายวิชา" hint="เพิ่มวิชาแล้วกรอกเกรดเพื่อคำนวณ GPA อัตโนมัติ" />
          ) : (
            grades.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <input
                  value={c.name}
                  onChange={(e) => update(c.id, { name: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg outline-none"
                  placeholder="ชื่อวิชา"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={0} max={10} value={c.credits}
                    onChange={(e) => update(c.id, { credits: Number(e.target.value) })}
                    className="w-12 rounded-lg bg-surface2 px-2 py-1.5 text-center text-sm text-fg outline-none"
                    aria-label="หน่วยกิต"
                  />
                  <span className="text-xs text-muted">นก.</span>
                </div>
                <select
                  value={c.grade}
                  onChange={(e) => update(c.id, { grade: e.target.value })}
                  className="rounded-lg border border-line bg-surface2 px-2 py-1.5 text-sm font-bold text-fg outline-none"
                  aria-label="เกรด"
                >
                  <option value="">—</option>
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={() => setGrades((prev) => prev.filter((x) => x.id !== c.id))} className="text-muted/50 transition hover:text-rose-500" aria-label="ลบ">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <AddCourseModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(c) => setGrades((prev) => [...prev, c])} />
    </div>
  );
}

function AddCourseModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: GradeCourse) => void;
}) {
  const [name, setName] = useState("");
  const [credits, setCredits] = useState(3);
  const [grade, setGrade] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  function submit() {
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim(), credits, grade, color });
    setName(""); setCredits(3); setGrade(""); setColor(SUBJECT_COLORS[0]);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มรายวิชา">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อวิชา</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น แคลคูลัส 2" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>หน่วยกิต</label>
            <input type="number" min={0} max={10} className={inputCls} value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>เกรด</label>
            <select className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">ยังไม่ทราบ</option>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>สี</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>เพิ่ม</Button>
        </div>
      </div>
    </Modal>
  );
}
