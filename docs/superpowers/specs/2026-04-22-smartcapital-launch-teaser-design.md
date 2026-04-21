# SmartCapital Launch Teaser Design

**Date:** 2026-04-22  
**Scope:** Single-file HTML animation demo for `smartcapital` launch teaser  
**Format:** `1920×1080`, 16:9 landscape, 25 seconds total runtime  
**Audience:** Prospective users and stakeholders evaluating SmartCapital as a serious fintech product  
**Out of scope:** Voice-over, soundtrack selection, MP4 export, vertical social cutdowns

---

## Problem

The product already has a clear interface language, but a standard screen recording would flatten it into a generic product walkthrough. A typical landing-page hero treatment would miss the product's actual strength: SmartCapital connects fast daily expense capture with deeper financial analysis and investment tracking.

The teaser needs to communicate that this is not "just another bookkeeping app." It should feel like a mature fintech product that links everyday behavior and capital decisions in one system.

---

## Goal

Create a 25-second HTML motion demo that presents SmartCapital through a "dual engine" narrative:

- `LINE` for low-friction capture
- `Web` for deeper analysis and investment perspective

The final piece should feel calm, premium, and trustworthy, while still showing enough product truth that it clearly belongs to the existing SmartCapital frontend.

---

## Design Principles

### 1. Product-True, Not Screen-Recorded

Use SmartCapital's real interface language as source material:

- warm paper background
- graphite / blue-gray typography
- restrained red / green status accents
- soft card edges and generous whitespace

But recompose the UI into cinematic layouts instead of showing a literal browser window or dashboard recording.

### 2. Mobile-First Narrative

The user's real usage pattern starts on mobile, so the teaser begins from a mobile mental model:

- fast message input
- instant category understanding
- frictionless confirmation

The web view should feel like the same data unfolding into a broader financial surface, not a separate product.

### 3. Dual Engine Structure

The central motion idea is that one action feeds the next:

`capture -> structure -> overview -> insight -> allocation`

The LINE moment is not an isolated feature cameo. It is the first engine that powers the second engine.

### 4. Fintech Restraint

Avoid:

- purple gradients
- neon glows
- floating "AI" particles
- emoji
- flashy pseudo-3D dashboard tricks
- loud, salesy hero-section behavior

Prefer:

- measured easing
- layered card transitions
- precise numeric typography
- calm reveals
- clean data emphasis

---

## Narrative Summary

The teaser starts from a single daily expense and ends on capital allocation and investment tracking.

The user's confirmed example is:

- input: `-120 牛肉麵`
- system understanding: automatically classified as `午餐`

This example becomes the emotional and structural bridge between daily life and portfolio awareness.

---

## Timeline

## Phase 1 — Opening

**Time:** `0.0s - 4.0s`

**Purpose:** Establish the brand and thesis before any interface detail appears.

**On screen:**

- `smartcapital`
- `智投手帳`
- core line: `記帳的速度，投資的視野`

**Motion:**

- soft fade + horizontal drift, not scale-pop
- background gains subtle depth through layered paper-toned planes
- typography appears in two beats so the main line remains readable

**Readability rule:**

- the core line must remain stable and readable for at least `1.8s`

---

## Phase 2 — LINE Capture

**Time:** `4.0s - 9.0s`

**Purpose:** Show low-friction capture with immediate understanding.

**On screen:**

- mobile-like message input surface
- typed expense: `-120 牛肉麵`
- category resolution into `午餐`
- lightweight record confirmation

**Motion:**

- text entry appears with crisp cadence, not character-by-character comedy typing
- message locks into place quickly
- category chip and amount confirmation slide into alignment with minimal delay
- confirmation uses subtle state change rather than celebratory animation

**Narrative emphasis:**

- the product feels fast because it understands the input, not because it is visually noisy
- this moment should communicate "I can log this in seconds"

**Readability rule:**

- the resolved state (`牛肉麵 -> 午餐`) must sit long enough to be understood in one glance

---

## Phase 3 — Dashboard Expansion

**Time:** `9.0s - 14.0s`

**Purpose:** Expand one recorded event into broader financial context.

**On screen:**

- total assets
- current month income / expense / balance
- budget progress
- recent transactions

**Motion:**

- the mobile capture card stretches and splits into web cards
- panels do not "appear from nowhere"; they inherit geometry from the previous scene
- use one continuous camera feeling: the small personal action becomes a larger system overview

**Visual framing:**

- not a full browser screenshot
- instead, a composed analytics surface inspired by the real dashboard
- sidebar chrome may be hinted at briefly, but should not dominate the frame

**Readability rule:**

- the dashboard must settle for about `2.0s` before the next transformation starts

---

## Phase 4 — Analytics + Investment

**Time:** `14.0s - 21.0s`

**Purpose:** Prove that SmartCapital extends beyond bookkeeping into financial insight and investment perspective.

**On screen:**

- expense / income trend
- category analysis
- asset allocation
- investment tracking

**Motion:**

- trend and category views should emerge as analytic slices of the same dataset
- allocation and portfolio surfaces should arrive as a widening of perspective, not a hard mode switch
- motion should feel cumulative: each panel explains a deeper level of the same financial story

**Narrative emphasis:**

- this is where the teaser answers "why SmartCapital instead of a simple ledger?"
- analytics should feel practical and precise
- investment visuals should feel integrated, not bolted on

**Readability rule:**

- each major data state should hold long enough to register its purpose
- avoid rapid-fire montage of many charts

---

## Phase 5 — Closing

**Time:** `21.0s - 25.0s`

**Purpose:** Return from interface detail to brand meaning.

**On screen:**

- brand lockup
- closing line

**Preferred closing line:**

- `從每一筆日常，到每一次配置決策`

**Motion:**

- analytics and allocation cards retract into a clean brand composition
- end on stillness, not one last effect

**Readability rule:**

- closing line should sit on screen clearly for at least `2.2s`

---

## Visual System

## Color Direction

Base the palette on the current product:

- warm paper / ivory backgrounds
- deep slate / graphite text
- muted blue-gray as primary control color
- soft sage and dusty rose for positive / negative data accents
- minimal gold / sand support where needed for asset / allocation warmth

Do not introduce a new campaign palette that fights the product.

## Typography Direction

- serif or semi-serif feeling for brand moments if needed
- clean sans for interface labels and data
- strong numeric hierarchy for amount and asset figures
- no exaggerated condensed display typography

## Layout Direction

- large breathing room
- soft card radii
- measured spacing
- controlled density

The frame should feel premium because it is well edited, not because it is overdesigned.

---

## Motion Language

Use:

- smooth lateral drift
- card stretch / split transitions
- masked reveals
- layered depth through parallax-like offsets
- precise opacity and blur changes only when they help focus

Avoid:

- bounce easing
- overshoot
- flashy zoom crashes
- constant floating motion
- decorative particles

Recommended easing character:

- mostly `easeOutExpo`, `easeInOutCubic`, or similarly calm premium curves

---

## Source Material Mapping

Reference source semantics from:

- `docs/screenshots/01-dashboard.png`
- `docs/screenshots/03-analytics.png`
- `docs/screenshots/04-ledger.png`

These references should guide:

- card structure
- spacing behavior
- section hierarchy
- real product vocabulary

The teaser may simplify and recompose these surfaces, but should remain visibly derived from them.

---

## Implementation Shape

## Deliverable

One standalone HTML animation demo file.

## Technical Constraints

- single file delivery
- animation timeline embedded in the HTML
- no dependence on external JSX files at runtime
- designed to be previewable locally
- text timing tuned for readability, not just motion rhythm

## Preferred Structure

- one master timeline controller for `25s`
- phase-based scene components
- shared tokens for palette, typography, easing, and spacing
- explicit scene windows for entry / hold / exit states

---

## Success Criteria

The teaser succeeds if:

- viewers immediately understand the thesis: `fast capture + deep financial perspective`
- the product feels more advanced than a normal expense tracker
- the teaser still feels recognizably SmartCapital
- every text beat is readable without pausing
- the motion feels premium, calm, and trustworthy

The teaser fails if:

- it looks like a dashboard recording
- it feels like a generic website hero
- the LINE and Web halves feel disconnected
- the investment angle feels tacked on
- the animation uses visual gimmicks to fake sophistication

---

## Files Expected To Change

| File | Action |
|---|---|
| `docs/superpowers/specs/2026-04-22-smartcapital-launch-teaser-design.md` | New design spec |
