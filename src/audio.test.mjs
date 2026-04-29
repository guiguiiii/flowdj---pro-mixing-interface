import test from 'node:test';
import assert from 'node:assert/strict';

import { formatClock, formatRemainingTime } from './audio.js';

test('formatClock renders seconds as mm:ss', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(65), '01:05');
  assert.equal(formatClock(3599), '59:59');
});

test('formatRemainingTime subtracts elapsed time and prefixes minus', () => {
  assert.equal(formatRemainingTime(15, 90), '-01:15');
  assert.equal(formatRemainingTime(90, 90), '-00:00');
});

test('formatRemainingTime clamps invalid metadata to zero', () => {
  assert.equal(formatRemainingTime(12, Number.NaN), '-00:00');
});
