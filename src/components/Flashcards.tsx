import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Layers, Plus, RotateCw, Sparkles, Trash2 } from "lucide-react";
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
  const [addDeckOpen, setAddDeckOpen] = useState(false);
  const [addCardDeck, setAddCardDeck] = useState<Deck | null>(null);

  const dueCountOf = (deckId: string) =>
    flashcards.filter((c) => c.deckId === deckId && isDue(c, today)).length;

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
                    <div className="min-w-0">
                      <p className="truncate font-bold text-fg">{deck.name}</p>
                      <Badge color={deck.color}>{deck.subject}</Badge>
                    </div>
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

                  <div className="mt-4 flex items-center gap-3 text-sm">
                    <span className="text-muted">{cards.length} การ์ด</span>
                    {due > 0 ? (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-500">ทบทวน {due}</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-500">ครบแล้ว ✓</span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => setReviewDeck(deck)} disabled={due === 0} className="flex-1">
                      <Sparkles size={15} /> ทบทวน
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
    </div>
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
