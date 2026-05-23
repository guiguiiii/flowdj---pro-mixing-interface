import assert from 'node:assert/strict';

import {
  shouldRunActionOnPointerDown,
  shouldSuppressClick,
} from './multiTouchPress.js';

assert.equal(
  shouldRunActionOnPointerDown({ pointerType: 'touch' }),
  true,
  'touch controls should fire on pointerdown so a second finger can press buttons while another finger drags',
);

assert.equal(
  shouldRunActionOnPointerDown({ pointerType: 'pen' }),
  true,
  'pen controls should also fire on pointerdown',
);

assert.equal(
  shouldRunActionOnPointerDown({ pointerType: 'mouse' }),
  false,
  'mouse controls should keep click semantics',
);

assert.equal(
  shouldSuppressClick({ now: 1200, suppressUntil: 1400 }),
  true,
  'the synthetic click after a touch pointerdown should be ignored',
);

assert.equal(
  shouldSuppressClick({ now: 1500, suppressUntil: 1400 }),
  false,
  'later clicks should keep working for mouse and keyboard activation',
);
