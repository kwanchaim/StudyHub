import { motion, AnimatePresence } from "framer-motion";
import type { CelebrationEffect } from "./useCelebration";

interface Props {
  effect: CelebrationEffect;
  combo: number;
}

export function CelebrationOverlay({ effect, combo }: Props) {
  return (
    <AnimatePresence>
      {/* ── Level 1: ตอบถูกปกติ ── */}
      {effect === "correct" && (
        <motion.div
          key="correct-badge"
          initial={{ opacity: 0, y: 20, scale: 0.75 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 280, damping: 16 }}
          className="pointer-events-none fixed inset-x-0 top-[30%] z-[200] flex justify-center"
        >
          <div className="rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-extrabold text-white shadow-xl shadow-emerald-500/40">
            ✓ เก่งมาก!
          </div>
        </motion.div>
      )}

      {/* ── Level 2: Combo badge ── */}
      {effect === "combo" && (
        <motion.div
          key="combo-badge"
          initial={{ opacity: 0, scale: 0.4, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -16 }}
          transition={{ type: "spring", stiffness: 320, damping: 14 }}
          className="pointer-events-none fixed inset-x-0 top-[28%] z-[200] flex justify-center"
        >
          <motion.div
            animate={{ scale: [1, 1.12, 1, 1.08, 1] }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 text-center font-extrabold text-white shadow-2xl shadow-amber-500/50"
          >
            <span className="text-2xl">🔥 COMBO ×{combo}!</span>
          </motion.div>
        </motion.div>
      )}

      {/* ── Level 2: ไฟวิ่งขอบจอ ── */}
      {effect === "combo" && (
        <motion.div
          key="fire-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.5, 0.75, 0] }}
          transition={{ duration: 1.3, times: [0, 0.15, 0.45, 0.7, 1] }}
          className="pointer-events-none fixed inset-0 z-[180]"
          style={{ boxShadow: "inset 0 0 80px 28px rgba(245,158,11,0.55)" }}
        />
      )}

      {/* ── Level 3: แสงวาบ ── */}
      {(effect === "end-good" || effect === "end-perfect") && (
        <motion.div
          key="end-flash"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.85 }}
          className="pointer-events-none fixed inset-0 z-[210] bg-white"
        />
      )}

      {/* ── Level 3: หน้าจอสั่น (pulsating ring) ── */}
      {(effect === "end-good" || effect === "end-perfect") && (
        <motion.div
          key="end-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.35, 0.75, 0.2, 0] }}
          transition={{ duration: 0.8, times: [0, 0.15, 0.35, 0.5, 0.7, 1] }}
          className="pointer-events-none fixed inset-0 z-[195]"
          style={{ boxShadow: "inset 0 0 110px 38px rgba(251,191,36,0.65)" }}
        />
      )}

      {/* ── Level 3: Banner + ดาวลอย ── */}
      {(effect === "end-good" || effect === "end-perfect") && (
        <motion.div
          key="end-banner"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ type: "spring", stiffness: 160, damping: 11, delay: 0.1 }}
          className="pointer-events-none fixed inset-x-0 top-[20%] z-[220] flex flex-col items-center gap-4"
        >
          <motion.span
            animate={{ rotate: [0, -18, 18, -12, 12, -5, 0], scale: [1, 1.3, 1] }}
            transition={{ duration: 0.85, delay: 0.16 }}
            className="text-7xl drop-shadow-lg"
          >
            {effect === "end-perfect" ? "🏆" : "🌟"}
          </motion.span>

          <div
            className={`rounded-3xl px-9 py-4 text-center shadow-2xl ${
              effect === "end-perfect"
                ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"
                : "bg-gradient-to-r from-violet-600 to-blue-500"
            }`}
          >
            <p
              className={`text-2xl font-extrabold tracking-wide ${
                effect === "end-perfect" ? "text-amber-900" : "text-white"
              }`}
            >
              {effect === "end-perfect" ? "สุดยอดไปเลย! 🎊" : "ยอดเยี่ยมมาก! ✨"}
            </p>
            {effect === "end-perfect" && (
              <p className="mt-1 text-sm font-bold text-amber-800">เพอร์เฟกต์สกอร์!</p>
            )}
          </div>

          {/* ดาวลอย */}
          {([0, 1, 2, 3, 4, 5, 6, 7] as const).map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: (i % 2 === 0 ? -1 : 1) * (40 + i * 20),
                y: -(55 + i * 16),
                scale: [0, 1.4, 1, 0],
              }}
              transition={{ delay: 0.1 + i * 0.07, duration: 1.25 }}
              className="absolute text-xl"
              style={{ top: "48%" }}
            >
              {(["⭐", "✨", "💫", "🌟", "⭐", "✨", "💫", "🌟"] as const)[i]}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
