# Remote Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a computer headphone monitor that can switch between Deck A and Deck B from the iPad FlowDJ UI.

**Architecture:** Add a shared monitor protocol, a Vite dev-server WebSocket plugin, an iPad-side monitor client, and a `/monitor` React view. The monitor page mirrors the selected deck by loading the same track URL and applying play, pause, seek, rate, load, and periodic sync messages.

**Tech Stack:** React 19, Vite, Web Audio/HTML audio elements, native WebSocket, Node `ws` through Vite's bundled dependency.

---

### Task 1: Monitor Protocol

**Files:**
- Create: `src/remoteMonitor.js`
- Test: `src/remoteMonitor.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeckLoadMessage,
  createDeckPlaybackMessage,
  createMonitorSelectMessage,
  createMonitorSyncMessage,
  isMonitorDeck,
  shouldApplyMonitorMessage,
} from './remoteMonitor.js';

test('validates monitor deck ids', () => {
  assert.equal(isMonitorDeck('A'), true);
  assert.equal(isMonitorDeck('B'), true);
  assert.equal(isMonitorDeck('C'), false);
});

test('creates monitor select messages for A and B', () => {
  assert.deepEqual(createMonitorSelectMessage('B'), {
    type: 'monitor-select',
    deck: 'B',
  });
});

test('creates deck load messages with track metadata', () => {
  assert.deepEqual(createDeckLoadMessage({
    deck: 'A',
    track: { id: 'track-1', title: 'Intro', artist: 'FlowDJ', src: '/audio/intro.mp3' },
    currentTime: 12.25,
    playbackRate: 1.1,
    isPlaying: true,
  }), {
    type: 'deck-load',
    deck: 'A',
    track: { id: 'track-1', title: 'Intro', artist: 'FlowDJ', src: '/audio/intro.mp3' },
    currentTime: 12.25,
    playbackRate: 1.1,
    isPlaying: true,
  });
});

test('creates playback and sync messages with normalized values', () => {
  assert.deepEqual(createDeckPlaybackMessage({ deck: 'B', action: 'seek', currentTime: 42.5 }), {
    type: 'deck-seek',
    deck: 'B',
    currentTime: 42.5,
  });
  assert.deepEqual(createMonitorSyncMessage({
    selectedDeck: 'A',
    deck: 'A',
    track: { id: 'track-2', title: 'Next', artist: '', src: '/audio/next.mp3' },
    currentTime: 5,
    playbackRate: 0.95,
    isPlaying: false,
  }), {
    type: 'deck-sync',
    selectedDeck: 'A',
    deck: 'A',
    track: { id: 'track-2', title: 'Next', artist: '', src: '/audio/next.mp3' },
    currentTime: 5,
    playbackRate: 0.95,
    isPlaying: false,
  });
});

test('applies only selected deck messages to monitor playback', () => {
  assert.equal(shouldApplyMonitorMessage({ selectedDeck: 'A', message: { type: 'deck-play', deck: 'A' } }), true);
  assert.equal(shouldApplyMonitorMessage({ selectedDeck: 'A', message: { type: 'deck-play', deck: 'B' } }), false);
  assert.equal(shouldApplyMonitorMessage({ selectedDeck: null, message: { type: 'deck-play', deck: 'A' } }), false);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test src/remoteMonitor.test.mjs`

Expected: FAIL because `src/remoteMonitor.js` does not exist.

- [ ] **Step 3: Implement the protocol**

Create `src/remoteMonitor.js` with exported helpers for deck validation, track serialization, monitor select, deck load, play, pause, seek, rate, and sync messages.

- [ ] **Step 4: Run protocol tests**

Run: `node --test src/remoteMonitor.test.mjs`

Expected: PASS.

### Task 2: Vite Monitor WebSocket Server

**Files:**
- Create: `src/monitorServer.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Add a Vite plugin**

Create a Vite plugin that attaches a WebSocket server to `/flowdj-monitor`, relays messages from controller clients to monitor clients, and sends connection counts.

- [ ] **Step 2: Register the plugin**

Modify `vite.config.ts` to include the monitor plugin after React/Tailwind plugins.

- [ ] **Step 3: Verify TypeScript**

Run: `npm run lint`

Expected: PASS.

### Task 3: Main App Monitor Client and A/B Controls

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add monitor state and WebSocket client**

Add selected monitor deck, connection status, and a send helper. Connect to `/flowdj-monitor?role=controller`.

- [ ] **Step 2: Add Cue A / Cue B UI controls**

Add compact controls near the crossfader footer so the iPad can switch the remote monitor between A and B.

- [ ] **Step 3: Send deck messages**

Send load, select, play, pause, seek, rate, and sync messages for the selected monitor deck. Call the send helper from playback, cue recall, hot cue, waveform/jog seek, tempo, and track selection paths.

- [ ] **Step 4: Verify TypeScript**

Run: `npm run lint`

Expected: PASS.

### Task 4: Computer Monitor Page

**Files:**
- Create: `src/MonitorApp.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add route switch**

Render `MonitorApp` when `window.location.pathname === '/monitor'`; otherwise render the main app.

- [ ] **Step 2: Implement monitor playback view**

Connect to `/flowdj-monitor?role=monitor`, unlock audio with a user gesture, load selected tracks, and apply selected deck messages only.

- [ ] **Step 3: Verify TypeScript**

Run: `npm run lint`

Expected: PASS.

### Task 5: End-to-End Verification

**Files:**
- No required source changes unless verification reveals defects.

- [ ] **Step 1: Run automated checks**

Run: `node --test src/remoteMonitor.test.mjs && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 2: Start server**

Run: `npm run dev`

Expected: server prints a local and network URL.

- [ ] **Step 3: Manual browser check**

Open `http://localhost:3000` and `http://localhost:3000/monitor`. Confirm the app renders and the monitor page shows connection/unlock state.

