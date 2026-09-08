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

    allowedHosts: [ "preview.syedbipul.me" , "https://sabbir8080.ssh.bd"],

    host: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:2000",
        changeOrigin: true,
        secure: false,
      },
      "/files": {
        target: "http://localhost:2000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
   
    outDir: "dist", 
  },
});
