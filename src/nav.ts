import type { TabKey } from "./types";

const EVENT = "sh:navigate";
const PENDING_GAME_KEY = "sh:pending-game";

/** สั่งให้แอปสลับไปแท็บอื่น (ใช้จากการ์ด/ปุ่มภายในหน้า) */
export function goTo(tab: TabKey) {
  window.dispatchEvent(new CustomEvent<TabKey>(EVENT, { detail: tab }));
}

/** สมัครรับคำสั่งสลับแท็บ */
export function onNavigate(handler: (tab: TabKey) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<TabKey>).detail);
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** นำทางไปแท็บเกมพร้อมเปิดเกมที่ระบุโดยตรง */
export function goToGame(gameId: string) {
  sessionStorage.setItem(PENDING_GAME_KEY, gameId);
  goTo("games");
}

/** ดึง gameId ที่รอเปิด (เรียกครั้งเดียวแล้วลบ) */
export function popPendingGame(): string | null {
  const id = sessionStorage.getItem(PENDING_GAME_KEY);
  if (id) sessionStorage.removeItem(PENDING_GAME_KEY);
  return id;
}
