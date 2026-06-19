# Study Hub 📚

> **แอปช่วยการเรียนครบวงจร** — เว็บแอปและ Android APK สำหรับนักเรียน/นักศึกษาไทย  
> ช่วยจัดตารางเรียน, จดบันทึก, ทบทวนด้วยเกม, ซิงก์ Google Calendar และติดตามความก้าวหน้าแบบ Gamification

---

## ✨ ฟีเจอร์ทั้งหมด (Features)

### 📋 หน้าหลัก 10 หน้า

| หน้า | รายละเอียด |
|------|------------|
| 🏠 **Dashboard** | ภาพรวมรายวัน — XP, สตรีค, งานใกล้ครบกำหนด, ปุ่มลัด 7 เกม |
| 📅 **ตารางเรียน** | จัดตารางเรียนรายสัปดาห์ แยกสีวิชา |
| 📝 **งานส่ง** | ติดตามการบ้าน/งาน พร้อมวันครบกำหนดและสถานะเสร็จ |
| 🗓 **ปฏิทินสอบ** | ปฏิทินรายเดือน + ซิงก์ Google Calendar (iCal/ICS) |
| ⏱ **โฟกัส (Pomodoro)** | จับเวลา Pomodoro + เสียง Ambient + สถิติรายวัน |
| 🃏 **แฟลชการ์ด** | สร้างสำรับการ์ด ทบทวนด้วย Spaced Repetition (SM-2) |
| 📊 **เกรด / GPA** | คำนวณเกรดเฉลี่ยและ GPA ระบบ A–F |
| 📈 **Analytics** | กราฟสถิติการเรียน — โฟกัส, งานที่ทำเสร็จ, การ์ดที่ทบทวน |
| 📓 **โน้ต** | จดบันทึกย่อแยกตามวิชา |
| ✅ **Checklist** | รายการสิ่งที่ต้องทำวันนี้ |
| 🎮 **เกมการเรียน** | 7 มินิเกมทบทวนความรู้ + Gamification |

### 🎮 7 เกมทบทวน (Learning Games)

| เกม | รายละเอียด |
|-----|------------|
| 🪢 **แฮงแมน** | ทายตัวอักษรทีละตัวจากคำศัพท์ ก่อนหุ่นถูกแขวน |
| 🃏 **จำไพ่** | พลิกหาคู่คำ-ความหมายให้ครบ (Memory Cards) |
| 🔤 **Word Scramble** | เรียงตัวอักษรสับเรียงให้เป็นคำที่ถูกต้อง |
| 📐 **ควิซสูตร** | ทายชื่อสูตรคณิต/วิทย์จากสมการ พร้อมจับเวลา |
| 🔗 **จับคู่คำ-ความหมาย** | กดคำด้านซ้ายจับคู่กับความหมายด้านขวา |
| 📝 **เรียงประโยค** | เรียงคำที่กระจัดกระจายให้เป็นประโยคที่ถูกต้อง |
| ⚡ **Speed Math** | ตอบโจทย์คณิตให้ได้มากที่สุดใน 60 วินาที |

### 🏆 ระบบ Gamification

- **XP / เลเวล** — ได้แต้มทุกครั้งที่ทำงานเสร็จ, เล่นเกม, ทบทวนการ์ด
- **สตรีค** (🔥 Streak) — นับวันที่เข้าใช้งานต่อเนื่อง
- **เหรียญ/Badge** — ปลดล็อกเมื่อถึงเป้าหมาย (สตรีค, Pomodoro, งาน, การ์ด)
- **เอฟเฟกต์ฉลอง 3 ระดับ** — confetti / combo badge / พลุเต็มจอ + แฟนแฟร์เสียงสังเคราะห์

### 📅 Google Calendar Sync

- วาง **Secret iCal URL** → fetch ICS อัตโนมัติ + cache ใน localStorage
- **นำเข้าไฟล์ .ics** สำหรับเว็บเบราว์เซอร์ (workaround สำหรับ CORS)
- บน **Android APK** fetch URL โดยตรงได้ (Capacitor ข้าม CORS)
- นัดหมายจาก Google แสดงด้วยจุด 🟢 เขียว แยกจากนัดหมายที่กรอกเอง
- จำ URL ไว้ในเครื่อง พร้อมปุ่ม "ซิงก์ใหม่"

### 📦 คลังเนื้อหา (Content Library)

| ประเภท | จำนวน | หมวดหมู่ |
|--------|-------|----------|
| 🔤 คำศัพท์ | **677 คำ** | วิทย์ / ธุรกิจ / ชีวิตประจำวัน / วิชาการ / **ภาษาอังกฤษ** / เทคโนโลยี / การแพทย์ |
| 📐 สูตรคณิต-วิทย์ | **151 สูตร** | แคลคูลัส / ตรีโกณมิติ / พีชคณิต-สถิติ / ฟิสิกส์ / เคมี |
| 🔬 ศัพท์วิทยาศาสตร์ | **216 คำ** | ชีววิทยา / เคมี / ฟิสิกส์ / โลกและอวกาศ |
| 📝 ประโยคเรียงคำ | 12 ประโยค | ภาษาอังกฤษระดับต่าง ๆ |

**คำศัพท์ภาษาอังกฤษศึกษา** ครอบคลุม: ไวยากรณ์, วรรณกรรม, ภาษาศาสตร์, TESOL/ELT, สำนวน (idioms), คำศัพท์ TOEIC/IELTS

---

## 🛠 Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend Framework | React 18 + TypeScript (strict) |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animation | Framer Motion 12 |
| Charts | Recharts |
| Icons | Lucide React |
| Celebration Effects | canvas-confetti + Web Audio API |
| Mobile | Capacitor 6 (Android APK) |
| State Management | Zustand + localStorage (ไม่มี backend) |

---

## 🚀 วิธีติดตั้งและรัน (Getting Started)

### ข้อกำหนดเบื้องต้น

- **Node.js** 18 ขึ้นไป
- **npm** 9 ขึ้นไป

### ติดตั้งและรัน Dev Server

```bash
git clone https://github.com/YOUR_USERNAME/StudyHub.git
cd StudyHub
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

### Build สำหรับ Production (เว็บ)

```bash
npm run build
# ผลลัพธ์อยู่ในโฟลเดอร์ dist/
```

---

## 📱 วิธี Build APK (Android)

### ข้อกำหนด

| เครื่องมือ | เวอร์ชันที่ใช้ทดสอบ |
|-----------|-------------------|
| JDK 17 | Adoptium 17.0.19 (`C:/Users/kwanc/android-build/jdk-17.0.19+10`) |
| Android SDK | API 33+ (ติดตั้งผ่าน Android Studio) |
| Capacitor CLI | รวมอยู่ใน `package.json` (ติดตั้งด้วย `npm install`) |
| Gradle | 8.2.1 (bundled ใน Android project) |

### ขั้นตอน Build APK

```bash
# ขั้นที่ 1: Build web assets
npm run build

# ขั้นที่ 2: Sync ไปยัง Android project
npx cap sync android

# ขั้นที่ 3: Build APK
cd android

# Windows (PowerShell / CMD)
set JAVA_HOME=C:\Users\kwanc\android-build\jdk-17.0.19+10
gradlew.bat assembleDebug --no-daemon

# Windows (Git Bash / MSYS2)
export JAVA_HOME="C:/Users/kwanc/android-build/jdk-17.0.19+10"
MSYS_NO_PATHCONV=1 ./gradlew.bat assembleDebug --no-daemon
```

ไฟล์ APK อยู่ที่:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

> 💡 **ดาวน์โหลด APK สำเร็จรูป:** ไฟล์ `StudyHub-v3.apk` ในรากโปรเจค (ไม่ต้อง build เอง)

---

## 📲 วิธีติดตั้ง APK ลงมือถือ Android

1. **เปิดอนุญาตติดตั้งจากแหล่งภายนอก:**  
   ตั้งค่า → ความปลอดภัย → **"แหล่งที่มาที่ไม่รู้จัก"** (Unknown sources) → เปิด  
   *(Android 8+ ให้เปิดทีละแอป: ตั้งค่า → แอป → ไฟล์แมเนเจอร์/เบราว์เซอร์ → อนุญาต)*

2. **โอนไฟล์ APK ไปมือถือ:**  
   - ต่อสาย USB → ลาก APK ไปยังเครื่อง
   - หรือส่งผ่าน Google Drive / Telegram

3. **ติดตั้ง:** แตะไฟล์ `StudyHub-v3.apk` → กด **ติดตั้ง (Install)**

4. เปิดแอป **Study Hub** จาก launcher ได้เลย

---

## 📖 วิธีใช้งานแต่ละหน้า (User Guide)

### 🏠 Dashboard

- ดูภาพรวมรายวัน: XP, เลเวล, วันสตรีค, งานใกล้ครบกำหนด
- กดปุ่มลัดเกมทั้ง 7 เพื่อเริ่มเล่นทันที
- กด Ctrl+K (หรือ ⌘K) เพื่อเปิด Command Palette

### 📅 ตารางเรียน

- กด **"+ เพิ่มคาบ"** → ระบุวิชา, วัน, เวลาเริ่ม-สิ้นสุด, ห้อง, อาจารย์, สี
- แสดงแบบ grid จันทร์–อาทิตย์ แยกสีตามวิชา

### 📝 งานส่ง

- กด **"+ เพิ่มงาน"** → ระบุชื่องาน, วิชา, วันส่ง, รายละเอียด
- ติ๊กถูกเมื่องานเสร็จ → ได้รับ XP และเพิ่ม `tasksDone`

### 🗓 ปฏิทินสอบ + Google Calendar Sync

#### วิธีซิงก์ผ่าน Secret iCal URL *(แนะนำสำหรับ APK)*

1. เปิด [Google Calendar](https://calendar.google.com) บนคอมพิวเตอร์
2. คลิก **⋮** ข้างชื่อปฏิทิน → **"การตั้งค่าและการแชร์"**
3. เลื่อนลงหา **"ที่อยู่ลับในรูปแบบ iCal"** (Secret address in iCal format)
4. คัดลอก URL
5. ในแอป → หน้า **ปฏิทินสอบ** → กดปุ่ม **"Google Calendar"**
6. วาง URL → กด **"ซิงก์ใหม่"**

#### วิธีนำเข้าไฟล์ .ics *(สำหรับเว็บเบราว์เซอร์)*

> เว็บเบราว์เซอร์บล็อก CORS ทำให้ fetch URL ตรงไม่ได้ — ใช้วิธี export แทน

1. ใน Google Calendar → ⚙ ตั้งค่า → **"Export"** → ดาวน์โหลด `.ics`
2. ในแอป → กด **"นำเข้าไฟล์ .ics"** → เลือกไฟล์
3. นัดหมายจาก Google แสดงด้วยจุด 🟢 สีเขียว และป้าย "📅 Google"

### ⏱ โฟกัส (Pomodoro)

- ตั้งเวลา Work (ค่าเริ่ม 25 นาที) และ Break (5 นาที)
- กด **Start** → ทำงาน → หยุดพัก → ทำซ้ำ
- สถิติรายวันบันทึกอัตโนมัติ → ดูในหน้า Analytics

### 🃏 แฟลชการ์ด

- สร้าง **Deck** (สำรับ) แยกตามวิชา + เลือกสี
- เพิ่มการ์ด: ด้านหน้า = คำถาม / ด้านหลัง = คำตอบ
- ระบบ SM-2: การ์ดที่ตอบผิดจะ schedule ให้ทบทวนเร็วขึ้น

### 🎮 เกมทบทวน

1. เข้าหน้า **"เกมการเรียน"** หรือกดจาก Dashboard
2. เลือกเกม → ตั้งค่า: หมวดคำศัพท์, ระดับความยาก หรือหัวข้อสูตร
3. เล่น → ตอบถูกได้ XP + celebration effects (confetti, เสียง, combo badge)

---

## 📁 โครงสร้างโฟลเดอร์ (Folder Structure)

```
StudyHub/
├── src/
│   ├── components/
│   │   ├── games/
│   │   │   ├── CelebrationEffects.tsx  # Confetti + Audio + Combo
│   │   │   ├── Hangman.tsx
│   │   │   ├── MemoryCards.tsx
│   │   │   ├── WordScramble.tsx
│   │   │   ├── QuizFormulas.tsx
│   │   │   ├── WordMatch.tsx
│   │   │   ├── SentenceOrder.tsx
│   │   │   └── SpeedMath.tsx
│   │   ├── Dashboard.tsx       # หน้าหลัก + ลัดเกม
│   │   ├── Exams.tsx           # ปฏิทินสอบ + Google Calendar sync
│   │   ├── Flashcards.tsx      # แฟลชการ์ด + SM-2
│   │   ├── Games.tsx           # Hub เกม
│   │   ├── Focus.tsx           # Pomodoro
│   │   └── ...
│   ├── data/
│   │   └── gameContent.ts      # คำศัพท์ 677 / สูตร 151 / ศัพท์วิทย์ 216
│   ├── store.ts                # Zustand + localStorage
│   ├── types.ts                # TypeScript interfaces
│   ├── lib.ts                  # Utility functions
│   ├── nav.ts                  # Navigation helpers
│   └── App.tsx                 # Navigation + PAGES map
├── android/                    # Capacitor Android project
│   └── app/build/outputs/apk/ # APK output (gitignored)
├── public/
├── StudyHub-v3.apk             # ✅ APK สำเร็จรูปสำหรับดาวน์โหลด
├── capacitor.config.ts
├── vite.config.ts
└── package.json
```

---

## 🔒 Privacy & Data

- **ไม่มี backend / server** — ข้อมูลทั้งหมดเก็บใน `localStorage` ของอุปกรณ์
- ไม่มีการส่งข้อมูลออก ยกเว้นการ fetch iCal URL ที่ผู้ใช้กำหนดเองสำหรับ Google Calendar
- Uninstall แอป = ข้อมูลหายทั้งหมด (ยังไม่มีระบบ sync/backup ข้ามอุปกรณ์)

---

## 📄 License

MIT License — ใช้งานและดัดแปลงได้อิสระ

---

*Built with ❤️ สำหรับนักเรียนและนักศึกษาไทย*
