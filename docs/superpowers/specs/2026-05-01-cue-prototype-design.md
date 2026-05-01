# Cue Prototype Design

## Summary

Add a first-pass per-deck `Cue` workflow that supports:

- one stored `cuePoint` per deck
- a two-step `Set -> Cue` flow for writing that `cuePoint`
- a direct `Cue` recall action that seeks back and pauses
- visible UI state showing both cue readiness and set-mode readiness

This version is intentionally limited to a single standard cue point per deck. It does not introduce hot cues, loops, sync coupling, or advanced DJ behaviors.

## Current Behavior

- Each deck already has transport controls including a red circular button and a `Cue` button.
- Track playback time already exists through deck-local audio state and hidden `<audio>` elements.
- There is no stored per-deck cue point yet.
- The red button does not yet act as a generic `Set` entrance.
- The `Cue` button does not yet implement DJ-style cue recall behavior.

## Desired Behavior

### Per-Deck Cue State

Each deck should independently store:

- `cuePoint`
- `isCueSet`
- `isSetMode`

Deck A and deck B must remain fully separate.

### Set Flow

The red circular button next to each deck's transport controls becomes that deck's generic `Set` entrance.

For this first version:

- pressing the red `Set` button does not immediately write a cue point
- it puts only that deck into `Set Cue` ready mode
- while in ready mode, pressing that same deck's `Cue` button stores the current playback time as `cuePoint`
- after storing the cue point, the deck exits ready mode

This keeps the interaction expandable for future `Hot Cue` assignment while already supporting standard cue setting now.

### Cue Recall Flow

Outside of ready mode:

- pressing `Cue` on a deck with a saved `cuePoint` seeks that deck back to its `cuePoint`
- the deck pauses after the seek

If the deck does not yet have a cue point:

- pressing `Cue` does nothing

### Independence Rules

- Deck A `Set` mode must not affect Deck B
- Deck A cue assignment must not affect Deck B
- Deck A cue recall must not affect Deck B
- Each deck may have its own cue point and ready state at the same time

## UI Expectations

The UI should make two states legible per deck:

- cue point has been set
- set mode is currently armed for cue assignment

For this change:

- keep the existing red button and `Cue` button layout
- the red button should visually indicate when set mode is armed
- the `Cue` button should visually indicate when a cue point exists
- if both states are true, the UI may show both at once

## Interaction Rules

- Pressing `Set` toggles that deck's ready mode on and off
- Pressing `Cue` while ready mode is on writes the cue point instead of recalling it
- Pressing `Cue` while ready mode is off recalls the cue point and pauses
- Writing a cue point replaces any previously stored cue point for that deck
- Setting a cue while paused is allowed and should use the deck's current time
- Setting a cue while playing is allowed and should use the current playback position at the moment of the press

## Future Compatibility

The red button should be treated as a generic `Set` entry point, not a cue-specific button.

This change should leave room for a later pattern such as:

- `Set` then `Cue` to assign the standard cue point
- `Set` then `Hot Cue 1` to assign hot cue 1
- `Set` then `Hot Cue 2` to assign hot cue 2

The first version does not need a generalized routing system yet, but the state naming and button semantics should avoid boxing the red button into a permanent `Set Cue only` meaning.

## Guard Rails

- Cue recall must pause the deck after seeking
- Cue recall must not resume playback automatically
- A deck without a cue point must not throw errors when `Cue` is pressed
- Entering set mode must not change playback by itself
- Exiting set mode without storing must leave the existing cue point unchanged
- Loading or operating one deck must not clear the other deck's cue state

## Implementation Notes

- Prefer a small helper module for cue state transitions so the interaction can be tested outside React
- Reuse existing per-deck audio refs and current-time state for assignment and recall
- Keep the first version focused on transport behavior and button state only
- Cover the behavior with focused tests for:
  - toggling set mode
  - assigning a cue point through `Set -> Cue`
  - recalling a cue point outside set mode
  - replacing a previously stored cue point
  - deck independence

## Out Of Scope

- Hot Cue pads
- Loop in and loop out
- Cue-hold preview behavior
- Sync-aware cue logic
- Persistent storage across page reloads
