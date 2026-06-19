// คำคมให้กำลังใจประจำวัน (หมุนตามวันที่ จะได้ไม่ต้องใช้สุ่ม)

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: "ความสำเร็จคือผลรวมของความพยายามเล็ก ๆ ที่ทำซ้ำทุกวัน", author: "Robert Collier" },
  { text: "อย่ากลัวที่จะช้า กลัวแค่การหยุดอยู่กับที่", author: "สุภาษิตจีน" },
  { text: "วินัยคือสะพานเชื่อมระหว่างเป้าหมายกับความสำเร็จ", author: "Jim Rohn" },
  { text: "เริ่มต้นที่จุดที่คุณอยู่ ใช้สิ่งที่คุณมี ทำสิ่งที่คุณทำได้", author: "Arthur Ashe" },
  { text: "ทุกผู้เชี่ยวชาญ ล้วนเคยเป็นมือใหม่มาก่อน", author: "Helen Hayes" },
  { text: "การเรียนรู้ไม่เคยทำให้จิตใจเหนื่อยล้า", author: "Leonardo da Vinci" },
  { text: "อนาคตเป็นของคนที่เชื่อในความงดงามของความฝัน", author: "Eleanor Roosevelt" },
  { text: "เก่งวันนี้ดีกว่าสมบูรณ์แบบวันหน้า แค่ลงมือทำก็ชนะไปครึ่งทางแล้ว", author: "Study Hub" },
  { text: "พักได้ แต่อย่ายอมแพ้", author: "Banksy" },
  { text: "สิ่งที่เราทำซ้ำ ๆ คือสิ่งที่เราเป็น ความเป็นเลิศจึงไม่ใช่การกระทำ แต่เป็นนิสัย", author: "Aristotle" },
];

/** เลือกคำคมตามวันของปี (เปลี่ยนทุกวัน คงที่ทั้งวัน) */
export function quoteOfTheDay(d = new Date()): Quote {
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}
