import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // ใช้ path แบบ relative เพื่อให้ asset โหลดได้เมื่อรันใน WebView ของแอป (Capacitor/APK)
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // same-origin proxy: ดึง Google Calendar iCal ฝั่งเซิร์ฟเวอร์ของเครื่องผู้ใช้เอง
      // เลี่ยง CORS โดยไม่ส่งลิงก์ลับผ่านบริการบุคคลที่สาม
      "/gcal-proxy": {
        target: "https://calendar.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace("/gcal-proxy", ""),
      },
    },
  },
  preview: {
    proxy: {
      "/gcal-proxy": {
        target: "https://calendar.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace("/gcal-proxy", ""),
      },
    },
  },
});
