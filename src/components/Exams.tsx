import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Globe, MapPin, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import type { Exam } from "../types";
import { useStore } from "../store";
import { uid } from "../storage";
import { daysFromToday, formatThaiDate, formatThaiTime, toISODate, WEEKDAY_LETTERS } from "../lib";
import { Button, Modal, inputCls, labelCls } from "./ui";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// ─── ICS / iCal parser ────────────────────────────────────────────

function unescapeICS(s: string): string {
  return s.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseDTValue(raw: string): string | null {
  // Handle TZID=...:VALUE form — take only the part after the last ":"
  const val = raw.includes(":") ? raw.slice(raw.lastIndexOf(":") + 1) : raw;
  const clean = val.replace(/Z$/, "");
  const t = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (t) return `${t[1]}-${t[2]}-${t[3]}T${t[4]}:${t[5]}`;
  const d = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}T00:00`;
  return null;
}

function parseICS(text: string): Exam[] {
  // Normalise line endings and unfold continuation lines (RFC 5545 §3.1)
  const lines: string[] = [];
  for (const ln of text.replace(/\r\n|\r/g, "\n").split("\n")) {
    if (/^[ \t]/.test(ln) && lines.length > 0) lines[lines.length - 1] += ln.slice(1);
    else lines.push(ln);
  }

  const events: Exam[] = [];
  let inEvent = false;
  let cur: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inEvent = true; cur = {}; continue; }
    if (line === "END:VEVENT") {
      inEvent = false;
      const date = parseDTValue(cur.dtstart ?? "");
      if (cur.summary && date) {
        events.push({
          id: `gcal_${cur.uid ?? Math.random().toString(36).slice(2)}`,
          subject: unescapeICS(cur.summary),
          date,
          room: unescapeICS(cur.location ?? ""),
          detail: unescapeICS(cur.description ?? ""),
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const ci = line.indexOf(":");
    if (ci < 0) continue;
    // Strip parameter part (e.g. DTSTART;TZID=Asia/Bangkok → "dtstart")
    const rawKey = line.slice(0, ci).replace(/;.*$/, "").toUpperCase();
    const val = line.slice(ci + 1);
    if (rawKey === "DTSTART") cur.dtstart = line.slice(ci + 1); // keep full TZID form
    else if (rawKey === "SUMMARY") cur.summary = val;
    else if (rawKey === "LOCATION") cur.location = val;
    else if (rawKey === "DESCRIPTION") cur.description = val;
    else if (rawKey === "UID") cur.uid = val;
  }
  return events;
}

// ─── localStorage keys ────────────────────────────────────────────
// fetch helpers (CORS-safe)
function normalizeIcalUrl(raw: string): string {
  let u = raw.trim();
  if (u.toLowerCase().startsWith("webcal://")) u = "https://" + u.slice(9);
  return u;
}

async function fetchIcsText(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, responseType: "text" });
    if (res.status < 200 || res.status >= 300) throw new Error("เซิร์ฟเวอร์ตอบ HTTP " + res.status);
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }
  try {
    const r = await fetch(url);
    if (r.ok) return await r.text();
  } catch (e) { /* CORS/network */ }
  const proxied = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
  const res = await fetch(proxied);
  if (!res.ok) throw new Error("พร็อกซีดึงข้อมูลไม่สำเร็จ (HTTP " + res.status + ")");
  return await res.text();
}

const GCAL_URL_KEY = "sh:gcal_url";
const GCAL_EVENTS_KEY = "sh:gcal_events";
const GCAL_SYNCED_KEY = "sh:gcal_synced";

function loadGcalEvents(): Exam[] {
  try { return JSON.parse(localStorage.getItem(GCAL_EVENTS_KEY) ?? "[]"); } catch { return []; }
}

// ─── Component ────────────────────────────────────────────────────
export default function Exams() {
  const { exams, setExams, subjects } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: subjects[0] ?? "",
    date: toISODate(now),
    time: "09:00",
    room: "",
    detail: "",
  });

  // ── Google Calendar sync state ──
  const [icalUrl, setIcalUrl] = useState(() => localStorage.getItem(GCAL_URL_KEY) ?? "");
  const [gcalEvents, setGcalEventsState] = useState<Exam[]>(loadGcalEvents);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [lastSynced, setLastSynced] = useState<number | null>(() => {
    const t = localStorage.getItem(GCAL_SYNCED_KEY);
    return t ? Number(t) : null;
  });
  const [showIcalPanel, setShowIcalPanel] = useState(false);
  const [syncError, setSyncError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const saveGcal = (events: Exam[]) => {
    setGcalEventsState(events);
    localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(events));
    const ts = Date.now();
    setLastSynced(ts);
    localStorage.setItem(GCAL_SYNCED_KEY, String(ts));
    setSyncStatus("done");
  };

  const doSync = async () => {
    const raw = icalUrl.trim();
    if (!raw) return;
    localStorage.setItem(GCAL_URL_KEY, raw);
    setSyncStatus("syncing");
    setSyncError("");
    try {
      const text = await fetchIcsText(normalizeIcalUrl(raw));
      if (!/BEGIN:VCALENDAR/i.test(text)) {
        throw new Error("ลิงก์นี้ไม่ใช่ปฏิทิน iCal — ตรวจว่าคัดลอกที่อยู่ลับในรูปแบบ iCal มาถูกต้อง");
      }
      saveGcal(parseICS(text));
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err instanceof Error ? err.message : "ดึงปฏิทินไม่สำเร็จ");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      saveGcal(parseICS(ev.target?.result as string));
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const isGcal = (e: Exam) => e.id.startsWith("gcal_");

  // Merge manual + Google events for display
  const allExams = useMemo(() => [...exams, ...gcalEvents], [exams, gcalEvents]);

  const colorOf = (subject: string) => {
    const palette = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
    let h = 0;
    for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  };

  const todayIso = toISODate(now);
  const examByDay = useMemo(() => {
    const m: Record<string, Exam[]> = {};
    for (const e of allExams) {
      const day = e.date.slice(0, 10);
      (m[day] ||= []).push(e);
    }
    return m;
  }, [allExams]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      arr.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return arr;
  }, [year, month]);

  const move = (delta: number) => {
    const m = month + delta;
    if (m < 0) { setMonth(11); setYear((y) => y - 1); }
    else if (m > 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth(m);
    setSelected(null);
  };

  const listed = useMemo(() => {
    const base = selected
      ? allExams.filter((e) => e.date.slice(0, 10) === selected)
      : allExams.filter((e) => daysFromToday(e.date) >= 0);
    return [...base].sort((a, b) => a.date.localeCompare(b.date));
  }, [allExams, selected]);

  const remove = (e: Exam) => {
    if (isGcal(e)) {
      const next = gcalEvents.filter((x) => x.id !== e.id);
      setGcalEventsState(next);
      localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(next));
    } else {
      setExams((prev) => prev.filter((x) => x.id !== e.id));
    }
  };

  const add = () => {
    if (!form.subject.trim() || !form.date) return;
    setExams((prev) => [
      ...prev,
      { id: uid(), subject: form.subject.trim(), date: `${form.date}T${form.time}`, room: form.room.trim(), detail: form.detail.trim() },
    ]);
    setForm({ subject: subjects[0] ?? "", date: toISODate(now), time: "09:00", room: "", detail: "" });
    setOpen(false);
  };

  const syncLabel =
    syncStatus === "syncing" ? "กำลังซิงก์..." :
    syncStatus === "done"    ? "ซิงก์แล้ว ✓" :
    syncStatus === "error"   ? "ล้มเหลว ✗" :
    "ซิงก์ใหม่";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fg">ปฏิทินสอบ</h1>
          <p className="text-sm text-muted">วางแผนอ่านหนังสือล่วงหน้า</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowIcalPanel((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              showIcalPanel ? "bg-brand text-white" : "bg-surface2 text-muted hover:bg-brand/15 hover:text-brand"
            }`}
          >
            <Globe size={15} /> Google Calendar
            {gcalEvents.length > 0 && (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">{gcalEvents.length}</span>
            )}
          </button>
          <Button onClick={() => setOpen(true)}><Plus size={18} /> เพิ่มการสอบ</Button>
        </div>
      </div>

      {/* Google Calendar Sync Panel */}
      <AnimatePresence>
        {showIcalPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Globe size={18} className="text-brand shrink-0" />
                <p className="font-bold text-fg">ซิงก์ Google Calendar</p>
                {lastSynced && (
                  <span className="ml-auto text-xs text-muted">
                    ซิงก์ล่าสุด {new Date(lastSynced).toLocaleTimeString("th-TH")}
                  </span>
                )}
              </div>

              {/* URL input + sync button */}
              <div className="flex gap-2">
                <input
                  className={inputCls + " flex-1 min-w-0"}
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  placeholder="วาง Secret iCal URL ของ Google Calendar..."
                />
                <button
                  onClick={doSync}
                  disabled={syncStatus === "syncing" || !icalUrl.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/80 disabled:opacity-50 transition"
                >
                  <RefreshCw size={14} className={syncStatus === "syncing" ? "animate-spin" : ""} />
                  {syncLabel}
                </button>
              </div>

              {/* File import fallback */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted text-xs">หรือ</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold text-muted hover:bg-brand/15 hover:text-brand transition"
                >
                  <Upload size={14} /> นำเข้าไฟล์ .ics
                </button>
                <input ref={fileRef} type="file" accept=".ics" className="hidden" onChange={handleFile} />
                <span className="text-xs text-muted">(สำรองเผื่อ CORS บล็อก URL — APK รองรับ fetch ตรง)</span>
              </div>

              {/* Status / count */}
              {gcalEvents.length > 0 && (
                <p className="text-xs text-emerald-500 font-semibold">
                  📅 โหลดแล้ว {gcalEvents.length} นัดหมายจาก Google Calendar
                </p>
              )}
              {syncStatus === "error" && (
                <p className="text-xs text-rose-500 font-semibold">
                  ⚠ {syncError || "ดึงข้อมูลไม่สำเร็จ"} — ถ้ายังไม่ได้ ลองนำเข้าไฟล์ .ics แทน
                </p>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  นัดหมายที่กรอกเอง
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  นัดหมายจาก Google Calendar
                </span>
              </div>

              {/* How-to guide */}
              <details className="text-xs text-muted">
                <summary className="cursor-pointer font-semibold text-brand hover:underline select-none">
                  วิธีหา Secret iCal URL ของ Google Calendar ▸
                </summary>
                <ol className="mt-2 space-y-1 pl-4 list-decimal leading-relaxed">
                  <li>เปิด Google Calendar บนเว็บ (calendar.google.com)</li>
                  <li>คลิกจุด 3 จุด (⋮) ข้างชื่อปฏิทิน → "การตั้งค่าและการแชร์"</li>
                  <li>เลื่อนลงหัวข้อ "ผสานปฏิทิน" → "ที่อยู่ลับในรูปแบบ iCal"</li>
                  <li>คัดลอก URL แล้ววางในช่องด้านบน</li>
                  <li>บน APK: กด ซิงก์ใหม่ ได้เลย &nbsp;|&nbsp; บนเว็บ: ให้ export ไฟล์ .ics แล้ว import แทน</li>
                </ol>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ปฏิทิน */}
        <div className="glass rounded-3xl p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface2 hover:text-fg">
              <ChevronLeft size={18} />
            </button>
            <p className="text-lg font-extrabold text-fg">{MONTHS[month]} {year + 543}</p>
            <button onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface2 hover:text-fg">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
            {WEEKDAY_LETTERS.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const day = Number(iso.slice(8));
              const dayExams = examByDay[iso] ?? [];
              const isToday = iso === todayIso;
              const isSel = iso === selected;
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(isSel ? null : iso)}
                  className={`relative aspect-square rounded-xl p-1 text-sm font-medium transition ${
                    isSel ? "bg-brand text-white" :
                    isToday ? "bg-brand/15 text-brand" :
                    "text-fg hover:bg-surface2"
                  }`}
                >
                  {day}
                  {dayExams.length > 0 && (
                    <span className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
                      {dayExams.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: isSel ? "#fff" : isGcal(e) ? "#34d399" : colorOf(e.subject) }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* รายการ */}
        <div className="space-y-3 lg:col-span-2">
          <p className="text-sm font-bold text-muted">
            {selected ? `การสอบ/นัดหมาย ${formatThaiDate(selected)}` : "การสอบ/นัดหมายที่จะถึง"}
          </p>
          <AnimatePresence initial={false}>
            {listed.map((e) => {
              const d = daysFromToday(e.date);
              const gcal = isGcal(e);
              const c = gcal ? "#34d399" : colorOf(e.subject);
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: c + "22", color: c }}
                        >
                          {e.subject}
                        </span>
                        {gcal && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                            📅 Google
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-fg">
                        {formatThaiDate(e.date)} · {formatThaiTime(e.date)}
                      </p>
                      {e.room && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <MapPin size={12} /> {e.room}
                        </p>
                      )}
                      {e.detail && (
                        <p className="mt-1 text-xs text-muted line-clamp-2">{e.detail}</p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(e)}
                      aria-label="ลบ"
                      className="rounded-lg p-1.5 text-muted hover:bg-rose-500/15 hover:text-rose-500 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className={`mt-2 text-xs font-bold ${
                    d < 0 ? "text-muted" : d === 0 ? "text-rose-500" : "text-brand"
                  }`}>
                    {d < 0 ? "ผ่านไปแล้ว" : d === 0 ? "สอบวันนี้!" : `อีก ${d} วัน`}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {listed.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-line py-10 text-center text-sm text-muted">
              ไม่มีการสอบ{selected ? "ในวันนี้" : "ที่จะถึง"}
            </p>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มการสอบ">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>วิชา</label>
            {subjects.length > 0 ? (
              <select
                className={inputCls}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                className={inputCls}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="ชื่อวิชา"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>วันที่สอบ</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>เวลา</label>
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>ห้องสอบ</label>
            <input className={inputCls} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="เช่น หอประชุม A" />
          </div>
          <div>
            <label className={labelCls}>รายละเอียด</label>
            <textarea className={inputCls} rows={2} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="ขอบเขต บทที่ 1–4" />
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
