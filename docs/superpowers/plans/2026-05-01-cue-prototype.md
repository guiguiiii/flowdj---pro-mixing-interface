# Cue Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-pass per-deck `Cue` workflow with a two-step `Set -> Cue` assignment flow, a direct cue recall action that seeks and pauses, and visible per-deck UI state for cue readiness.

**Architecture:** Add a small pure helper module for cue state transitions and action resolution, then wire each deck's transport controls in `src/App.tsx` to that helper using the existing audio refs and playback time state.

**Tech Stack:** React 19, TypeScript/JS modules, Vite, HTMLAudioElement, node `assert`

---

### Task 1: Add failing tests for cue interaction rules

**Files:**
- Create: `src/cue.js`
- Create: `src/cue.test.mjs`
- Test: `src/cue.test.mjs`

- [ ] **Step 1: Write the failing test**

Cover the minimum rules outside React:

- toggling set mode on and off
- pressing `Cue` in set mode stores the current time and exits set mode
- pressing `Cue` outside set mode recalls the stored point and pauses
- a deck without a cue point does nothing on recall
- replacing a stored cue point works

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/cue.test.mjs`  
Expected: FAIL because `src/cue.js` does not exist yet

### Task 2: Implement cue state helpers

**Files:**
- Create: `src/cue.js`
- Test: `src/cue.test.mjs`

- [ ] **Step 1: Add minimal pure helper implementation**

Add helpers for:

- cue time normalization
- toggling set mode
- resolving what `Cue` should do in the current state
- applying a cue assignment result

- [ ] **Step 2: Run test to verify it passes**

Run: `node src/cue.test.mjs`  
Expected: PASS with no output

### Task 3: Wire deck transport buttons and cue UI state

**Files:**
- Modify: `src/App.tsx`
- Modify: `docs/superpowers/plans/2026-05-01-cue-prototype.md`

- [ ] **Step 1: Add per-deck cue state**

Store independent deck state for:

- `cuePoint`
- `isCueSet`
- `isSetMode`

- [ ] **Step 2: Connect the red button to deck-local set mode**

Pressing the red button should toggle only that deck's set-ready state.

- [ ] **Step 3: Connect the `Cue` button to assignment or recall**

- If set mode is armed, write the current deck time into `cuePoint` and exit set mode
- If set mode is not armed and a cue exists, seek to that point and pause
- If no cue exists, do nothing

- [ ] **Step 4: Add visible per-deck UI state**

- the red button should show armed set mode
- the `Cue` button should show whether a cue has been stored

### Task 4: Verify behavior and avoid regressions

**Files:**
- Test: `src/cue.test.mjs`
- Test: `src/sync.test.mjs`
- Test: `src/levelControl.test.mjs`
- Test: `src/eq.test.mjs`
- Test: `src/knob.test.mjs`

- [ ] **Step 1: Run verification**

Run: `npm run lint && node src/cue.test.mjs && node src/sync.test.mjs && node src/levelControl.test.mjs && node src/eq.test.mjs && node src/knob.test.mjs`

Expected: lint passes and all focused test files pass

- [ ] **Step 2: Manually verify in browser**

On `http://localhost:3000/`:

- arm `Set` on deck A and store a cue with `Cue`
- confirm deck B remains unchanged
- press `Cue` again on deck A and confirm it jumps back and pauses
- confirm armed-state and cue-set indicators are visible
