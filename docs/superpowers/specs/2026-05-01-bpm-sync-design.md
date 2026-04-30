# BPM Sync Button Design

## Summary

Add deterministic BPM sync behavior to the existing `Sync` buttons in the mixer UI, with a long-press shortcut to restore a deck to its original BPM.

- Short-pressing the left deck `Sync` button makes deck A match deck B's current effective BPM.
- Short-pressing the right deck `Sync` button makes deck B match deck A's current effective BPM.
- Long-pressing a deck's `Sync` button restores that deck to its original BPM by resetting its playback rate to `1`.
- Sync updates both audible playback speed and the BPM number shown in the UI.

## Current Behavior

The existing sync implementation only works when the opposite deck is currently playing. It uses the opposite deck as the source BPM and adjusts the target deck playback rate, but it exits early if the source deck is not marked as playing.

## Desired Behavior

### Source And Target Rules

- Short-press left `Sync`:
  - Source: deck B
  - Target: deck A
- Short-press right `Sync`:
  - Source: deck A
  - Target: deck B

The short-press source deck is always the opposite deck. Sync does not depend on which deck is currently playing.

### Press Interaction Rules

- Short press means the pointer or touch is released before `500ms`.
- Long press means the pointer or touch remains active for at least `500ms`.
- Long press acts on the pressed deck itself, not the opposite deck.
- A long press should not also trigger the short-press sync action on release.

### BPM Definition

"Effective BPM" means the BPM after applying the deck's current playback rate.

- Effective BPM A = `trackA.bpm * playbackRateA`
- Effective BPM B = `trackB.bpm * playbackRateB`

### Short-Press Sync Mechanism

Sync does not mutate the original track library BPM metadata.

Instead, it computes a new playback rate for the target deck:

`target playback rate = source effective BPM / target track base BPM`

This keeps the feature small, reversible, and aligned with the existing UI, where the displayed BPM already reflects playback rate changes.

If the decks already have the same effective BPM, short-pressing `Sync` again keeps them aligned and does not restore the previous rate.

### Long-Press Restore Mechanism

Long-pressing `Sync` restores the pressed deck to its original BPM by setting that deck's playback rate back to `1`.

- Long-press left `Sync`: set deck A playback rate to `1`
- Long-press right `Sync`: set deck B playback rate to `1`

This restore action is local to the pressed deck and does not modify the opposite deck.

## Guard Rails

Sync does nothing when any of the following is true:

- The source deck has no loaded track.
- The target deck has no loaded track.
- The source effective BPM is not a finite positive number.
- The target track base BPM is not a finite positive number.

Long press restore does nothing when the pressed deck has no loaded track.

## UI Expectations

- The existing `Sync` buttons remain in place.
- No new controls or indicators are added in this change.
- After short-pressing `Sync`, the target deck BPM display updates immediately because it is derived from the updated playback rate.
- After long-pressing `Sync`, the pressed deck BPM display returns immediately to its original track BPM.

## Implementation Notes

- Update sync calculation logic so it no longer requires `sourceIsPlaying`.
- Add press-duration handling for the two existing `Sync` buttons in `src/App.tsx`.
- Keep long-press state local to the button interaction rather than adding persistent sync state.
- Cover the behavior with focused tests for:
  - left sync uses right effective BPM
  - right sync uses left effective BPM
  - long press restores deck A playback rate to `1`
  - long press restores deck B playback rate to `1`
  - sync returns no change for invalid BPM inputs

## Out Of Scope

- Beat-grid phase alignment
- Automatic key sync
- Persistent BPM rewriting in library data
- A "master deck" concept
