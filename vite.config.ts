import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// GitHub Pages serves project sites from /<repository-name>/.
// Keep the root path for local development and other environments.
export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_ACTIONS === "true" ? "/lupus-cortexdata/" : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
