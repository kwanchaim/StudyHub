import { useRef, useState } from "react";
import { Download, HardDrive, RotateCcw, Shield, Upload, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { AnimatePresence, motion } from "framer-motion";
import {
  BACKUP_APP_ID,
  applyBackup,
  backupFilename,
  collectBackup,
  type BackupFile,
} from "../lib/backup";
import { Button } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BackupModal({ open, onClose }: Props) {
  const [exportStatus, setExportStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [keyCount, setKeyCount] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExportStatus("busy");
    try {
      const backup = await collectBackup();
      const total = Object.keys(backup.localStorage).length + Object.keys(backup.preferences).length;
      setKeyCount(total);
      const json = JSON.stringify(backup, null, 2);
      const filename = backupFilename();

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
        await Share.share({ title: "สำรองข้อมูล Study Hub", text: `ไฟล์สำรอง ${filename} — ${total} รายการ`, url: uri, dialogTitle: "บันทึกไฟล์สำรองไปที่..." });
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
      setExportStatus("done");
      window.setTimeout(() => setExportStatus("idle"), 3000);
    } catch {
      setExportStatus("error");
      window.setTimeout(() => setExportStatus("idle"), 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportStatus("busy");
    setImportMsg("");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        let backup: BackupFile;
        try { backup = JSON.parse(ev.target?.result as string); }
        catch { setImportStatus("error"); setImportMsg("ไฟล์ไม่ใช่ JSON ที่ถูกต้อง"); return; }

        if (backup.app !== BACKUP_APP_ID) {
          setImportStatus("error"); setImportMsg("ไม่ใช่ไฟล์สำรองของ Study Hub"); return;
        }
        if (!backup.localStorage || typeof backup.localStorage !== "object") {
          setImportStatus("error"); setImportMsg("ไฟล์ผิดรูปแบบ"); return;
        }

        const total = Object.keys(backup.localStorage).length + Object.keys(backup.preferences ?? {}).length;
        const ok = window.confirm(
          `กู้คืนจะเขียนทับข้อมูลปัจจุบัน\n` +
          `ไฟล์จาก: ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleString("th-TH") : "ไม่ทราบ"}\n` +
          `รายการ: ${total} key\n\nดำเนินการต่อ?`
        );
        if (!ok) { setImportStatus("idle"); return; }

        await applyBackup(backup);
        setImportStatus("done");
        setImportMsg(`กู้คืน ${total} รายการสำเร็จ — กำลังโหลดใหม่...`);
        window.setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportStatus("error");
        setImportMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    };
    reader.onerror = () => { setImportStatus("error"); setImportMsg("อ่านไฟล์ไม่ได้"); };
    reader.readAsText(file, "utf-8");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 top-[50%] z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-line bg-surface p-6 shadow-2xl"
          >
            {/* header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
                <HardDrive size={20} />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-fg">สำรอง / กู้คืนข้อมูล</p>
                <p className="text-xs text-muted">ย้ายข้อมูลไปเครื่องใหม่หรือเก็บสำรอง</p>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface2 hover:text-fg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* สำรอง */}
            <div className="space-y-3 rounded-2xl border border-line bg-surface2/50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Download size={14} className="text-brand" /> สำรองข้อมูล
              </p>
              <p className="text-xs text-muted leading-relaxed">
                รวมทุก key (ตาราง, งาน, สอบ, โน้ต, แฟลชการ์ด, GPA, XP, Google Calendar) เป็น{" "}
                <code className="rounded bg-surface px-1 text-[11px] font-mono">studyhub-backup-YYYYMMDD.json</code>
              </p>
              <Button
                onClick={handleExport}
                disabled={exportStatus === "busy"}
                className={exportStatus === "error" ? "!bg-rose-500" : exportStatus === "done" ? "!bg-emerald-500" : ""}
              >
                <Download size={15} />
                {exportStatus === "busy" ? "กำลังเตรียม..." :
                 exportStatus === "done" ? `สำรองแล้ว ✓ (${keyCount} key)` :
                 exportStatus === "error" ? "เกิดข้อผิดพลาด ✗" : "สำรองข้อมูล"}
              </Button>
            </div>

            {/* กู้คืน */}
            <div className="mt-3 space-y-3 rounded-2xl border border-line bg-surface2/50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <RotateCcw size={14} className="text-amber-500" /> กู้คืนข้อมูล
              </p>
              <p className="text-xs text-muted">
                เลือกไฟล์ <code className="rounded bg-surface px-1 text-[11px] font-mono">studyhub-backup-*.json</code> — แอปจะโหลดใหม่อัตโนมัติ
              </p>
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={importStatus === "busy"}
                className={importStatus === "error" ? "!border-rose-500 !text-rose-500" : importStatus === "done" ? "!bg-emerald-500" : ""}
              >
                <Upload size={15} />
                {importStatus === "busy" ? "กำลังกู้คืน..." :
                 importStatus === "done" ? "กู้คืนสำเร็จ ✓" :
                 importStatus === "error" ? "ล้มเหลว ✗" : "กู้คืนจากไฟล์ .json"}
              </Button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileSelect} />
              {importMsg && (
                <p className={`text-xs font-semibold ${importStatus === "error" ? "text-rose-500" : "text-emerald-500"}`}>
                  {importStatus === "error" ? "✗ " : "✓ "}{importMsg}
                </p>
              )}
            </div>

            {/* คำเตือน */}
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              <Shield size={12} className="mt-0.5 shrink-0 text-amber-500" />
              <span>ไฟล์สำรองเก็บ <strong>Google Calendar Secret URL</strong> — เก็บในที่ปลอดภัย อย่าแชร์ผู้อื่น</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
