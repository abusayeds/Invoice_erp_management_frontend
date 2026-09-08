import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,

    allowedHosts: ["preview.syedbipul.me", "sabbir8080.ssh.bd"],

    host: true,
    cors: true,
    proxy: {
      "/api": {
        target: "https://sabbir2000.ssh.bd",
        changeOrigin: true,
        secure: false,
      },
      "/files": {
        target: "https://sabbir2000.ssh.bd",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
   
    outDir: "dist", 
  },
});
