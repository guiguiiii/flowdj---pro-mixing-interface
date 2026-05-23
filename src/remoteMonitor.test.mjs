import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeckLoadMessage,
  createDeckPlaybackMessage,
  createMonitorClearMessage,
  createMonitorSelectMessage,
  createMonitorSyncMessage,
  getNextMonitorDeckSelection,
  isMonitorDeck,
  shouldApplyMonitorMessage,
} from './remoteMonitor.js';

test('validates monitor deck ids', () => {
  assert.equal(isMonitorDeck('A'), true);
  assert.equal(isMonitorDeck('B'), true);
  assert.equal(isMonitorDeck('C'), false);
  assert.equal(isMonitorDeck(null), false);
});

test('creates monitor select messages for A and B', () => {
  assert.deepEqual(createMonitorSelectMessage('B'), {
    type: 'monitor-select',
    deck: 'B',
  });
});

test('creates monitor clear messages for turning cue monitor off', () => {
  assert.deepEqual(createMonitorClearMessage(), {
    type: 'monitor-clear',
  });
});

test('toggles monitor deck selection off when the active deck is pressed again', () => {
  assert.equal(getNextMonitorDeckSelection(null, 'A'), 'A');
  assert.equal(getNextMonitorDeckSelection('A', 'B'), 'B');
  assert.equal(getNextMonitorDeckSelection('A', 'A'), null);
  assert.equal(getNextMonitorDeckSelection('B', 'B'), null);
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
  assert.deepEqual(createDeckPlaybackMessage({ deck: 'A', action: 'rate', playbackRate: 0.95 }), {
    type: 'deck-rate',
    deck: 'A',
    playbackRate: 0.95,
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
  assert.equal(shouldApplyMonitorMessage({ selectedDeck: 'B', message: { type: 'monitor-select', deck: 'A' } }), true);
  assert.equal(shouldApplyMonitorMessage({ selectedDeck: 'B', message: { type: 'monitor-clear' } }), true);
});
