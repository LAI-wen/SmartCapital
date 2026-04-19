# MiniWallet UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition SmartCapital's product identity from "investment toolkit" to "monthly financial progress" by renaming to MiniWallet, restructuring navigation, reorganizing the More page, and reframing Strategy Lab as a wealth goal simulator.

**Architecture:** Pure frontend content/IA change — no backend API changes, no new routes, no new components. All changes are text, copy, navigation structure, and grouping within existing files.

**Tech Stack:** React + TypeScript, React Router (HashRouter), react-i18next, lucide-react

---

## File Map

| File | Change |
|------|--------|
| `index.html` | page title |
| `App.tsx` | sidebar brand text, page title strings, bottom nav (replace Notifications with Review), desktop sidebar order |
| `components/WelcomePage.tsx` | brand name, headline copy, feature list copy |
| `components/MorePage.tsx` | full menu group restructure (4 new groups) |
| `components/StrategyLab.tsx` | page title, subtitle, Compound tab label |
| `i18n/locales/zh-TW.ts` | nav.analytics → '回顧', strategy.title → '財富目標試算' |
| `i18n/locales/en-US.ts` | nav.analytics → 'Review', strategy.title → 'Wealth Goal Simulator' |

---

## Task 1: Brand rename — 智投手帳 → MiniWallet

**Files:**
- Modify: `index.html:5`
- Modify: `App.tsx:290,309-311,359`
- Modify: `components/WelcomePage.tsx:33,77,87-89`
- Modify: `components/MorePage.tsx:150`

- [ ] **Step 1: Update index.html page title**

```html
<!-- index.html line 5 — change to: -->
<title>MiniWallet</title>
```

- [ ] **Step 2: Update App.tsx sidebar logo and default page title**

In `App.tsx`, find the `getPageTitle` function's default case (~line 290):
```typescript
default: return 'MiniWallet';
```

Find the sidebar logo section (~line 307-312):
```tsx
<div className="p-8 flex items-center gap-3">
   <div className="w-10 h-10 bg-morandi-blue text-white rounded-lg flex items-center justify-center font-serif text-xl font-bold shadow-md">M</div>
   <h1 className="text-xl font-serif font-bold text-ink-900 tracking-wide">
     MiniWallet
   </h1>
</div>
```

Find the user card avatar fallback (~line 359):
```tsx
{displayName ? displayName[0].toUpperCase() : 'M'}
```

- [ ] **Step 3: Update WelcomePage.tsx brand text**

Desktop left column brand (~line 31-33):
```tsx
<div className="flex items-center gap-3">
  <div className="w-10 h-10 bg-morandi-blue text-white rounded-lg flex items-center justify-center font-serif text-xl font-bold shadow-md">M</div>
  <span className="text-xl font-serif font-bold text-ink-900 tracking-wide">MiniWallet</span>
</div>
```

Desktop footer (~line 77):
```tsx
<div className="text-sm text-ink-400 font-serif">
  © 2025 MiniWallet. All rights reserved.
</div>
```

Mobile header (~line 86-89):
```tsx
<div className="lg:hidden flex flex-col items-center justify-center mb-8">
  <div className="w-16 h-16 bg-morandi-blue text-white rounded-2xl flex items-center justify-center font-serif text-3xl font-bold shadow-lg mb-4">M</div>
  <span className="text-2xl font-serif font-bold text-ink-900 tracking-wide">MiniWallet</span>
  <p className="text-sm text-ink-400 mt-2 font-serif">月月進步，逐步富足</p>
</div>
```

- [ ] **Step 4: Update MorePage.tsx version footer**

In `components/MorePage.tsx` (~line 150):
```tsx
<div className="text-center mt-4 text-[10px] text-stone-300 font-serif">
   MiniWallet v1.0.3 (Beta)
</div>
```

- [ ] **Step 5: Start dev server and verify brand text throughout**

```bash
cd /Users/wen/Documents/Development/smartcapital
npm run dev
```

Open http://localhost:5173 (or whichever port). Check:
- Browser tab shows "MiniWallet"
- Sidebar logo shows "M" + "MiniWallet"
- More page footer shows "MiniWallet v1.0.3"
- Welcome page (logout first) shows "MiniWallet"

- [ ] **Step 6: Commit**

```bash
git add index.html App.tsx components/WelcomePage.tsx components/MorePage.tsx
git commit -m "rebrand: rename 智投手帳 to MiniWallet"
```

---

## Task 2: Welcome page — update product copy

**Files:**
- Modify: `components/WelcomePage.tsx`

The current welcome page describes the product as an investment toolkit (凱利公式、進階策略實驗室). Replace with monthly-progress framing.

- [ ] **Step 1: Update desktop headline and subtitle**

Find the heading block (~line 37-44):
```tsx
<div className="mb-20">
  <h1 className="text-6xl font-serif font-bold text-ink-900 mb-6 leading-tight">
    掌握每月進度<br />
    <span className="text-morandi-blue italic">存更多</span>、<span className="text-morandi-sage italic">投得穩</span>
  </h1>
  <p className="text-xl text-ink-500 font-serif leading-relaxed max-w-md">
    從每日記帳到預算回顧，一步步把多出來的錢變成長期財富。
  </p>
```

- [ ] **Step 2: Update desktop feature list (3 items)**

Replace the three feature items (~line 45-73) with:
```tsx
<div className="mt-10 space-y-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-morandi-blueLight flex items-center justify-center">
      <ReceiptText size={20} className="text-morandi-blue" />
    </div>
    <div>
      <div className="text-sm font-bold text-ink-900">日日記帳，月月清楚</div>
      <div className="text-xs text-ink-400">快速輸入、分類管理、預算追蹤</div>
    </div>
  </div>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-morandi-sageLight flex items-center justify-center">
      <TrendingUp size={20} className="text-morandi-sage" />
    </div>
    <div>
      <div className="text-sm font-bold text-ink-900">月度回顧，看見進步</div>
      <div className="text-xs text-ink-400">收支趨勢、預算執行率、月結餘</div>
    </div>
  </div>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-morandi-blueLight flex items-center justify-center">
      <Shield size={20} className="text-morandi-blue" />
    </div>
    <div>
      <div className="text-sm font-bold text-ink-900">安全的資料保護</div>
      <div className="text-xs text-ink-400">透過 LINE 登入，無需額外註冊</div>
    </div>
  </div>
</div>
```

Add `ReceiptText, TrendingUp` to WelcomePage.tsx imports (they are already available from lucide-react — just add them to the import line):
```tsx
import { ArrowRight, CheckCircle, Smartphone, TrendingUp, Shield, Zap, ReceiptText } from 'lucide-react';
```

- [ ] **Step 3: Update login subtitle**

Find the welcome card subtitle (~line 94-96):
```tsx
<p className="text-ink-500 text-base font-serif leading-relaxed">
  透過 LINE 登入，開始你的理財旅程
</p>
```

- [ ] **Step 4: Update mobile feature list (~line 142-155)**

Replace the three checklist items:
```tsx
<div className="lg:hidden mt-10 space-y-3 pt-6 border-t border-stone-200">
  <div className="flex items-center gap-2">
    <CheckCircle size={14} className="text-morandi-sage shrink-0" />
    <span className="text-xs text-ink-600 font-serif">日日記帳，月月清楚</span>
  </div>
  <div className="flex items-center gap-2">
    <CheckCircle size={14} className="text-morandi-sage shrink-0" />
    <span className="text-xs text-ink-600 font-serif">月度回顧，看見進步</span>
  </div>
  <div className="flex items-center gap-2">
    <CheckCircle size={14} className="text-morandi-sage shrink-0" />
    <span className="text-xs text-ink-600 font-serif">LINE Bot 即時記帳通知</span>
  </div>
</div>
```

- [ ] **Step 5: Verify in browser**

Log out (clear localStorage or open incognito). Confirm:
- Headline reads "掌握每月進度..."
- Feature items no longer mention "凱利公式" or "策略實驗室"
- Mobile view shows the 3 new feature items

- [ ] **Step 6: Commit**

```bash
git add components/WelcomePage.tsx
git commit -m "refactor: update welcome page copy to monthly-progress framing"
```

---

## Task 3: App navigation restructuring

**Files:**
- Modify: `App.tsx`
- Modify: `i18n/locales/zh-TW.ts`
- Modify: `i18n/locales/en-US.ts`

**Goal:** 
- Mobile bottom nav: Home | Ledger | 回顧 (Analytics) | More  (replaces current Home | Ledger | Notifications | More)
- Desktop sidebar: rename Analytics → "回顧 (Review)", demote Strategy below divider
- Page titles: update Analytics and Strategy

- [ ] **Step 1: Update i18n nav keys**

In `i18n/locales/zh-TW.ts`, update the `nav` section:
```typescript
nav: {
  dashboard: '主頁',
  ledger: '記帳',
  analytics: '回顧',
  strategy: '策略',
  notifications: '通知',
  settings: '設定',
  help: '幫助',
  more: '更多',
},
```

In `i18n/locales/en-US.ts`, update the `nav` section:
```typescript
nav: {
  dashboard: 'Home',
  ledger: 'Ledger',
  analytics: 'Review',
  strategy: 'Strategy',
  notifications: 'Notifications',
  settings: 'Settings',
  help: 'Help',
  more: 'More',
},
```

Also update `strategy.title` in `zh-TW.ts`:
```typescript
strategy: {
  title: '財富目標試算',
  // ... rest unchanged
},
```

And in `en-US.ts`:
```typescript
strategy: {
  title: 'Wealth Goal Simulator',
  // ... rest unchanged
},
```

- [ ] **Step 2: Update getPageTitle in App.tsx**

Find the `getPageTitle` function (~line 277-292):
```typescript
const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/': return '主頁';
    case '/strategy': return '財富目標試算';
    case '/ledger': return '收支手帳';
    case '/notifications': return '通知中心';
    case '/more': return '功能選單';
    case '/analytics': return '本月回顧';
    case '/settings': return '系統設定';
    case '/help': return '使用指南';
    case '/account-management': return '帳戶管理';
    case '/price-alerts': return '價格警示';
    case '/budget-settings': return '預算設定';
    default: return 'MiniWallet';
  }
};
```

- [ ] **Step 3: Update desktop sidebar nav items**

Find the sidebar nav section (~line 314-350). Replace with:
```tsx
<nav className="flex-1 px-6 space-y-3 mt-4 overflow-y-auto">
  <NavLink to="/" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
    <LayoutDashboard size={18} />
    <span className="font-medium tracking-wide">主頁 (Home)</span>
  </NavLink>
  <NavLink to="/ledger" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
    <ReceiptText size={18} />
    <span className="font-medium tracking-wide">記帳 (Ledger)</span>
  </NavLink>
  <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
     <TrendingUp size={18} />
     <span className="font-medium tracking-wide">回顧 (Review)</span>
  </NavLink>

  <div className="pt-4 mt-4 border-t border-stone-100">
    <NavLink to="/strategy" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
       <Calculator size={18} />
       <span className="font-medium tracking-wide">財富試算</span>
    </NavLink>
    <NavLink to="/account-management" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
      <Wallet size={18} />
      <span className="font-medium tracking-wide">帳戶 (Accounts)</span>
    </NavLink>
     <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
      <Settings size={18} />
      <span className="font-medium tracking-wide">設定 (Settings)</span>
    </NavLink>
    <NavLink to="/help" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
      <HelpCircle size={18} />
      <span className="font-medium tracking-wide">幫助 (Help)</span>
    </NavLink>
  </div>
</nav>
```

Note: The current imports in App.tsx already include `LayoutDashboard, ReceiptText, Bell, Menu, Settings, ChevronRight, TrendingUp, Calculator, HelpCircle, Wallet`. No new imports needed.

- [ ] **Step 4: Update mobile bottom nav**

Find the bottom nav (~line 481-517). Replace the Notifications tab with Analytics/Review:
```tsx
<nav className="md:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 h-20 fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center px-2 pb-2 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
  <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
    {({ isActive }) => (
      <>
        <LayoutDashboard size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium font-serif">{t('nav.dashboard')}</span>
      </>
    )}
  </NavLink>
  <NavLink to="/ledger" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
    {({ isActive }) => (
      <>
        <ReceiptText size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium font-serif">{t('nav.ledger')}</span>
      </>
    )}
  </NavLink>
  <NavLink to="/analytics" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
    {({ isActive }) => (
      <>
        <TrendingUp size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium font-serif">{t('nav.analytics')}</span>
      </>
    )}
  </NavLink>
  <NavLink to="/more" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
    {({ isActive }) => (
      <>
        <Menu size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium font-serif">{t('nav.more')}</span>
      </>
    )}
  </NavLink>
</nav>
```

- [ ] **Step 5: Verify in browser (mobile viewport)**

In Chrome DevTools, switch to mobile viewport (375px wide). Check:
- Bottom nav shows: 主頁 | 記帳 | 回顧 | 更多
- Tapping "回顧" navigates to /analytics
- Analytics page header shows "本月回顧"
- Desktop sidebar shows: 主頁, 記帳, 回顧 (Review) as primary; then divider; then 財富試算, 帳戶, 設定, 幫助

- [ ] **Step 6: Commit**

```bash
git add App.tsx i18n/locales/zh-TW.ts i18n/locales/en-US.ts
git commit -m "refactor: restructure navigation — Analytics becomes Review in primary nav"
```

---

## Task 4: More page reorganization

**Files:**
- Modify: `components/MorePage.tsx`

**Goal:** Reorganize from `策略工具 | 帳戶管理 | 系統設定 | 幫助` into `財務工具 | 提醒中心 | 帳戶設定 | 系統與幫助` per spec Section 6. Remove Analytics from More (now in primary nav).

- [ ] **Step 1: Update imports in MorePage.tsx**

Current imports (line 1-8):
```tsx
import { Calculator, Settings, Shield, ChevronRight,
  MessageCircle, FileText, PieChart, HelpCircle,
  LogOut, Wallet, Bell, PiggyBank } from 'lucide-react';
```

Replace with (add `Sprout`, `AlertTriangle`; remove `Calculator`, `PieChart`):
```tsx
import { Sprout, Settings, Shield, ChevronRight,
  MessageCircle, FileText, AlertTriangle, HelpCircle,
  LogOut, Wallet, Bell, PiggyBank } from 'lucide-react';
```

- [ ] **Step 2: Replace menuGroups array**

Replace the entire `menuGroups` constant (~line 17-108):
```tsx
const menuGroups = [
  {
    title: "財務工具",
    items: [
      {
        label: "財富目標試算",
        icon: <Sprout size={20} />,
        desc: "定期投入複利成長、財富路徑預測",
        action: () => navigate('/strategy'),
        color: "bg-morandi-sageLight text-morandi-sage"
      }
    ]
  },
  {
    title: "提醒中心",
    items: [
      {
        label: "通知中心",
        icon: <Bell size={20} />,
        desc: "系統通知與財務提醒",
        action: () => navigate('/notifications'),
        color: "bg-yellow-100 text-yellow-700"
      },
      {
        label: "價格警示",
        icon: <AlertTriangle size={20} />,
        desc: "股票漲跌提醒、停利停損",
        action: () => navigate('/price-alerts'),
        color: "bg-yellow-100 text-yellow-700"
      }
    ]
  },
  {
    title: "帳戶設定",
    items: [
      {
        label: "我的帳戶",
        icon: <Wallet size={20} />,
        desc: "管理資金帳戶和餘額",
        action: () => navigate('/account-management'),
        color: "bg-morandi-blueLight/30 text-morandi-blue"
      },
      {
        label: "預算設定",
        icon: <PiggyBank size={20} />,
        desc: "設定各類別月預算上限",
        action: () => navigate('/budget-settings'),
        color: "bg-morandi-sageLight text-morandi-sage"
      },
      {
        label: "LINE Bot 綁定",
        icon: <MessageCircle size={20} />,
        desc: "快速記帳通知",
        action: () => navigate('/settings'),
        color: "bg-[#06C755]/10 text-[#06C755]"
      }
    ]
  },
  {
    title: "系統與幫助",
    items: [
      {
        label: "偏好設定",
        icon: <Settings size={20} />,
        desc: "幣別、顯示語言",
        action: () => navigate('/settings'),
        color: "bg-stone-100 text-ink-500"
      },
      {
        label: "隱私安全",
        icon: <Shield size={20} />,
        desc: "密碼鎖、隱藏金額",
        action: () => navigate('/settings'),
        color: "bg-stone-100 text-ink-500"
      },
      {
        label: "使用指南",
        icon: <FileText size={20} />,
        desc: "新手教學影片",
        action: () => navigate('/help'),
        color: "bg-stone-100 text-ink-500"
      },
      {
        label: "聯絡客服",
        icon: <HelpCircle size={20} />,
        desc: "回報問題",
        action: () => navigate('/help'),
        color: "bg-stone-100 text-ink-500"
      }
    ]
  }
];
```

- [ ] **Step 3: Verify in browser**

Navigate to More page. Confirm:
- 4 groups visible: 財務工具 | 提醒中心 | 帳戶設定 | 系統與幫助
- "財富目標試算" navigates to /strategy
- "通知中心" navigates to /notifications
- "價格警示" navigates to /price-alerts
- No "數據分析" entry (now in primary nav)
- No TypeScript errors in console

- [ ] **Step 4: Commit**

```bash
git add components/MorePage.tsx
git commit -m "refactor: reorganize More page into 4 purpose-based groups"
```

---

## Task 5: Strategy Lab — reframe as wealth goal simulator

**Files:**
- Modify: `components/StrategyLab.tsx`

**Goal:** Rename the page title and subtitle to reflect the new "月定投目標試算" framing. Keep all existing calculators unchanged (no feature removal). Make Compound tab visually prominent as the recommended entry point.

- [ ] **Step 1: Update page title and subtitle**

Find the header section (~line 219-224):
```tsx
<div className="mb-6 flex justify-between items-end">
  <div>
    <h2 className="text-2xl font-bold font-serif text-ink-900 mb-2">財富目標試算</h2>
    <p className="text-ink-400 text-sm font-serif">試算你的定期投入，看見財富成長的可能。</p>
  </div>
  {!showGuide && (
    <button onClick={() => setShowGuide(true)} className="text-morandi-blue text-sm font-serif underline">
      顯示新手教學
    </button>
  )}
</div>
```

- [ ] **Step 2: Update Compound tab label to signal it as the recommended entry**

Find the Tabs section (~line 232-239). Change the Compound TabButton:
```tsx
<TabButton id="Compound" label="財富試算 ✦" icon={Sprout} />
```

The `✦` symbol visually marks it as the primary/recommended tool without adding UI complexity.

- [ ] **Step 3: Update Compound tab GuideCard title**

Find the GuideCard for Compound (~line 247-252):
```tsx
<GuideCard 
   title="複利試算 — 財富成長的核心工具"
   concept="這是長期投資人最強大的武器。時間越長，複利的效果越驚人。這也是為什麼常說『越早開始越好』。"
   bestFor="定期定額買 0050、0056 或全球股票基金，或任何想估算未來資產規模的人。"
   risk="需有耐心，前幾年的效果不明顯，且需確保持續投入不中斷。"
/>
```

- [ ] **Step 4: Verify in browser**

Navigate to Strategy page (via More → 財富目標試算). Confirm:
- Page header shows "財富目標試算"
- Subtitle shows new copy
- Compound tab label shows "財富試算 ✦"
- All other tabs (VA, Grid, Pyramid, Kelly, Martingale) still work correctly

- [ ] **Step 5: Commit**

```bash
git add components/StrategyLab.tsx
git commit -m "refactor: reframe Strategy Lab as wealth goal simulator"
```

---

## Self-Review Checklist

Run before marking the plan complete:

**Spec coverage check:**
- [x] Section 3 Naming: 智投手帳 → MiniWallet — Task 1
- [x] Section 5.1 Home: already exists as Dashboard, title updated — Task 3
- [x] Section 5.2 Ledger: no changes needed, already correct
- [x] Section 5.3 Review: Analytics renamed to 回顧, promoted to primary nav — Task 3
- [x] Section 5.4 More: restructured into 4 groups — Task 4
- [x] Section 6 More page structure: 財務工具/提醒中心/帳戶設定/系統與幫助 — Task 4
- [x] Section 7 Strategy Lab repositioning: renamed, reframed — Task 5
- [x] Section 12 Welcome page copy: updated — Task 2
- [ ] Section 9 Home page content priorities: Home/Dashboard shows monthly progress first — **not in scope for this plan** (Dashboard UI restructure is a separate initiative; the current Dashboard already shows monthly summary elements)

**Placeholder scan:** No TBD, TODO, or incomplete steps found.

**Type consistency:** No new types introduced. All route strings (/strategy, /analytics, /notifications) match existing routes in App.tsx.
