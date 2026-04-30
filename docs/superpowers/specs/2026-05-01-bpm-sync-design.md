# BPM Sync Button Design

## Summary

Add deterministic BPM sync behavior to the existing `Sync` buttons in the mixer UI.

- Pressing the left deck `Sync` button makes deck A match deck B's current effective BPM.
- Pressing the right deck `Sync` button makes deck B match deck A's current effective BPM.
- Sync updates both audible playback speed and the BPM number shown in the UI.

## Current Behavior

The existing sync implementation only works when the opposite deck is currently playing. It uses the opposite deck as the source BPM and adjusts the target deck playback rate, but it exits early if the source deck is not marked as playing.

## Desired Behavior

### Source And Target Rules

- Left `Sync`:
  - Source: deck B
  - Target: deck A
- Right `Sync`:
  - Source: deck A
  - Target: deck B

The source deck is always the opposite deck. Sync does not depend on which deck is currently playing.

### BPM Definition

"Effective BPM" means the BPM after applying the deck's current playback rate.

- Effective BPM A = `trackA.bpm * playbackRateA`
- Effective BPM B = `trackB.bpm * playbackRateB`

### Sync Mechanism

Sync does not mutate the original track library BPM metadata.

Instead, it computes a new playback rate for the target deck:

`target playback rate = source effective BPM / target track base BPM`

This keeps the feature small, reversible, and aligned with the existing UI, where the displayed BPM already reflects playback rate changes.

## Guard Rails

Sync does nothing when any of the following is true:

- The source deck has no loaded track.
- The target deck has no loaded track.
- The source effective BPM is not a finite positive number.
- The target track base BPM is not a finite positive number.

## UI Expectations

- The existing `Sync` buttons remain in place.
- No new controls or indicators are added in this change.
- After pressing `Sync`, the target deck BPM display updates immediately because it is derived from the updated playback rate.

## Implementation Notes

- Update sync calculation logic so it no longer requires `sourceIsPlaying`.
- Keep the existing "target deck" API shape if it still fits the component.
- Cover the behavior with focused tests for:
  - left sync uses right effective BPM
  - right sync uses left effective BPM
  - sync returns no change for invalid BPM inputs

## Out Of Scope

- Beat-grid phase alignment
- Automatic key sync
- Persistent BPM rewriting in library data
- A "master deck" concept
