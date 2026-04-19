# Batch 2: Tailwind CDN → Proper Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the runtime Tailwind CDN script with a build-time installation so Vite controls the CSS pipeline and unused classes are purged.

**Architecture:** Install `tailwindcss` + `@tailwindcss/vite` (Tailwind v4). Add the plugin to `vite.config.ts`. Migrate the custom theme (colors, fonts, shadows) from the inline `tailwind.config` JS object in `index.html` to a CSS `@theme` block in `src/index.css`. Remove the CDN `<script>` tag.

**Tech Stack:** Tailwind CSS v4, `@tailwindcss/vite`, Vite 6

---

### Task 1: Install Tailwind v4

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install packages**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Verify packages installed**

Run: `cat package.json | grep -A2 '"devDependencies"' | head -20`
Expected: `"tailwindcss"` and `"@tailwindcss/vite"` appear in devDependencies

---

### Task 2: Configure Vite plugin

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add the plugin**

Replace the contents of `vite.config.ts` with:
```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'framework';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (id.includes('lucide-react')) {
            return 'icons';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }

          if (id.includes('date-fns')) {
            return 'date-utils';
          }
        }
      }
    }
  },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
```

Note: `tailwindcss()` must come before `react()` in the plugins array.

---

### Task 3: Migrate custom theme to CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add Tailwind import and theme block**

Replace the entire contents of `src/index.css` with:

```css
@import "tailwindcss";

@theme {
  --font-family-sans: Inter, sans-serif;
  --font-family-serif: "Noto Serif TC", "Lora", serif;
  --font-family-mono: "Lora", monospace;

  --color-paper: #F9F7F2;
  --color-ink-900: #2C3E50;
  --color-ink-800: #44403C;
  --color-ink-400: #78716C;
  --color-ink-100: #F5F5F4;
  --color-morandi-blue: #64748B;
  --color-morandi-blueLight: #E2E8F0;
  --color-morandi-sage: #84A98C;
  --color-morandi-sageLight: #E8F3EB;
  --color-morandi-rose: #D68C92;
  --color-morandi-roseLight: #FBEBEB;
  --color-morandi-sand: #E6E2D6;
  --color-morandi-clay: #C2B280;

  --shadow-soft: 0 4px 20px -2px rgba(68, 64, 60, 0.08);
  --shadow-paper: 2px 4px 12px rgba(0,0,0,0.03);
}

/* Global Styles */

/* Prevent iOS Safari from zooming on input focus */
input,
select,
textarea {
  font-size: 16px !important;
}

/* Keep larger font sizes intact */
input.text-xl,
input.text-2xl,
input.text-3xl {
  font-size: inherit !important;
}

/* Smooth transitions for all inputs */
input,
select,
textarea {
  transition: all 0.2s ease;
}
```

---

### Task 4: Clean up index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove CDN script and inline config**

Replace the `<head>` section of `index.html` with:

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MiniWallet</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Noto+Serif+TC:wght@400;500;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      body {
        background-color: #F9F7F2;
        color: #44403C;
      }
      /* Custom scrollbar to match paper theme */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #F9F7F2; 
      }
      ::-webkit-scrollbar-thumb {
        background: #D6D3C9; 
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #A8A29E; 
      }
      
      .font-serif-num {
        font-family: 'Lora', serif;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

---

### Task 5: Verify build and visual parity

- [ ] **Step 1: Run dev server and spot-check visuals**

```bash
npm run dev
```

Open `http://localhost:3000` in browser. Verify:
- Background color is warm parchment (`#F9F7F2`) ✓
- Text is dark charcoal ✓
- Custom colors (morandi-blue buttons, sage greens, etc.) render correctly ✓

If any colors look wrong, the `@theme` variable names might not match what the CSS classes expect. Tailwind v4 maps `--color-X-Y` to `text-X-Y`, `bg-X-Y` etc. — verify the mapping is correct.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: `✓ built in X.XXs` — the CSS bundle will be much smaller than CDN (no 300kb runtime)

- [ ] **Step 3: Run typecheck and tests**

```bash
npm run typecheck && npm run test:run
```

Expected: both pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: replace Tailwind CDN with @tailwindcss/vite build-time plugin"
```

---

### Troubleshooting

**If custom colors don't work:** Tailwind v4 CSS variable naming convention is `--color-{name}` for colors used as `bg-{name}`, `text-{name}`. For nested names like `morandi-blue`, the variable is `--color-morandi-blue`. If classes like `bg-morandi-blue` stop working, add them as CSS variables with the exact naming pattern Tailwind v4 expects.

**If `@theme` is not recognized:** Ensure `@import "tailwindcss"` is the first line in `src/index.css` and that the vite plugin is loaded.
