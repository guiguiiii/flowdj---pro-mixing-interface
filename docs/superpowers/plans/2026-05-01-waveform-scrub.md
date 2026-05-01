# Waveform Scrub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each deck's top horizontal waveform support direct seek and each center vertical waveform support relative vertical scrubbing.

**Architecture:** Add a small pure helper module for waveform drag math, then wire deck-local pointer handlers in `src/App.tsx` so the two waveform surfaces can update deck playback time through the existing audio refs and current-time state.

**Tech Stack:** React 19, TypeScript/JS modules, Vite, HTMLAudioElement, node `assert`

---

### Task 1: Add failing tests for waveform drag math

**Files:**
- Create: `src/waveformScrub.js`
- Create: `src/waveformScrub.test.mjs`
- Test: `src/waveformScrub.test.mjs`

- [ ] **Step 1: Write the failing test**

Cover the minimum rules outside React:

- horizontal pointer X maps to absolute progress within track bounds
- horizontal mapping clamps when dragged outside the surface
- vertical drag delta maps to a relative playback delta
- upward drag moves later in the track
- downward drag moves earlier in the track
- resulting scrubbed time clamps at the track start and end

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/waveformScrub.test.mjs`  
Expected: FAIL because `src/waveformScrub.js` does not exist yet

### Task 2: Implement waveform scrub helpers

**Files:**
- Create: `src/waveformScrub.js`
- Test: `src/waveformScrub.test.mjs`

- [ ] **Step 1: Add minimal pure helper implementation**

Add helpers for:

- clamping waveform progress
- mapping horizontal pointer position to a seek time
- mapping vertical drag distance to a relative seek time

- [ ] **Step 2: Run test to verify it passes**

Run: `node src/waveformScrub.test.mjs`  
Expected: PASS with no output

### Task 3: Wire the horizontal waveform seek behavior

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add deck-local refs and handlers for the top waveform**

Store enough pointer and layout state to translate drag position into an absolute track time.

- [ ] **Step 2: Update the top waveform component to accept pointer handlers**

- pressing or dragging should update that deck's `audio.currentTime`
- deck A and deck B should remain independent

### Task 4: Wire the vertical waveform scrub behavior

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add deck-local handlers for the center waveform**

Track initial pointer Y and initial playback time per deck.

- [ ] **Step 2: Update the vertical waveform component to accept pointer handlers**

- upward drag should move later in the track
- downward drag should move earlier in the track
- the same scrub sensitivity should be used for both decks

### Task 5: Verify behavior and avoid regressions

**Files:**
- Test: `src/waveformScrub.test.mjs`
- Test: `src/cue.test.mjs`
- Test: `src/sync.test.mjs`
- Test: `src/levelControl.test.mjs`
- Test: `src/eq.test.mjs`
- Test: `src/knob.test.mjs`

- [ ] **Step 1: Run verification**

Run: `npm run lint && node src/waveformScrub.test.mjs && node src/cue.test.mjs && node src/sync.test.mjs && node src/levelControl.test.mjs && node src/eq.test.mjs && node src/knob.test.mjs`

Expected: lint passes and all focused test files pass

- [ ] **Step 2: Manually verify in browser**

On `http://localhost:3000/`:

- drag deck A's top waveform and confirm it seeks directly
- drag deck B's top waveform and confirm deck A stays unchanged
- drag deck A's center waveform upward and confirm playback moves later
- drag deck A's center waveform downward and confirm playback moves earlier
- confirm playback state does not auto-toggle while scrubbing
