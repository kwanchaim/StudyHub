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
  },
});
