# Waveform Scrub Design

## Summary

Add first-pass draggable waveform seeking for both waveform surfaces in each deck:

- the top track-info horizontal waveform becomes a direct seek bar
- the center vertical playback waveform becomes a relative scrub surface driven by vertical drag distance

The two waveform types intentionally use different interaction models because they serve different DJ tasks.

## Current Behavior

- The top horizontal waveform beside each track's artwork is visual only.
- The center vertical waveform columns are visual only.
- Track playback progress already exists through each deck's `currentTime`, `duration`, and computed `progress`.
- The waveform rendering is already deck-local and recalculates from playback progress, but no pointer-driven seeking behavior exists.

## Desired Behavior

### Horizontal Track-Info Waveform

Each deck's top horizontal waveform should behave like a conventional seek bar:

- pressing or dragging on the waveform seeks directly to the corresponding point in the track
- horizontal pointer position maps to the full track progress from `0` to `duration`
- dragging left seeks earlier
- dragging right seeks later
- the playback line updates immediately while dragging

This waveform uses absolute positioning, not relative movement.

### Vertical Center Waveform

Each center vertical waveform should behave like a DJ-style scrub surface:

- pressing on the waveform does not jump to a fixed absolute percentage
- dragging upward moves playback later in the track
- dragging downward moves playback earlier in the track
- the amount of playback change is based on relative drag distance
- the waveform itself appears to scroll up or down as playback position changes

This waveform uses relative displacement, not tap-to-position.

## Deck Independence

- Deck A waveform dragging must affect only deck A audio time
- Deck B waveform dragging must affect only deck B audio time
- Dragging one deck must not change the other deck

## Playback Rules

- Dragging should update the deck's playback position immediately
- If a deck was already playing, it should continue playing after the seek
- If a deck was paused, it should remain paused after the seek
- Dragging should not automatically toggle play or pause

## Mapping Rules

### Horizontal Waveform Mapping

- pointer X position maps linearly to normalized track progress
- values clamp between the start and end of the track
- dragging beyond the waveform bounds clamps to `0` or `duration`

### Vertical Waveform Mapping

- pointer Y movement maps to a time delta rather than an absolute position
- dragging upward produces a positive time delta
- dragging downward produces a negative time delta
- the delta should feel controllable rather than overly sensitive
- resulting playback time clamps between `0` and `duration`

The first version only needs one reasonable scrub sensitivity shared by both decks.

## UI Expectations

- Keep the existing waveform visuals and layout
- Do not add extra buttons for this change
- It should be obvious through interaction that the top waveform is draggable
- It should be obvious through interaction that the center waveform can be scrubbed vertically
- Existing playback progress indicators should continue updating from the deck's current time

## Guard Rails

- Dragging must do nothing when the deck has no valid duration
- Dragging must not crash while waveform analysis is still loading
- Dragging must not desynchronize the visible progress from the actual `audio.currentTime`
- Track changes should continue to reset and rebind waveform seeking to the new deck media
- Pointer release or cancellation must stop active dragging cleanly

## Implementation Notes

- Prefer extracting drag-to-time mapping into a small helper module so the math can be tested outside React
- Reuse existing per-deck audio refs and current-time state as the single source of truth
- Add deck-local pointer state only where needed for drag tracking
- Cover the behavior with focused tests for:
  - horizontal pointer position to progress mapping
  - vertical drag delta to time delta mapping
  - clamping at track start and end
  - deck-local independence of the interaction helpers

## Out Of Scope

- Inertial scrolling
- Waveform zoom
- Beat snapping
- Scratch audio simulation
- Cue preview during drag
- Separate sensitivities per deck
