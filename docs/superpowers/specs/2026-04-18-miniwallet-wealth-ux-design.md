# MiniWallet Wealth UX Design

**Date:** 2026-04-18  
**Topic:** Reposition SmartCapital around monthly financial progress and gradual wealth-building UX  
**Status:** Approved design for implementation planning

---

## 1. Problem Statement

The current product already has a usable core in `Dashboard`, `Ledger`, `Budget Settings`, and `Analytics`, but the overall product story is blurred by secondary features that lack a clear role.

Observed issues from repo review and product discussion:

- The main value is closer to daily money management and monthly financial reflection than to advanced investing tools.
- Several secondary pages in `More` feel detached from the main journey:
  - `Strategy Lab`
  - `Notifications`
  - `Price Alerts`
  - `My Accounts`
  - `Preferences / Privacy / LINE Bot binding / Help / Contact`
- The current welcome and product framing still over-signal "investment tools" and "strategy" even though that is not the real core experience.
- `Strategy Lab` is not a core navigation item today, but its naming and grouping still make it feel more central and more useful than it actually is.

This creates a UX mismatch:

- The product is strongest when helping users understand "how am I doing this month?"
- The UI still partially presents itself like an investing toolkit.

---

## 2. Product Positioning

The new product positioning is:

**MiniWallet helps users understand their monthly financial state first, then gradually turn surplus cash into long-term wealth-building habits.**

The intended user journey is:

`Record money -> manage budget -> review monthly progress -> decide investable amount -> estimate future growth`

This means:

- Investing stays in the product
- Stock holdings can stay in the product
- Alerts can stay in the product
- But none of them should lead the product story before the user understands their current financial position

The product should feel approachable for someone who buys stocks but does not consider themselves an advanced investor.

---

## 3. Naming Direction

The current name `智投手帳` feels too explicit, awkward in tone, and too biased toward an "investment/accounting hybrid tool" identity.

The new naming direction should be lighter and more approachable.

Recommended temporary naming direction:

- Primary working name: `MiniWallet`
- Positioning intent: daily, lightweight, non-intimidating, compatible with budgeting + saving + future investing features

This spec does **not** require a final rebrand decision, but implementation and content planning should assume the product is moving away from the current `智投手帳` framing.

---

## 4. Core UX Principle

The main UX principle is:

**Do not present the product as a feature list. Present it as a financial progression path.**

That path should answer these questions in order:

1. How am I doing this month?
2. Am I actually saving money?
3. What should I adjust next?
4. How much could I invest steadily?
5. If I keep going, what could this become later?

Anything that does not help answer this path should be visually and structurally demoted.

---

## 5. Navigation Model

The new top-level navigation should be simplified into four primary destinations plus a secondary tools/settings layer.

### Primary Navigation

#### 5.1 Home

**Role:** Monthly financial progress homepage

Home should answer:

- income this month
- spending this month
- how much has been saved this month
- budget status
- recent activity
- a lightweight "next step" suggestion

This page is **not** an investing dashboard and **not** a shortcut wall.

It is the user's main financial status board.

#### 5.2 Ledger

**Role:** Fast daily entry and correction flow

Ledger remains the high-frequency action page.

It should continue emphasizing:

- quick transaction entry
- recent transactions
- category handling
- low-friction daily usage

The page should feel operational, not analytical.

#### 5.3 Review

**Role:** Monthly reflection and progress understanding

This can be delivered by evolving the current analytics/reporting experience into a clearer "review" role.

Review should help users answer:

- did I improve this month?
- where did money go?
- did I stay within budget?
- did I actually accumulate cash?
- if relevant, how did investments affect overall progress?

This page is where the product becomes reflective rather than transactional.

#### 5.4 More

**Role:** Secondary and lower-frequency functions

`More` should no longer carry product identity.

It should be the place users go when they need specific tools, advanced features, or system pages.

---

## 6. More Page Structure

The current `More` page should be reorganized by user purpose, not by a loose list of features.

### 6.1 Financial Tools

Contains:

- `Monthly Contribution / Wealth Goal Simulator` (the new form of Strategy Lab)

This section is for forward-looking planning tools, not formula showcases.

### 6.2 Reminder Center

Contains:

- notifications
- financial reminders
- investment reminders / price alerts

Long-term target reminders include:

- budget almost exceeded
- no ledger entry this week
- monthly review ready
- unusual stock movement

This section is important, but it should be treated as a second-phase integration area, not the first thing users see.

### 6.3 Money Setup

Contains:

- accounts
- budget settings
- LINE Bot quick-entry connection

These are important supporting functions, but not the main narrative layer.

### 6.4 System & Help

Contains:

- preferences
- privacy / security
- usage guide
- contact support

These pages remain available but should have clearly lower visual importance.

---

## 7. Strategy Lab Repositioning

`Strategy Lab` should not continue as a generic strategy/formula playground.

The current tools such as Kelly, Martingale, and similar calculators are difficult for general users to understand and do not connect clearly to the core product flow.

### New Role

The feature should be repositioned as:

**Monthly Contribution / Wealth Goal Simulator**

Core questions it should answer:

- How much can I realistically invest each month?
- Given my current financial rhythm, am I ready to start investing steadily?
- If I invest a fixed amount monthly, what might this grow into over time?
- What target am I building toward?

### Why this direction

This version:

- matches the new product story
- is useful for users who invest but are not advanced
- gives Strategy Lab a concrete purpose
- turns "interesting but detached tools" into "goal-oriented planning"

### Scope decision

For this implementation cycle:

- keep the concept alive
- change the product framing and IA positioning
- define the new purpose in content and plan
- do **not** require all old calculators to be fully redesigned in the same scope unless needed by the implementation plan

---

## 8. Stocks, Holdings, and Alerts

The product should continue allowing stock holdings and average purchase price to exist in the system.

However, holdings should be framed as part of total financial reality, not as the dominant identity of the app.

Recommended framing:

- "What do I currently own?"
- "What is my approximate gain/loss?"
- "Is something moving unusually and worth attention?"

This is intentionally simpler than a pro trading product.

Alerts should be understood as two families:

### 8.1 Financial Habit Alerts

- budget nearing limit
- missing weekly ledger activity
- review period ready

### 8.2 Investment Alerts

- stock price moved too much
- target-based movement worth noticing

Both belong in the future reminder center. The first family aligns more directly with the core product story and should be prioritized in UX planning over advanced market alerts.

---

## 9. Home Page Content Priorities

The user explicitly preferred this order:

1. monthly financial progress
2. monthly review summary
3. next-step guidance

Therefore Home should prioritize:

- current month numbers first
- review entry second
- recommendation layer third

The "coach" behavior should be light-touch, not the main surface.

The product should first show the facts, then suggest the next move.

---

## 10. Scope for This Design Cycle

This design should drive an implementation plan focused on product clarity and information architecture, not a full product rebuild.

### In Scope

- clarify product positioning
- define new navigation roles
- reorganize `More`
- reposition `Strategy Lab`
- align welcome / marketing copy with the new product story
- identify which secondary features should be demoted, retained, or deferred

### Out of Scope

- complete redesign of all secondary pages
- fully intelligent coaching system
- full reminder-center implementation
- complete investment tool overhaul
- complete rebrand rollout across every asset

---

## 11. Success Criteria

The redesign is successful if:

- a new user can understand the product as a monthly money-progress tool within the first session
- the Home page clearly communicates "how am I doing this month?"
- `More` no longer feels like a random pile of disconnected features
- `Strategy Lab` has a believable purpose tied to wealth-building goals
- investing features remain available without overwhelming the product's core story

---

## 12. Implementation Implication

The implementation plan that follows this spec should treat the work as an information architecture and content repositioning project first, with selective UI restructuring second.

The plan should specifically cover:

- navigation restructuring
- Home role refinement
- More page regrouping and relabeling
- welcome / onboarding copy updates
- first-step Strategy Lab repositioning

It should avoid expanding into an overly broad "rebuild everything" effort.
