import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

// ─── Custom event ────────────────────────────────────────────────
export const CELEBRATE_EVENT = "sh:celebrate";

export interface CelebrationDetail {
  /** 1 = ตอบถูก, 2 = combo milestone, 3 = perfect/จบเกม */
  level: 1 | 2 | 3;
  combo?: number;
}

/** เรียกจาก game component ใดก็ได้ — ไม่ต้องส่ง prop */
export function triggerCelebration(level: 1 | 2 | 3, combo = 1) {
  window.dispatchEvent(
    new CustomEvent<CelebrationDetail>(CELEBRATE_EVENT, { detail: { level, combo } })
  );
}

// ─── Audio ───────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
function aCtx() {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

function tone(freq: number, type: OscillatorType, dur: number, vol = 0.12, delay = 0) {
  try {
    const c = aCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch { /* audio blocked */ }
}

function playRising(combo: number) {
  const f = 440 * Math.pow(1.15, Math.min(combo - 1, 10));
  tone(f, "sine", 0.22);
  tone(f * 1.4, "sine", 0.12, 0.06, 0.1);
}

function playFanfare() {
  const melody: [number, number][] = [
    [523, 0], [659, 0.11], [784, 0.22], [1047, 0.33],
    [784, 0.50], [1047, 0.62], [1047, 0.80],
  ];
  melody.forEach(([f, d]) => tone(f, "triangle", 0.28, 0.13, d));
}

function fireworks() {
  const c = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#a855f7", "#22d3ee"];
  confetti({ particleCount: 100, angle: 60, spread: 80, origin: { x: 0, y: 0.8 }, colors: c });
  setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 80, origin: { x: 1, y: 0.8 }, colors: c }), 150);
  setTimeout(() => confetti({ particleCount: 160, spread: 130, startVelocity: 52, ticks: 320, origin: { y: 0.55 }, colors: c }), 300);
  setTimeout(() => confetti({ particleCount: 80, angle: 90, spread: 360, gravity: 0.35, origin: { y: 0 }, colors: ["#FFD700", "#FFC200"] }), 600);
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 80, origin: { x: 0, y: 0.8 }, colors: c }), 900);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 80, origin: { x: 1, y: 0.8 }, colors: c }), 1050);
}

// ─── Floater type ────────────────────────────────────────────────
interface Floater {
  id: string;
  text: string;
  x: number;
  color: string;
  scale: number;
}

// ─── GlobalCelebrationLayer ──────────────────────────────────────
export function GlobalCelebrationLayer() {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addFloater = useCallback((text: string, color: string, scale = 1) => {
    const id = Math.random().toString(36).slice(2);
    const x = 15 + Math.random() * 70;
    setFloaters((p) => [...p, { id, text, x, color, scale }]);
    setTimeout(() => setFloaters((p) => p.filter((f) => f.id !== id)), 1500);
  }, []);

  const flash1 = useCallback((color: string, dur = 350) => {
    setFlash(color);
    setTimeout(() => setFlash(null), dur);
  }, []);

  const bumpCombo = useCallback((c: number) => {
    setCombo(c);
    setShowCombo(true);
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setShowCombo(false), 2200);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { level, combo: c = 1 } = (e as CustomEvent<CelebrationDetail>).detail;

      if (level === 1) {
        playRising(c);
        if (c >= 7) {
          confetti({ particleCount: 90, spread: 100, origin: { y: 0.7 }, colors: ["#FFD700","#a855f7","#22d3ee"], disableForReducedMotion: true });
          addFloater(`🔥×${c} ULTRA!`, "#FFD700", 2.2);
          flash1("rgba(255,215,0,0.25)", 400);
          bumpCombo(c);
        } else if (c >= 5) {
          confetti({ particleCount: 55, spread: 80, origin: { y: 0.72 }, colors: ["#6366f1","#a855f7","#f59e0b"], disableForReducedMotion: true });
          addFloater(`⚡ COMBO ×${c}!`, "#f59e0b", 1.8);
          flash1("rgba(245,158,11,0.18)", 300);
          bumpCombo(c);
        } else if (c >= 3) {
          confetti({ particleCount: 28, spread: 55, origin: { y: 0.75 }, disableForReducedMotion: true });
          addFloater(`🔥 ×${c}`, "#6366f1", 1.4);
          bumpCombo(c);
        } else {
          addFloater("✓ ถูก!", "#10b981", 1.1);
        }
      } else if (level === 2) {
        // Combo milestone banner (called explicitly for big moments)
        playRising(c + 4);
        confetti({ particleCount: 100, spread: 110, origin: { y: 0.65 }, colors: ["#FFD700","#FF6B6B","#4ECDC4"], disableForReducedMotion: true });
        addFloater(`⚡ COMBO ×${c}!!`, "#FF6B6B", 2.2);
        flash1("rgba(99,102,241,0.22)", 450);
        bumpCombo(c);
      } else if (level === 3) {
        // Perfect / high score
        playFanfare();
        fireworks();
        flash1("rgba(255,215,0,0.38)", 550);
        addFloater("🏆 สุดยอดไปเลย!", "#FFD700", 2.4);
        setTimeout(() => addFloater("⭐⭐⭐", "#a855f7", 2.2), 350);
        setTimeout(() => addFloater("🎉 เพอร์เฟกต์!", "#22d3ee", 2.0), 750);
        setTimeout(() => addFloater("🌟 ยอดเยี่ยม!", "#f59e0b", 1.8), 1100);
      }
    };

    window.addEventListener(CELEBRATE_EVENT, handler);
    return () => window.removeEventListener(CELEBRATE_EVENT, handler);
  }, [addFloater, flash1, bumpCombo]);

  return (
    <>
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none fixed inset-0 z-[60]"
            style={{ backgroundColor: flash }}
          />
        )}
      </AnimatePresence>

      {/* Floating texts */}
      <AnimatePresence>
        {floaters.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 1, y: 0, scale: f.scale * 0.6 }}
            animate={{ opacity: 0, y: -110, scale: f.scale * 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: [0.2, 0.8, 0.3, 1] }}
            className="pointer-events-none fixed z-[59] font-extrabold drop-shadow-2xl"
            style={{
              left: `${f.x}%`,
              bottom: "32%",
              color: f.color,
              fontSize: `${f.scale * 1.1}rem`,
              textShadow: `0 2px 24px ${f.color}99`,
              WebkitTextStroke: "0.5px rgba(0,0,0,0.15)",
            }}
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Combo badge */}
      <AnimatePresence>
        {showCombo && combo >= 3 && (
          <motion.div
            key={`cb-${combo}`}
            initial={{ scale: 0.2, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.3, opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 550, damping: 24 }}
            className="pointer-events-none fixed left-1/2 top-24 z-[59] -translate-x-1/2"
          >
            <div
              className="rounded-full px-7 py-2.5 text-2xl font-extrabold text-white shadow-2xl ring-4 ring-white/20"
              style={{
                background: combo >= 7
                  ? "linear-gradient(135deg, #FFD700, #FF6B6B, #a855f7)"
                  : combo >= 5
                  ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                  : "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: `0 8px 40px ${combo >= 5 ? "#f59e0b" : "#6366f1"}66`,
              }}
            >
              {combo >= 7 ? "🌟" : combo >= 5 ? "⚡" : "🔥"} COMBO ×{combo}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
