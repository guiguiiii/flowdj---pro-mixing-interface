import test from 'node:test';
import assert from 'node:assert/strict';

import { getDeckMixGains } from './mixer.js';

test('getDeckMixGains gives deck A full gain on far left', () => {
  const gains = getDeckMixGains({ crossfader: 0, levelA: 100, levelB: 100 });

  assert.equal(gains.deckA, 1);
  assert.equal(gains.deckB, 0);
});

test('getDeckMixGains gives deck B full gain on far right', () => {
  const gains = getDeckMixGains({ crossfader: 100, levelA: 100, levelB: 100 });

  assert.equal(gains.deckA, 0);
  assert.equal(gains.deckB, 1);
});

test('getDeckMixGains blends both decks in the center with deck level scaling', () => {
  const gains = getDeckMixGains({ crossfader: 50, levelA: 80, levelB: 25 });

  assert.equal(gains.deckA, 0.566);
  assert.equal(gains.deckB, 0.177);
});
