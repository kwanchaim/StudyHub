import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Globe, MapPin, Pencil, Plus, RefreshCw, Trash2, Upload, ExternalLink } from "lucide-react";
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

// ─── ICS parser ───────────────────────────────────────────────────
function unescapeICS(s: string): string {
  return s.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseDTValue(raw: string): string | null {
  const val = raw.includes(":") ? raw.slice(raw.lastIndexOf(":") + 1) : raw;
  const clean = val.replace(/Z$/, "");
  const t = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (t) return `${t[1]}-${t[2]}-${t[3]}T${t[4]}:${t[5]}`;
  const d = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}T00:00`;
  return null;
}

function parseICS(text: string): Exam[] {
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
    const rawKey = line.slice(0, ci).replace(/;.*$/, "").toUpperCase();
    const val = line.slice(ci + 1);
    if (rawKey === "DTSTART") cur.dtstart = line.slice(ci + 1);
    else if (rawKey === "SUMMARY") cur.summary = val;
    else if (rawKey === "LOCATION") cur.location = val;
    else if (rawKey === "DESCRIPTION") cur.description = val;
    else if (rawKey === "UID") cur.uid = val;
  }
  return events;
}

function normalizeIcalUrl(raw: string): string {
  let u = raw.trim();
  if (u.toLowerCase().startsWith("webcal://")) u = "https://" + u.slice(9);
  return u;
}

async function fetchIcsText(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url,
      responseType: "text",
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
    if (res.status < 200 || res.status >= 300) throw new Error("HTTP_" + res.status);
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }
  try {
    const r = await fetch(url);
    if (r.ok) return r.text();
  } catch { /* CORS — try proxy */ }
  try {
    const m = url.match(/^https?:\/\/calendar\.google\.com\/(.*)$/i);
    if (m) {
      const r2 = await fetch("/gcal-proxy/" + m[1]);
      if (r2.ok) return r2.text();
    }
  } catch { /* proxy failed */ }
  throw new Error("CORS_BLOCK");
}

const GCAL_URL_KEY = "sh:gcal_url";
const GCAL_EVENTS_KEY = "sh:gcal_events";
const GCAL_SYNCED_KEY = "sh:gcal_synced";

function loadGcalEvents(): Exam[] {
  try { return JSON.parse(localStorage.getItem(GCAL_EVENTS_KEY) ?? "[]"); } catch { return []; }
}

// ─── สร้าง Google Calendar URL สำหรับเพิ่ม event ─────────────────
function makeGCalUrl(event: { subject: string; date: string; room: string; detail: string }): string {
  const d = new Date(event.date);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtDate = (dt: Date) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const end = new Date(d.getTime() + 60 * 60 * 1000); // +1 ชั่วโมง
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.subject,
    dates: `${fmtDate(d)}/${fmtDate(end)}`,
    details: event.detail || "",
    location: event.room || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── รวม CalEvent ──────────────────────────────────────────────────
type EventType = "local" | "gcal" | "assignment";
interface CalEvent extends Exam {
  _type: EventType;
}

// ─── Component ────────────────────────────────────────────────────
export default function Exams() {
  const { exams, setExams, subjects, assignments, setAssignments } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: subjects[0] ?? "",
    date: toISODate(now),
    time: "09:00",
    room: "",
    detail: "",
  });

  // แก้ไขงาน/การบ้านที่โผล่ในปฏิทิน
  const [asgnEdit, setAsgnEdit] = useState<{ id: string; title: string; subject: string; due: string; detail: string } | null>(null);
  const [savedEvent, setSavedEvent] = useState<Exam | null>(null);

  // ── toggle sources ──
  const [showLocal, setShowLocal] = useState(true);
  const [showGoogle, setShowGoogle] = useState(true);
  const [showAssignments, setShowAssignments] = useState(true);

  // ── Google Calendar sync ──
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
    const url = normalizeIcalUrl(raw);
    setIcalUrl(url);
    localStorage.setItem(GCAL_URL_KEY, url);
    setSyncStatus("syncing");
    setSyncError("");
    try {
      const text = await fetchIcsText(url);
      if (!text.includes("BEGIN:VCALENDAR") && !text.includes("BEGIN:VEVENT")) throw new Error("NOT_ICS");
      saveGcal(parseICS(text));
    } catch (err) {
      setSyncStatus("error");
      const msg = err instanceof Error ? err.message : "";
      if (msg === "CORS_BLOCK" || msg.includes("Failed to fetch") || msg.includes("Load failed") || msg.includes("NetworkError")) setSyncError("CORS");
      else if (msg === "NOT_ICS") setSyncError("NOT_ICS");
      else if (msg.startsWith("HTTP_")) setSyncError(msg);
      else setSyncError("UNKNOWN");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { saveGcal(parseICS(ev.target?.result as string)); };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  // แปลง assignments → CalEvent
  const assignmentEvents = useMemo((): CalEvent[] =>
    assignments.filter((a) => !a.done).map((a) => ({
      id: `asgn_${a.id}`,
      subject: a.title,
      date: `${a.due}T23:59`,
      room: a.subject,
      detail: a.detail,
      _type: "assignment" as EventType,
    })),
    [assignments]
  );

  // รวมทุกแหล่ง
  const allEvents = useMemo((): CalEvent[] => {
    const list: CalEvent[] = [];
    if (showLocal) list.push(...exams.map((e) => ({ ...e, _type: "local" as EventType })));
    if (showGoogle) list.push(...gcalEvents.map((e) => ({ ...e, _type: "gcal" as EventType })));
    if (showAssignments) list.push(...assignmentEvents);
    return list;
  }, [exams, gcalEvents, assignmentEvents, showLocal, showGoogle, showAssignments]);

  const colorOf = (e: CalEvent): string => {
    if (e._type === "gcal") return "#10b981";
    if (e._type === "assignment") return "#f59e0b";
    const palette = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
    let h = 0;
    for (const ch of e.subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  };

  const todayIso = toISODate(now);
  const eventByDay = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const e of allEvents) {
      const day = e.date.slice(0, 10);
      (m[day] ||= []).push(e);
    }
    return m;
  }, [allEvents]);

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
      ? allEvents.filter((e) => e.date.slice(0, 10) === selected)
      : allEvents.filter((e) => daysFromToday(e.date) >= 0);
    return [...base].sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, selected]);

  const remove = (e: CalEvent) => {
    if (e._type === "gcal") {
      const next = gcalEvents.filter((x) => x.id !== e.id);
      setGcalEventsState(next);
      localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(next));
    } else if (e._type === "local") {
      setExams((prev) => prev.filter((x) => x.id !== e.id));
    } else if (e._type === "assignment") {
      const realId = e.id.replace(/^asgn_/, "");
      setAssignments((prev) => prev.filter((x) => x.id !== realId));
    }
  };

  // เปิดแก้ไขงาน/การบ้านจากปฏิทิน
  const openAsgnEdit = (e: CalEvent) => {
    const realId = e.id.replace(/^asgn_/, "");
    const a = assignments.find((x) => x.id === realId);
    if (!a) return;
    setAsgnEdit({ id: a.id, title: a.title, subject: a.subject, due: a.due, detail: a.detail });
  };

  const saveAsgnEdit = () => {
    if (!asgnEdit || !asgnEdit.title.trim()) return;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === asgnEdit.id
          ? { ...a, title: asgnEdit.title.trim(), subject: asgnEdit.subject.trim() || "ทั่วไป", due: asgnEdit.due, detail: asgnEdit.detail.trim() }
          : a,
      ),
    );
    setAsgnEdit(null);
  };

  const resetForm = () => setForm({ subject: subjects[0] ?? "", date: toISODate(now), time: "09:00", room: "", detail: "" });

  const openNew = () => {
    setEditingId(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (e: CalEvent) => {
    if (e._type !== "local" && e._type !== "gcal") return; // แก้ได้ทั้งกิจกรรมในแอปและ Google
    setEditingId(e.id);
    const [datePart, timePart] = e.date.split("T");
    setForm({
      subject: e.subject,
      date: datePart,
      time: (timePart ?? "09:00").slice(0, 5),
      room: e.room,
      detail: e.detail,
    });
    setOpen(true);
  };

  const editingGcal = editingId?.startsWith("gcal_") ?? false;

  const add = (saveWhere: "local" | "google" | "both") => {
    if (!form.subject.trim() || !form.date) return;
    const data = {
      subject: form.subject.trim(),
      date: `${form.date}T${form.time}`,
      room: form.room.trim(),
      detail: form.detail.trim(),
    };
    if (editingId) {
      const updated: Exam = { id: editingId, ...data };
      if (editingGcal) {
        // แก้ไขในแคช Google ของแอป (ซิงก์ใหม่จะถูกเขียนทับ)
        const next = gcalEvents.map((x) => (x.id === editingId ? updated : x));
        setGcalEventsState(next);
        localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(next));
      } else {
        setExams((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...data } : e)));
      }
      if (saveWhere === "both" || saveWhere === "google") {
        window.open(makeGCalUrl(updated), "_blank", "noopener");
      }
      setSavedEvent(updated);
    } else {
      const newEvent: Exam = { id: uid(), ...data };
      if (saveWhere === "local" || saveWhere === "both") {
        setExams((prev) => [...prev, newEvent]);
      }
      if (saveWhere === "google" || saveWhere === "both") {
        window.open(makeGCalUrl(newEvent), "_blank", "noopener");
      }
      setSavedEvent(newEvent);
    }
    resetForm();
    setEditingId(null);
    setOpen(false);
  };

  const syncLabel =
    syncStatus === "syncing" ? "กำลังซิงก์..." :
    syncStatus === "done" ? "ซิงก์แล้ว ✓" :
    syncStatus === "error" ? "ล้มเหลว ✗" :
    "ซิงก์ใหม่";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fg">ปฏิทิน</h1>
          <p className="text-sm text-muted">กิจกรรม งาน และนัดหมายทั้งหมด</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Source toggles */}
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/50 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted">
              <input type="checkbox" checked={showLocal} onChange={(e) => setShowLocal(e.target.checked)} className="accent-[var(--color-brand)]" />
              <span className="h-2 w-2 rounded-full bg-brand inline-block" /> Local
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted">
              <input type="checkbox" checked={showGoogle} onChange={(e) => setShowGoogle(e.target.checked)} className="accent-emerald-500" />
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Google
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted">
              <input type="checkbox" checked={showAssignments} onChange={(e) => setShowAssignments(e.target.checked)} className="accent-amber-500" />
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> งาน
            </label>
          </div>
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
          <Button onClick={openNew}><Plus size={18} /> เพิ่มกิจกรรม</Button>
        </div>
      </div>

      {/* Google Calendar Sync Panel */}
      <AnimatePresence>
        {showIcalPanel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Globe size={18} className="text-brand shrink-0" />
                <p className="font-bold text-fg">ซิงก์ Google Calendar</p>
                {lastSynced && (
                  <span className="ml-auto text-xs text-muted">ซิงก์ล่าสุด {new Date(lastSynced).toLocaleTimeString("th-TH")}</span>
                )}
              </div>
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
              {syncStatus === "error" && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 space-y-1.5">
                  {syncError === "CORS" && (
                    <><p className="text-xs font-bold text-rose-500">⚠ เบราว์เซอร์บล็อก (CORS)</p>
                    <p className="text-xs text-rose-400 leading-relaxed">กรุณาใช้ปุ่ม <strong className="text-rose-300">"นำเข้าไฟล์ .ics"</strong> แทน</p></>
                  )}
                  {syncError === "NOT_ICS" && (
                    <><p className="text-xs font-bold text-rose-500">⚠ ไม่ใช่ไฟล์ iCal</p>
                    <p className="text-xs text-rose-400">ตรวจสอบว่าคัดลอก URL มาถูกต้อง</p></>
                  )}
                  {syncError.startsWith("HTTP_") && (
                    <><p className="text-xs font-bold text-rose-500">⚠ URL ตอบสนองผิดพลาด ({syncError.replace("HTTP_", "HTTP ")})</p>
                    <p className="text-xs text-rose-400">URL อาจหมดอายุหรือเปลี่ยนแล้ว</p></>
                  )}
                  {syncError === "UNKNOWN" && (
                    <><p className="text-xs font-bold text-rose-500">⚠ เกิดข้อผิดพลาด</p>
                    <p className="text-xs text-rose-400">ตรวจการเชื่อมต่ออินเทอร์เน็ต หรือนำเข้าไฟล์ .ics แทน</p></>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    syncError === "CORS"
                      ? "bg-brand text-white hover:bg-brand/80 shadow-lg shadow-brand/20"
                      : "bg-surface2 text-muted hover:bg-brand/15 hover:text-brand"
                  }`}
                >
                  <Upload size={14} /> นำเข้าไฟล์ .ics
                </button>
                <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={handleFile} />
                <span className="text-xs text-muted">
                  {Capacitor.isNativePlatform() ? "ทางเลือกสำรอง" : "วิธีแนะนำบนเบราว์เซอร์ — Google Calendar → ⚙ → Export"}
                </span>
              </div>
              {syncStatus === "done" && gcalEvents.length > 0 && (
                <p className="text-xs text-emerald-500 font-semibold">✓ โหลดแล้ว {gcalEvents.length} นัดหมายจาก Google Calendar</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> กิจกรรมที่กรอกเอง</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Google Calendar</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> งาน/การบ้าน</span>
              </div>
              <details className="text-xs text-muted">
                <summary className="cursor-pointer font-semibold text-brand hover:underline select-none">วิธีหา Secret iCal URL ▸</summary>
                <ol className="mt-2 space-y-1 pl-4 list-decimal leading-relaxed">
                  <li>เปิด Google Calendar บนเว็บ (calendar.google.com)</li>
                  <li>คลิกจุด 3 จุด (⋮) ข้างชื่อปฏิทิน → "การตั้งค่าและการแชร์"</li>
                  <li>เลื่อนลงหัวข้อ "ผสานปฏิทิน" → "ที่อยู่ลับในรูปแบบ iCal"</li>
                  <li>คัดลอก URL แล้ววางในช่องด้านบน</li>
                  <li>บน APK: กด ซิงก์ใหม่ | บนเว็บ: export ไฟล์ .ics แล้ว import</li>
                </ol>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ปฏิทิน - Full width Google Calendar style */}
      <div className="glass rounded-3xl p-4 md:p-6">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface2 hover:text-fg">
            <ChevronLeft size={18} />
          </button>
          <p className="text-lg font-extrabold text-fg">{MONTHS[month]} {year + 543}</p>
          <button onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface2 hover:text-fg">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
          {WEEKDAY_LETTERS.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} className="min-h-[60px] md:min-h-[80px]" />;
            const day = Number(iso.slice(8));
            const dayEvents = eventByDay[iso] ?? [];
            const isToday = iso === todayIso;
            const isSel = iso === selected;
            const MAX_SHOW = 2;
            const extra = dayEvents.length - MAX_SHOW;
            return (
              <button
                key={iso}
                onClick={() => setSelected(isSel ? null : iso)}
                className={`relative flex min-h-[60px] md:min-h-[85px] flex-col rounded-xl p-1 text-left transition ${
                  isSel
                    ? "bg-brand/20 ring-2 ring-brand"
                    : isToday
                    ? "bg-brand/10"
                    : "hover:bg-surface2"
                }`}
              >
                {/* Date number */}
                <span className={`mb-1 text-xs font-bold leading-none self-end pr-0.5 ${
                  isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[11px]"
                  : isSel ? "text-brand" : "text-fg"
                }`}>
                  {day}
                </span>

                {/* Event pills */}
                <div className="flex flex-col gap-0.5 w-full">
                  {dayEvents.slice(0, MAX_SHOW).map((e, idx) => {
                    const c = colorOf(e);
                    return (
                      <div
                        key={idx}
                        className="truncate rounded px-1 py-0.5 text-[9px] md:text-[10px] font-semibold text-white leading-tight"
                        style={{ backgroundColor: c }}
                        title={e.subject}
                      >
                        {e.subject}
                      </div>
                    );
                  })}
                  {extra > 0 && (
                    <span className="text-[9px] text-muted font-medium pl-0.5">+{extra} อีก</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* รายการ */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-muted">
          {selected ? `กิจกรรม ${formatThaiDate(selected)}` : "กิจกรรมที่จะถึง"}
        </p>
        <AnimatePresence initial={false}>
          {listed.map((e) => {
            const d = daysFromToday(e.date);
            const c = colorOf(e);
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: c + "22", color: c }}>
                        {e._type === "assignment" ? "📝 งาน" : e._type === "gcal" ? "📅 Google" : "📋 กิจกรรม"}
                      </span>
                      <span className="text-sm font-semibold text-fg">{e.subject}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatThaiDate(e.date)} · {e._type === "assignment" ? "ครบกำหนด" : formatThaiTime(e.date)}
                    </p>
                    {e.room && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <MapPin size={12} /> {e.room}
                      </p>
                    )}
                    {e.detail && <p className="mt-1 text-xs text-muted line-clamp-2">{e.detail}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => (e._type === "assignment" ? openAsgnEdit(e) : openEdit(e))}
                      aria-label="แก้ไข"
                      className="rounded-lg p-1.5 text-muted hover:bg-brand/15 hover:text-brand transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(e)}
                      aria-label="ลบ"
                      className="rounded-lg p-1.5 text-muted hover:bg-rose-500/15 hover:text-rose-500 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                    {e._type === "local" && (
                      <a
                        href={makeGCalUrl(e)}
                        target="_blank"
                        rel="noopener"
                        className="rounded-lg p-1.5 text-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition"
                        title="เพิ่มลง Google Calendar"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
                <p className={`mt-2 text-xs font-bold ${
                  d < 0 ? "text-muted" : d === 0 ? "text-rose-500" : "text-brand"
                }`}>
                  {d < 0 ? "ผ่านไปแล้ว" : d === 0 ? "วันนี้!" : `อีก ${d} วัน`}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {listed.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-line py-10 text-center text-sm text-muted">
            ไม่มีกิจกรรม{selected ? "ในวันที่เลือก" : "ที่จะถึง"}
          </p>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไขกิจกรรม */}
      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "แก้ไขกิจกรรม / นัดหมาย" : "เพิ่มกิจกรรม / นัดหมาย"}>
        <div className="space-y-4">
          {editingGcal && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-xs font-bold text-amber-500">📅 กิจกรรมจาก Google Calendar</p>
              <p className="text-xs text-amber-400/90 mt-0.5 leading-relaxed">
                การแก้ไขจะบันทึกในแอปเท่านั้น — ถ้าซิงก์ Google ใหม่ ข้อมูลจะถูกเขียนทับด้วยของจริง
                (กด "บันทึก + Google" เพื่อเปิด Google Calendar แล้วแก้ที่ต้นทางด้วย)
              </p>
            </div>
          )}
          <div>
            <label className={labelCls}>ชื่อกิจกรรม / วิชา</label>
            {subjects.length > 0 ? (
              <select className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="ชื่อกิจกรรม / วิชา" autoFocus />
            )}
          </div>
          {subjects.length > 0 && (
            <div>
              <label className={labelCls}>หรือพิมพ์ชื่อเอง</label>
              <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="ชื่อกิจกรรม" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>วันที่</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>เวลา</label>
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>ห้อง / สถานที่</label>
            <input className={inputCls} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="เช่น หอประชุม A" />
          </div>
          <div>
            <label className={labelCls}>รายละเอียด</label>
            <textarea className={inputCls} rows={2} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="ขอบเขต บทที่ 1–4 หรือรายละเอียดอื่นๆ" />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-xs text-muted font-semibold">{editingId ? "อัปเดต" : "บันทึกที่ไหน?"}</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">ยกเลิก</Button>
              <Button onClick={() => add("local")} className="flex-1">💾 {editingId ? "บันทึกการแก้ไข" : "บันทึกใน App"}</Button>
              <button
                onClick={() => add("both")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition"
              >
                <ExternalLink size={14} /> {editingId ? "บันทึก + Google" : "บันทึก + Google"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal แก้ไขงาน/การบ้าน (จากปฏิทิน) */}
      <Modal open={!!asgnEdit} onClose={() => setAsgnEdit(null)} title="แก้ไขงาน / การบ้าน">
        {asgnEdit && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>ชื่องาน</label>
              <input className={inputCls} value={asgnEdit.title} onChange={(e) => setAsgnEdit({ ...asgnEdit, title: e.target.value })} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>วิชา</label>
                <input className={inputCls} value={asgnEdit.subject} onChange={(e) => setAsgnEdit({ ...asgnEdit, subject: e.target.value })} placeholder="ชื่อวิชา" />
              </div>
              <div>
                <label className={labelCls}>กำหนดส่ง</label>
                <input type="date" className={inputCls} value={asgnEdit.due} onChange={(e) => setAsgnEdit({ ...asgnEdit, due: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>รายละเอียด</label>
              <textarea className={inputCls} rows={2} value={asgnEdit.detail} onChange={(e) => setAsgnEdit({ ...asgnEdit, detail: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAsgnEdit(null)}>ยกเลิก</Button>
              <Button onClick={saveAsgnEdit}>บันทึก</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast สำหรับ Google Calendar link */}
      <AnimatePresence>
        {savedEvent && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            onAnimationComplete={() => setTimeout(() => setSavedEvent(null), 4000)}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-surface border border-line shadow-xl px-4 py-3 min-w-[260px]"
          >
            <span className="text-emerald-500 font-bold text-sm">✓ บันทึกแล้ว</span>
            <a
              href={makeGCalUrl(savedEvent)}
              target="_blank"
              rel="noopener"
              className="ml-auto flex items-center gap-1 text-xs text-brand font-semibold hover:underline"
              onClick={() => setSavedEvent(null)}
            >
              เพิ่มลง Google Calendar <ExternalLink size={11} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
