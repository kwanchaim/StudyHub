import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Search, Sun, CornerDownLeft } from "lucide-react";
import type { TabKey } from "../types";
import type { NavItem } from "../App";
import { useStore } from "../store";

export default function CommandPalette({
  open,
  onClose,
  nav,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  nav: NavItem[];
  onNavigate: (key: TabKey) => void;
}) {
  const { theme, toggleTheme } = useStore();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = nav.map((n) => ({
      id: n.key,
      label: n.label,
      hint: n.group,
      icon: n.icon,
      run: () => onNavigate(n.key),
    }));
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q));
  }, [query, nav, onNavigate]);

  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1));
  }, [results.length, cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[cursor]?.run();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-strong w-full max-w-xl overflow-hidden rounded-3xl border border-line shadow-2xl shadow-slate-950/40"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="ไปที่หน้า… หรือพิมพ์เพื่อค้นหา"
                className="flex-1 bg-transparent py-4 text-fg outline-none placeholder:text-muted/60"
              />
              <kbd className="hidden rounded bg-surface2 px-1.5 py-0.5 text-[10px] font-bold text-muted sm:block">ESC</kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted/60">ไปที่</p>
              {results.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setCursor(i)}
                    onClick={r.run}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      cursor === i ? "bg-brand/15 text-fg" : "text-muted hover:bg-surface2"
                    }`}
                  >
                    <Icon size={17} className={cursor === i ? "text-brand" : ""} />
                    <span className="flex-1 font-semibold">{r.label}</span>
                    <span className="text-[11px] text-muted/60">{r.hint}</span>
                    {cursor === i && <CornerDownLeft size={14} className="text-brand" />}
                  </button>
                );
              })}
              {results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted">ไม่พบเมนูที่ตรงกับ “{query}”</p>
              )}

              <p className="mt-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted/60">การกระทำ</p>
              <button
                onClick={() => {
                  toggleTheme();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted transition hover:bg-surface2"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                <span className="flex-1 font-semibold">
                  สลับเป็นธีม{theme === "dark" ? "สว่าง" : "มืด"}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
