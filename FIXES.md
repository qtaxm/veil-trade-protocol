# Bug Fixes and Updates

## Fixed: FHE SDK Import Error (2025-10-27)

### Problem
```
Uncaught TypeError: Cannot read properties of undefined (reading 'initSDK')
    at bundle.js:1:42
```

### Root Cause
The import path `@zama-fhe/relayer-sdk/bundle` was being used, which relies on `window.relayerSDK` that isn't available in the module context.

### Solution
Changed imports from `/bundle` to `/web` export:

#### Before (Incorrect):
```typescript
import {
  createInstance,
  initSDK,
  SepoliaConfig,
  FheInstance,
  EncryptedInput
} from '@zama-fhe/relayer-sdk/bundle';
```

#### After (Correct):
```typescript
import {
  createInstance,
  initSDK,
  SepoliaConfig,
  FhevmInstance,
  RelayerEncryptedInput
} from '@zama-fhe/relayer-sdk/web';

// Type aliases for better naming
type FheInstance = FhevmInstance;
type EncryptedInput = RelayerEncryptedInput;
```

### Files Updated
1. [`src/contexts/FHEContext.tsx`](src/contexts/FHEContext.tsx) - FHE SDK initialization
2. [`src/lib/fheUtils.ts`](src/lib/fheUtils.ts) - FHE utilities

### Package Exports Reference
From `@zama-fhe/relayer-sdk/package.json`:
```json
"exports": {
  "./web": {
    "import": "./lib/web.js",
    "types": "./lib/web.d.ts"
  },
  "./bundle": {
    "import": "./bundle.js",
    "types": "./bundle.d.ts"
  },
  "./node": {
    "import": "./lib/node.js",
    "types": "./lib/node.d.ts"
  }
}
```

### Verification
Build now completes successfully:
```bash
npm run build
# ✓ built in 3.04s
```

### Type Changes
- `FheInstance` → Use `FhevmInstance` from SDK
- `EncryptedInput` → Use `RelayerEncryptedInput` from SDK

These are aliased for backward compatibility in the code.

---

## Build Output
The build now includes FHE WebAssembly modules:
- `kms_lib_bg-*.wasm` (652 KB) - Key management
- `tfhe_bg-*.wasm` (4.6 MB) - FHE operations

These are necessary for the FHE functionality and will be loaded automatically.

---

## Testing After Fix

Start dev server:
```bash
npm run dev
```

The console should now show:
```
[FHE] Initializing SDK...
[FHE] Creating instance with SepoliaConfig...
[FHE] Initialization complete!
```

No more errors about undefined `initSDK`.

---

## Fixed: Global is not defined (2025-10-27)

### Problem
```
Uncaught ReferenceError: global is not defined
    at web.js:17446:1
```

### Root Cause
The Zama SDK (`@zama-fhe/relayer-sdk/web`) uses Node.js global variables that don't exist in the browser environment.

### Solution
Added Vite configuration to polyfill Node.js globals for browser compatibility.

#### Updated `vite.config.ts`:
```typescript
export default defineConfig(({ mode }) => ({
  // ... existing config
  define: {
    // Fix for Zama SDK - provide Node.js globals for browser
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      },
    },
  },
}));
```

### Explanation
- `global: 'globalThis'` - Maps Node.js `global` to browser `globalThis`
- `process.env: {}` - Provides empty `process.env` for browser
- `optimizeDeps.esbuildOptions.define` - Applies polyfill during dependency optimization

### Verification
After this fix:
- ✅ Build completes successfully
- ✅ Dev server starts without errors
- ✅ FHE SDK initializes properly in browser

---

Last Updated: 2025-10-27
