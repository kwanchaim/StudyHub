import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyhub.app",
  appName: "Study Hub",
  webDir: "dist",
  backgroundColor: "#eef1fb",
  android: {
    backgroundColor: "#eef1fb",
    allowMixedContent: false,
  },
};

export default config;
