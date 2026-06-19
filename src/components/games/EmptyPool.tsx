import { Button } from "../ui";

interface Props {
  /** เรียกเมื่อผู้เล่นกดปุ่มจบ (กลับไปหน้าผลลัพธ์/ฮับ) */
  onComplete?: (score: number, max: number) => void;
}

/** แสดงเมื่อหมวด + ระดับที่เลือกไม่มีคำเพียงพอให้เล่น */
export default function EmptyPool({ onComplete }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="text-5xl">📭</span>
      <div>
        <p className="text-lg font-extrabold text-fg">หมวดนี้ยังไม่มีคำในระดับที่เลือก</p>
        <p className="mt-1 text-sm text-muted">ลองเปลี่ยนหมวดคำศัพท์ หรือเลือกระดับนักเรียนอื่นดูนะ</p>
      </div>
      {onComplete && (
        <Button variant="ghost" onClick={() => onComplete(0, 0)}>
          กลับไปเลือกใหม่
        </Button>
      )}
    </div>
  );
}
