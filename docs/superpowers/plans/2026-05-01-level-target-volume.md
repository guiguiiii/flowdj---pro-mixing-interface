# Level Target Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each deck's `Level` slider switch between stored `track`, `cues`, and `pads` volume groups based on the `Cue` and `Pad` target buttons.

**Architecture:** Move the target-selection and group-volume math into a small pure helper module so we can test the rules outside React. Then update `src/App.tsx` to store each deck's three volume groups together, drive the `Level` slider from the active group, and keep deck track audio using only the `track` group.

**Tech Stack:** React 19, TypeScript/JS modules, Vite, node `assert`

---

### Task 1: Add failing tests for target toggling and group volume storage

**Files:**
- Create: `src/levelControl.js`
- Create: `src/levelControl.test.mjs`
- Test: `src/levelControl.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';

import {
  createDeckVolumeGroups,
  getLevelSliderValue,
  setLevelSliderValue,
  toggleLevelTarget,
} from './levelControl.js';

const initial = createDeckVolumeGroups(80);

assert.deepEqual(
  initial,
  { track: 80, cues: 80, pads: 80 },
  'each deck should start with identical stored values for track, cue, and pad groups',
);

assert.equal(
  toggleLevelTarget('master', 'cues'),
  'cues',
  'pressing Cue from default mode should select the cue group',
);

assert.equal(
  toggleLevelTarget('cues', 'cues'),
  'master',
  'pressing the active Cue button again should return to the default track group',
);

assert.equal(
  toggleLevelTarget('cues', 'pads'),
  'pads',
  'Cue and Pad modes should be mutually exclusive',
);

assert.equal(
  getLevelSliderValue({ groups: { track: 62, cues: 31, pads: 14 }, target: 'pads' }),
  14,
  'the level slider should reflect the active target group value',
);

assert.deepEqual(
  setLevelSliderValue({ groups: { track: 62, cues: 31, pads: 14 }, target: 'cues', nextValue: 55 }),
  { track: 62, cues: 55, pads: 14 },
  'moving the level slider should update only the active group value',
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/levelControl.test.mjs`
Expected: FAIL because `src/levelControl.js` does not exist yet

- [ ] **Step 3: Commit**

```bash
git add src/levelControl.test.mjs
git commit -m "test: cover level target volume rules"
```

### Task 2: Implement pure helper functions for level target behavior

**Files:**
- Create: `src/levelControl.js`
- Test: `src/levelControl.test.mjs`

- [ ] **Step 1: Write minimal implementation**

```js
export const createDeckVolumeGroups = (defaultValue = 80) => ({
  track: defaultValue,
  cues: defaultValue,
  pads: defaultValue,
});

export const toggleLevelTarget = (currentTarget, nextTarget) => (
  currentTarget === nextTarget ? 'master' : nextTarget
);

export const getLevelSliderValue = ({ groups, target }) => groups[target === 'master' ? 'track' : target];

export const setLevelSliderValue = ({ groups, target, nextValue }) => ({
  ...groups,
  [target === 'master' ? 'track' : target]: nextValue,
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node src/levelControl.test.mjs`
Expected: PASS with no output

- [ ] **Step 3: Commit**

```bash
git add src/levelControl.js src/levelControl.test.mjs
git commit -m "feat: add level target volume helpers"
```

### Task 3: Wire App level controls to the grouped model

**Files:**
- Modify: `src/App.tsx`
- Test: `src/levelControl.test.mjs`

- [ ] **Step 1: Replace scattered level state with grouped deck volumes**

```ts
const [deckVolumesA, setDeckVolumesA] = useState(() => createDeckVolumeGroups(80));
const [deckVolumesB, setDeckVolumesB] = useState(() => createDeckVolumeGroups(80));

const levelControlA = {
  value: getLevelSliderValue({ groups: deckVolumesA, target: levelTargetA }),
  onChange: (nextValue: number) => {
    setDeckVolumesA((prev) => setLevelSliderValue({ groups: prev, target: levelTargetA, nextValue }));
  },
};

const levelControlB = {
  value: getLevelSliderValue({ groups: deckVolumesB, target: levelTargetB }),
  onChange: (nextValue: number) => {
    setDeckVolumesB((prev) => setLevelSliderValue({ groups: prev, target: levelTargetB, nextValue }));
  },
};
```

- [ ] **Step 2: Use grouped track volume for deck audio and helper-based target toggles**

```ts
const gains = getDeckMixGains({
  crossfader,
  levelA: deckVolumesA.track,
  levelB: deckVolumesB.track,
});

onClick={() => setLevelTargetA((prev) => toggleLevelTarget(prev, 'cues'))}
onClick={() => setLevelTargetA((prev) => toggleLevelTarget(prev, 'pads'))}
onClick={() => setLevelTargetB((prev) => toggleLevelTarget(prev, 'cues'))}
onClick={() => setLevelTargetB((prev) => toggleLevelTarget(prev, 'pads'))}
```

- [ ] **Step 3: Run verification**

Run: `npm run lint && node src/levelControl.test.mjs && node src/sync.test.mjs`
Expected: TypeScript check passes and both test files pass

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/levelControl.js src/levelControl.test.mjs docs/superpowers/plans/2026-05-01-level-target-volume.md
git commit -m "feat: wire level target volume groups"
```
