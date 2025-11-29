import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import rollupNodePolyfills from "rollup-plugin-node-polyfills";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

// â­ FHEVM 0.9: Fix CommonJS imports for keccak and fetch-retry
const fixCommonJSImports = () => ({
  name: 'fix-commonjs-imports',
  transform(code: string, id: string) {
    // Only transform the FHE SDK's web.js file
    if (id.includes('@zama-fhe/relayer-sdk/lib/web.js')) {
      let fixed = code;

      // Fix keccak import
      fixed = fixed.replace(
        /import\s+(\w+)\s+from\s+['"]keccak['"]/g,
        "import * as $1Module from 'keccak'; const $1 = $1Module.default || $1Module"
      );

      // Fix fetch-retry import
      fixed = fixed.replace(
        /import\s+(\w+)\s+from\s+['"]fetch-retry['"]/g,
        "import * as $1Module from 'fetch-retry'; const $1 = $1Module.default || $1Module"
      );

      return { code: fixed, map: null };
    }
    return null;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    fixCommonJSImports(), // â­ FHEVM 0.9 required
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      stream: "stream-browserify",
      buffer: "buffer/",
      util: "util/",
      process: "process/browser",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'], // Don't pre-bundle SDK
    include: ['keccak', 'fetch-retry'],  // Pre-optimize CommonJS modules
    esbuildOptions: {
      target: 'esnext', // Support WASM
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/keccak/, /fetch-retry/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [rollupNodePolyfills()],
    },
  },
}));
