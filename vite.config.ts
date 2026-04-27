import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    // Pre-bundle explícito + força usar SÓ o pt-BR (em vez do barrel de 132KB com todos locales).
    include: ["lucide-react", "date-fns", "date-fns/locale/pt-BR"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa libs grandes em chunks dedicados → cache mais eficiente
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          icons: ["lucide-react"],
          dates: ["date-fns"],
        },
      },
    },
  },
}));
