import { useRef, useState } from "react";
import { Download, HardDrive, RotateCcw, Shield, Upload } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  BACKUP_APP_ID,
  applyBackup,
  backupFilename,
  collectBackup,
  type BackupFile,
} from "../lib/backup";
import { Button } from "./ui";

export default function Settings() {
  const [exportStatus, setExportStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [importMsg, setImportMsg] = useState("");
  const [keyCount, setKeyCount] = useState<number | null>(null);
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
    } catch (e) {
      console.error(e);
      setExportStatus("error");
      window.setTimeout(() => setExportStatus("idle"), 4000);
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
        catch {
          setImportStatus("error");
          setImportMsg("ไฟล์ไม่ใช่ JSON ที่ถูกต้อง — กรุณาเลือกไฟล์ที่ได้จากการสำรองข้อมูล Study Hub");
          return;
        }

        if (backup.app !== BACKUP_APP_ID) {
          setImportStatus("error");
          setImportMsg(`ไฟล์นี้ไม่ใช่ข้อมูล Study Hub (app: "${backup.app}")`);
          return;
        }
        if (!backup.localStorage || typeof backup.localStorage !== "object") {
          setImportStatus("error");
          setImportMsg("ไฟล์ผิดรูปแบบ — ไม่พบข้อมูล localStorage");
          return;
        }

        const total = Object.keys(backup.localStorage).length + Object.keys(backup.preferences ?? {}).length;
        const ok = window.confirm(
          `กู้คืนจะเขียนทับข้อมูลปัจจุบันทั้งหมด\n` +
          `ไฟล์สำรองจาก: ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleString("th-TH") : "ไม่ทราบ"}\n` +
          `รายการทั้งหมด: ${total} key\n\nดำเนินการต่อ?`
        );
        if (!ok) { setImportStatus("idle"); return; }

        await applyBackup(backup);
        setImportStatus("done");
        setImportMsg(`กู้คืนสำเร็จ ${total} รายการ — กำลังโหลดแอปใหม่...`);
        window.setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportStatus("error");
        setImportMsg(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "ไม่ทราบสาเหตุ"}`);
      }
    };
    reader.onerror = () => { setImportStatus("error"); setImportMsg("อ่านไฟล์ไม่ได้ — กรุณาลองอีกครั้ง"); };
    reader.readAsText(file, "utf-8");
  };

  const exportLabel =
    exportStatus === "busy" ? "กำลังเตรียม..." :
    exportStatus === "done" ? `สำรองแล้ว ✓ (${keyCount} key)` :
    exportStatus === "error" ? "เกิดข้อผิดพลาด ✗" : "สำรองข้อมูล";

  const importLabel =
    importStatus === "busy" ? "กำลังกู้คืน..." :
    importStatus === "done" ? "กู้คืนสำเร็จ ✓" :
    importStatus === "error" ? "ล้มเหลว ✗" : "กู้คืนจากไฟล์ .json";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-fg">ตั้งค่า</h1>
        <p className="text-sm text-muted">จัดการข้อมูลและการสำรอง</p>
      </div>

      <div className="glass rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
            <HardDrive size={20} />
          </div>
          <div>
            <p className="font-bold text-fg">สำรอง / กู้คืนข้อมูล</p>
            <p className="text-xs text-muted">ย้ายข้อมูลไปเครื่องใหม่ หรือเก็บสำรองไว้ที่ Google Drive</p>
          </div>
        </div>

        {/* สำรอง */}
        <div className="rounded-2xl border border-line bg-surface2/50 p-4 space-y-3">
          <p className="text-sm font-semibold text-fg flex items-center gap-2">
            <Download size={15} className="text-brand" /> สำรองข้อมูล
          </p>
          <p className="text-xs text-muted leading-relaxed">
            ข้อมูลทั้งหมด — ตาราง, งาน, สอบ, โน้ต, แฟลชการ์ด, GPA, XP, เหรียญรางวัล, Google Calendar URL —
            จะถูกรวมเป็น <code className="rounded bg-surface2 px-1 font-mono text-[11px]">studyhub-backup-YYYYMMDD.json</code>
          </p>
          <Button
            onClick={handleExport}
            disabled={exportStatus === "busy"}
            className={exportStatus === "error" ? "!bg-rose-500" : exportStatus === "done" ? "!bg-emerald-500" : ""}
          >
            <Download size={16} /> {exportLabel}
          </Button>
          {exportStatus === "done" && keyCount !== null && (
            <p className="text-xs text-emerald-500 font-semibold">
              ✓ บันทึกข้อมูล {keyCount} รายการสำเร็จ
              {Capacitor.isNativePlatform() ? " — เลือกปลายทางใน Share Sheet" : " — ไฟล์ดาวน์โหลดแล้ว"}
            </p>
          )}
          {exportStatus === "error" && (
            <p className="text-xs text-rose-500 font-semibold">เกิดข้อผิดพลาดขณะสำรองข้อมูล — ลองอีกครั้ง</p>
          )}
        </div>

        {/* กู้คืน */}
        <div className="rounded-2xl border border-line bg-surface2/50 p-4 space-y-3">
          <p className="text-sm font-semibold text-fg flex items-center gap-2">
            <RotateCcw size={15} className="text-amber-500" /> กู้คืนข้อมูล
          </p>
          <p className="text-xs text-muted leading-relaxed">
            เลือกไฟล์ <code className="rounded bg-surface2 px-1 font-mono text-[11px]">studyhub-backup-*.json</code>
            ที่สำรองไว้ — ข้อมูลปัจจุบันจะถูกแทนที่ แอปจะโหลดใหม่อัตโนมัติ
          </p>
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={importStatus === "busy"}
            variant={importStatus === "error" ? "ghost" : undefined}
            className={importStatus === "error" ? "!border-rose-500 !text-rose-500" : importStatus === "done" ? "!bg-emerald-500" : ""}
          >
            <Upload size={16} /> {importLabel}
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileSelect} />
          {importMsg && (
            <p className={`text-xs font-semibold leading-relaxed ${importStatus === "error" ? "text-rose-500" : "text-emerald-500"}`}>
              {importStatus === "error" ? "✗ " : "✓ "}{importMsg}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
          <Shield size={13} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            ไฟล์สำรองเก็บ <strong>Google Calendar Secret URL</strong> ซึ่งเป็นข้อมูลส่วนตัว —
            อย่าแชร์ไฟล์นี้กับผู้อื่น และเก็บในที่ปลอดภัย
          </span>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 space-y-3">
        <p className="font-bold text-fg">ข้อมูลแอป</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-3">
          {[
            { label: "ชื่อแอป", value: "Study Hub" },
            { label: "เวอร์ชัน", value: "4.0" },
            { label: "แพลตฟอร์ม", value: Capacitor.isNativePlatform() ? "Android (APK)" : "เว็บเบราว์เซอร์" },
            { label: "พื้นที่เก็บข้อมูล", value: "localStorage + Preferences" },
            { label: "การสำรอง", value: "JSON (ครบทุก key)" },
            { label: "รหัสแอป", value: "com.studyhub.app" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface2/50 p-3">
              <p className="font-bold text-muted/70 text-[10px] uppercase tracking-wide">{label}</p>
              <p className="mt-0.5 font-semibold text-fg">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
