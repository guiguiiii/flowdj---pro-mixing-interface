import assert from 'node:assert/strict';

import { getDeckOrbitDot } from './deckDisplay.js';

const topDot = getDeckOrbitDot({ radius: 48.5, angleInDegrees: 0 });

assert.equal(topDot.x, 50, '0 degrees should keep the orbit dot centered horizontally');
assert.equal(topDot.y, 1.5, '0 degrees should place the orbit dot on the top edge of the outer ring');

const rightDot = getDeckOrbitDot({ radius: 48.5, angleInDegrees: 90 });

assert.equal(rightDot.x, 98.5, '90 degrees should place the orbit dot on the right edge of the outer ring');
assert.equal(rightDot.y, 50, '90 degrees should keep the orbit dot centered vertically');

const upperRightDot = getDeckOrbitDot({ radius: 53.5, angleInDegrees: 45 });

assert.equal(upperRightDot.x, 87.8, '45 degrees should place the orbit dot in the upper-right quadrant');
assert.equal(upperRightDot.y, 12.2, '45 degrees should keep the orbit dot on the outer orbit path');
