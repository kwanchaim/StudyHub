let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

function beep(freq: number, type: OscillatorType, dur: number, vol = 0.12) {
  try {
    const c = ctx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.start(); osc.stop(c.currentTime + dur);
  } catch { /* audio blocked */ }
}

export function playCorrect() { beep(880, "sine", 0.15); }
export function playWrong() { beep(200, "sawtooth", 0.22, 0.08); }
export function playTick() { beep(1100, "sine", 0.04, 0.06); }
export function playComplete() {
  [523, 659, 784].forEach((f, i) => {
    setTimeout(() => beep(f, "sine", 0.4), i * 100);
  });
}
export function playCombo(level: number) {
  const freq = 880 + Math.min(level - 3, 8) * 110;
  beep(freq, "sine", 0.1);
  setTimeout(() => beep(freq * 1.33, "sine", 0.18, 0.16), 80);
}
export function playFanfare() {
  [523, 659, 784, 1047, 1047].forEach((f, i) => {
    setTimeout(() => beep(f, "sine", i === 4 ? 0.7 : 0.28, 0.15), i * 130);
  });
}

// ─── High Score ────────────────────────────────────────────────────
const HS_KEY = "study-hub:game-scores";

export interface HighScore {
  gameId: string;
  difficulty: string;
  score: number;
  maxScore: number;
  playedAt: number;
}

export function saveHighScore(entry: HighScore) {
  try {
    const all: HighScore[] = JSON.parse(localStorage.getItem(HS_KEY) ?? "[]");
    // keep top-5 per gameId+difficulty
    const key = `${entry.gameId}:${entry.difficulty}`;
    const filtered = all.filter((e) => `${e.gameId}:${e.difficulty}` !== key);
    const same = all.filter((e) => `${e.gameId}:${e.difficulty}` === key);
    same.push(entry);
    same.sort((a, b) => b.score - a.score);
    const next = [...filtered, ...same.slice(0, 5)];
    localStorage.setItem(HS_KEY, JSON.stringify(next));
  } catch { /* storage full */ }
}

export function getBestScore(gameId: string, difficulty: string): HighScore | null {
  try {
    const all: HighScore[] = JSON.parse(localStorage.getItem(HS_KEY) ?? "[]");
    const matches = all.filter((e) => e.gameId === gameId && e.difficulty === difficulty);
    matches.sort((a, b) => b.score - a.score);
    return matches[0] ?? null;
  } catch { return null; }
}

export function getAllScores(): HighScore[] {
  try { return JSON.parse(localStorage.getItem(HS_KEY) ?? "[]"); }
  catch { return []; }
}

// shuffle array (Fisher-Yates)
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
