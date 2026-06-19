import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** สไตล์ input / label ที่รองรับธีมมืด-สว่าง */
export const inputCls =
  "w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-fg outline-none transition-all duration-200 placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-brand/15 focus:bg-surface";

export const labelCls = "mb-1.5 block text-sm font-semibold text-muted";

/** การ์ดแก้วฝ้าใช้ซ้ำ */
export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass rounded-3xl p-5 shadow-xl shadow-slate-900/5 ${
        onClick
          ? "cursor-pointer transition-all duration-200 hover:brightness-[1.04] hover:-translate-y-0.5 active:scale-[0.995]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** ปุ่มหลัก พร้อม micro-interaction */
export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm" };
  const styles = {
    primary:
      "bg-gradient-to-r from-brand to-brand2 text-white shadow-lg shadow-brand/30 hover:brightness-110 hover:shadow-xl hover:shadow-brand/35",
    soft: "bg-brand/10 text-brand hover:bg-brand/18",
    ghost: "border border-line bg-surface/60 text-fg hover:bg-surface2 hover:border-line/80",
    danger: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/18",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** ปุ่มไอคอนกลม */
export function IconButton({
  children,
  onClick,
  label,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-xl text-muted transition-all duration-150 hover:bg-surface2 hover:text-fg active:scale-90 ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** ป้ายข้อความเล็ก (รองรับสีวิชา) */
export function Badge({
  children,
  color,
  tone = "soft",
}: {
  children: ReactNode;
  color?: string;
  tone?: "soft" | "solid";
}) {
  if (color) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={
          tone === "solid"
            ? { backgroundColor: color, color: "#fff" }
            : { backgroundColor: color + "26", color }
        }
      >
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-0.5 text-xs font-semibold text-muted">
      {children}
    </span>
  );
}

/** แถบความคืบหน้า */
export function ProgressBar({
  value,
  className = "",
  gradient = true,
}: {
  value: number; // 0..1
  className?: string;
  gradient?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-surface2/80 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${gradient ? "bg-gradient-to-r from-brand via-brand2 to-accent" : "bg-brand"}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

/** กล่อง Modal กลางจอ (มี animation เข้า-ออก) */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`glass-strong w-full ${maxWidth} rounded-3xl p-6 shadow-2xl shadow-slate-950/30`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-fg">{title}</h3>
              <IconButton label="ปิด" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** สถานะว่างเปล่า */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-in grid place-items-center rounded-3xl border-2 border-dashed border-line/60 py-14 text-center">
      <div className="mb-3 text-muted/40">{icon}</div>
      <p className="font-semibold text-muted">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted/60">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** ตัวควบคุมแบบแบ่งส่วน (segmented) สำหรับฟิลเตอร์ */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "text-white" : "text-muted hover:text-fg"
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId="seg-active"
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand to-brand2 shadow shadow-brand/30"
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** หัวข้อ section มาตรฐาน */
export function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-fg">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}
