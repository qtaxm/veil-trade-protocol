import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      // Allow serving files from node_modules (for WASM files)
      allow: ['..']
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Node.js polyfills for browser
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
    },
  },
  define: {
    // Fix for Zama SDK - provide Node.js globals for browser
    global: 'globalThis',
    'process.env': {},
    'process.browser': true,
  },
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
    include: ['keccak', 'secp256k1', 'fetch-retry'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      },
    },
  },
  // Ensure WASM files are properly handled
  assetsInclude: ['**/*.wasm'],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
