import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `--host` (in the dev script) binds 0.0.0.0 so the phone can reach it over wifi.
// Vite prints the LAN URL (e.g. http://192.168.x.x:5173) on boot — open that on the phone.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
