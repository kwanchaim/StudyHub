import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Layers, Pencil, Plus, RotateCw, Sparkles, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { SUBJECT_COLORS, uid } from "../storage";
import { isDue, previewInterval, RATING_LABEL, schedule, type Rating } from "../srs";
import { XP } from "../game";
import { todayISO } from "../lib";
import type { Deck, Flashcard } from "../types";
import { Badge, Button, EmptyState, Modal, SectionHeader, inputCls, labelCls } from "./ui";

const RATING_TONE: Record<Rating, string> = {
  again: "#ef4444",
  hard: "#f59e0b",
  good: "#10b981",
  easy: "#22d3ee",
};
const RATING_ORDER: Rating[] = ["again", "hard", "good", "easy"];

export default function Flashcards() {
  const { decks, setDecks, flashcards, setFlashcards, subjects, award, celebrate, toast } = useStore();
  const today = todayISO();

  const [reviewDeck, setReviewDeck] = useState<Deck | null>(null);
  const [manageDeck, setManageDeck] = useState<Deck | null>(null);
  const [addDeckOpen, setAddDeckOpen] = useState(false);
  const [addCardDeck, setAddCardDeck] = useState<Deck | null>(null);
  const [editDeck, setEditDeck] = useState<Deck | null>(null);

  const dueCountOf = (deckId: string) =>
    flashcards.filter((c) => c.deckId === deckId && isDue(c, today)).length;

  if (manageDeck) {
    return (
      <ManageCards
        deck={manageDeck}
        cards={flashcards.filter((c) => c.deckId === manageDeck.id)}
        onExit={() => setManageDeck(null)}
        onAdd={(c) => setFlashcards((prev) => [...prev, c])}
        onUpdate={(id, front, back) => setFlashcards((prev) => prev.map((c) => (c.id === id ? { ...c, front, back } : c)))}
        onDelete={(id) => setFlashcards((prev) => prev.filter((c) => c.id !== id))}
      />
    );
  }

  if (reviewDeck) {
    return (
      <ReviewSession
        deck={reviewDeck}
        onExit={() => setReviewDeck(null)}
        cards={flashcards.filter((c) => c.deckId === reviewDeck.id && isDue(c, today))}
        onRate={(card, rating) => {
          setFlashcards((prev) => prev.map((c) => (c.id === card.id ? schedule(c, rating) : c)));
          award(XP.card, { cardsReviewed: 1 });
        }}
        onFinish={() => {
          celebrate(true);
          toast({ emoji: "🧠", title: "ทบทวนครบแล้ว!", desc: `${reviewDeck.name} · เก่งมาก` });
          setReviewDeck(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="แฟลชการ์ด"
        icon={<Layers size={22} />}
        action={
          <Button onClick={() => setAddDeckOpen(true)}>
            <Plus size={16} /> สร้างสำรับ
          </Button>
        }
      />

      {decks.length === 0 ? (
        <EmptyState icon={<Layers size={40} />} title="ยังไม่มีสำรับการ์ด" hint="สร้างสำรับแล้วเพิ่มการ์ดเพื่อเริ่มทบทวนแบบ spaced repetition" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const cards = flashcards.filter((c) => c.deckId === deck.id);
            const due = dueCountOf(deck.id);
            return (
              <motion.div key={deck.id} whileHover={{ y: -3 }} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
                <div className="h-1.5" style={{ background: deck.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setManageDeck(deck)} className="min-w-0 text-left">
                      <p className="truncate font-bold text-fg hover:text-brand transition">{deck.name}</p>
                      <Badge color={deck.color}>{deck.subject}</Badge>
                    </button>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => setEditDeck(deck)}
                        className="text-muted/50 transition hover:text-brand"
                        aria-label="แก้ไขสำรับ"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setDecks((prev) => prev.filter((d) => d.id !== deck.id));
                          setFlashcards((prev) => prev.filter((c) => c.deckId !== deck.id));
                        }}
                        className="text-muted/50 transition hover:text-rose-500"
                        aria-label="ลบสำรับ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-sm">
                    <span className="text-muted">{cards.length} การ์ด</span>
                    {due > 0 ? (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-500">ทบทวน {due}</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-500">ครบแล้ว ✓</span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => setReviewDeck(deck)}
                      disabled={due === 0}
                      className="flex-1"
                    >
                      <Sparkles size={15} /> ทบทวน
                    </Button>
                    <Button variant="soft" onClick={() => setManageDeck(deck)}>
                      <Layers size={15} />
                    </Button>
                    <Button variant="soft" onClick={() => setAddCardDeck(deck)}>
                      <Plus size={15} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddDeckModal open={addDeckOpen} onClose={() => setAddDeckOpen(false)} subjects={subjects} onAdd={(d) => setDecks((prev) => [...prev, d])} />
      <AddCardModal deck={addCardDeck} onClose={() => setAddCardDeck(null)} onAdd={(c) => { setFlashcards((prev) => [...prev, c]); toast({ emoji: "➕", title: "เพิ่มการ์ดแล้ว" }); }} />
      <EditDeckModal
        deck={editDeck}
        subjects={subjects}
        onClose={() => setEditDeck(null)}
        onSave={(patch) => { if (editDeck) setDecks((prev) => prev.map((d) => (d.id === editDeck.id ? { ...d, ...patch } : d))); setEditDeck(null); }}
      />
    </div>
  );
}

function ManageCards({
  deck,
  cards,
  onExit,
  onAdd,
  onUpdate,
  onDelete,
}: {
  deck: Deck;
  cards: Flashcard[];
  onExit: () => void;
  onAdd: (c: Flashcard) => void;
  onUpdate: (id: string, front: string, back: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<{ id: string; front: string; back: string } | null>(null);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  const addCard = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    onAdd({ id: uid(), deckId: deck.id, front: newFront.trim(), back: newBack.trim(), ease: 2.5, interval: 0, reps: 0, due: todayISO(), createdAt: Date.now() });
    setNewFront(""); setNewBack("");
  };

  const saveEdit = () => {
    if (!editing || !editing.front.trim() || !editing.back.trim()) return;
    onUpdate(editing.id, editing.front.trim(), editing.back.trim());
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft size={16} /> กลับ
        </button>
        <Badge color={deck.color}>{deck.name}</Badge>
        <span className="text-sm font-semibold text-muted">{cards.length} การ์ด</span>
      </div>

      {/* เพิ่มการ์ดใหม่ */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-fg">เพิ่มการ์ดใหม่</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="หน้า (คำถาม)" onKeyDown={(e) => e.key === "Enter" && addCard()} />
          <input className={inputCls} value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="หลัง (คำตอบ)" onKeyDown={(e) => e.key === "Enter" && addCard()} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={addCard}><Plus size={15} /> เพิ่ม</Button>
        </div>
      </div>

      {/* รายการการ์ด */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {cards.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} className="glass rounded-2xl p-3.5">
              {editing?.id === c.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={editing.front} onChange={(e) => setEditing({ ...editing, front: e.target.value })} placeholder="หน้า" autoFocus />
                    <input className={inputCls} value={editing.back} onChange={(e) => setEditing({ ...editing, back: e.target.value })} placeholder="หลัง" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>ยกเลิก</Button>
                    <Button size="sm" onClick={saveEdit}>บันทึก</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{c.front}</p>
                    <p className="truncate text-sm text-muted">{c.back}</p>
                  </div>
                  <button onClick={() => setEditing({ id: c.id, front: c.front, back: c.back })} aria-label="แก้ไข" className="rounded-lg p-1.5 text-muted hover:bg-brand/15 hover:text-brand"><Pencil size={15} /></button>
                  <button onClick={() => onDelete(c.id)} aria-label="ลบ" className="rounded-lg p-1.5 text-muted hover:bg-rose-500/15 hover:text-rose-500"><Trash2 size={15} /></button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-line py-12 text-center">
            <p className="text-3xl">🗂️</p>
            <p className="mt-2 font-semibold text-muted">ยังไม่มีการ์ดในสำรับนี้</p>
            <p className="text-sm text-muted/70">เพิ่มการ์ดด้านบนเพื่อเริ่มทบทวน</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditDeckModal({
  deck,
  subjects,
  onClose,
  onSave,
}: {
  deck: Deck | null;
  subjects: string[];
  onClose: () => void;
  onSave: (patch: { name: string; subject: string; color: string }) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  // sync ค่าเมื่อเปิด deck ใหม่
  const [lastId, setLastId] = useState<string | null>(null);
  if (deck && deck.id !== lastId) {
    setLastId(deck.id);
    setName(deck.name);
    setSubject(deck.subject);
    setColor(deck.color);
  }

  function submit() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), subject: subject.trim() || "ทั่วไป", color });
  }

  return (
    <Modal open={!!deck} onClose={onClose} title="แก้ไขสำรับ">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อสำรับ</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelCls}>วิชา</label>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="พิมพ์หรือเลือกด้านล่าง" list="edit-deck-subjects" />
          <datalist id="edit-deck-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className={labelCls}>สี</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`} style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : "none" }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>บันทึก</Button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewSession({
  deck,
  cards,
  onRate,
  onExit,
  onFinish,
}: {
  deck: Deck;
  cards: Flashcard[];
  onRate: (card: Flashcard, rating: Rating) => void;
  onExit: () => void;
  onFinish: () => void;
}) {
  // จับ snapshot คิวตอนเริ่ม (ไม่ให้ลำดับเปลี่ยนระหว่างทบทวน)
  const [queue] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = queue[idx];
  const done = idx >= queue.length || queue.length === 0;

  function rate(r: Rating) {
    if (!card) return;
    onRate(card, r);
    if (idx + 1 >= queue.length) {
      onFinish();
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }

  if (done) {
    return (
      <div className="grid place-items-center py-20">
        <EmptyState icon={<Sparkles size={40} />} title="ไม่มีการ์ดให้ทบทวนแล้ว" action={<Button onClick={onExit}>กลับ</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft size={16} /> ออก
        </button>
        <Badge color={deck.color}>{deck.name}</Badge>
        <span className="text-sm font-semibold text-muted">{idx + 1} / {queue.length}</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-brand2" animate={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      {/* การ์ดพลิกได้ */}
      <div className="[perspective:1600px]">
        <motion.button
          key={card.id}
          onClick={() => setFlipped((f) => !f)}
          className="relative grid h-72 w-full place-items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-xl [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div className="absolute inset-0 grid place-items-center p-8 [backface-visibility:hidden]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted/60">คำถาม</p>
              <p className="text-2xl font-extrabold text-fg">{card.front}</p>
              <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted"><RotateCw size={13} /> แตะเพื่อดูเฉลย</p>
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">เฉลย</p>
              <p className="text-2xl font-extrabold text-fg">{card.back}</p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* ปุ่มให้คะแนน */}
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-2">
            {RATING_ORDER.map((r) => (
              <button
                key={r}
                onClick={() => rate(r)}
                className="rounded-2xl border border-line bg-surface py-3 text-center transition hover:brightness-105"
                style={{ borderColor: RATING_TONE[r] + "55" }}
              >
                <span className="block text-sm font-bold" style={{ color: RATING_TONE[r] }}>{RATING_LABEL[r]}</span>
                <span className="block text-[10px] text-muted">{previewInterval(card, r)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!flipped && <p className="text-center text-sm text-muted">นึกคำตอบในใจ แล้วแตะการ์ดเพื่อตรวจ</p>}
    </div>
  );
}

function AddDeckModal({
  open,
  onClose,
  subjects,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  subjects: string[];
  onAdd: (d: Deck) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  function submit() {
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim(), subject: subject.trim() || "ทั่วไป", color, createdAt: Date.now() });
    setName(""); setSubject(""); setColor(SUBJECT_COLORS[0]);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="สร้างสำรับใหม่">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>ชื่อสำรับ</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ศัพท์อังกฤษบทที่ 5" autoFocus />
        </div>
        <div>
          <label className={labelCls}>วิชา</label>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="พิมพ์หรือเลือกด้านล่าง" list="deck-subjects" />
          <datalist id="deck-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className={labelCls}>สี</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`} style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : "none" }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>สร้าง</Button>
        </div>
      </div>
    </Modal>
  );
}

function AddCardModal({
  deck,
  onClose,
  onAdd,
}: {
  deck: Deck | null;
  onClose: () => void;
  onAdd: (c: Flashcard) => void;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  function submit() {
    if (!deck || !front.trim() || !back.trim()) return;
    onAdd({ id: uid(), deckId: deck.id, front: front.trim(), back: back.trim(), ease: 2.5, interval: 0, reps: 0, due: todayISO(), createdAt: Date.now() });
    setFront(""); setBack("");
    onClose();
  }

  return (
    <Modal open={!!deck} onClose={onClose} title={`เพิ่มการ์ด — ${deck?.name ?? ""}`}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>หน้า (คำถาม)</label>
          <textarea className={inputCls} rows={2} value={front} onChange={(e) => setFront(e.target.value)} placeholder="เช่น abundant" autoFocus />
        </div>
        <div>
          <label className={labelCls}>หลัง (คำตอบ)</label>
          <textarea className={inputCls} rows={2} value={back} onChange={(e) => setBack(e.target.value)} placeholder="เช่น มากมาย, อุดมสมบูรณ์" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>เพิ่มการ์ด</Button>
        </div>
      </div>
    </Modal>
  );
}
