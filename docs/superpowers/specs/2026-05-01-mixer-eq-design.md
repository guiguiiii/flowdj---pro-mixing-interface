# Mixer EQ Design

## Summary

Make each deck's `Hi`, `Mid`, and `Low` mixer knobs control the playing track's high, mid, and low frequency bands through a real Web Audio equalizer chain.

## Current Behavior

- Each deck already stores `mixerA` and `mixerB` state with `hi`, `mid`, and `low` values.
- The knobs update UI state only.
- Track audio is still played directly through hidden `<audio>` elements with volume and playback rate applied on the media element.
- No Web Audio EQ or filter chain is connected yet.

## Desired Behavior

### EQ Model

Each deck gets an independent three-band DJ-style EQ:

- `Low` controls the low-frequency band
- `Mid` controls the mid-frequency band
- `Hi` controls the high-frequency band

Deck A and deck B must be fully independent.

### Neutral Position

- Knob value `50` is neutral
- Neutral means `0 dB` gain on that band

### Knob Direction

- Values above `50` boost the band
- Values below `50` attenuate the band

This should feel like a DJ three-band EQ rather than a binary cut-only control.

## Audio Architecture

Each deck should route track audio through a Web Audio graph instead of relying only on direct `<audio>.volume`.

Recommended per-deck chain:

`HTMLAudioElement -> MediaElementSource -> low EQ -> mid EQ -> high EQ -> output gain -> destination`

Where:

- `low EQ` is a low-shelf filter
- `mid EQ` is a peaking filter
- `high EQ` is a high-shelf filter
- `output gain` remains the place where track-level volume and crossfader gain are applied

## Mapping Rules

The knob range should map smoothly to filter gain values.

For this change:

- `0` to `100` knob values map around neutral `50`
- the same mapping logic should be used for both decks
- the mapping should be extracted into a helper so it can be tested without React

## UI Expectations

- Keep the current `Hi`, `Mid`, and `Low` knobs and layout
- No new controls are added
- Knob movement should update the audio effect in real time while the track is playing
- Existing playback rate, sync, and level controls must continue to work

## Guard Rails

- Deck A EQ changes must not affect deck B
- Neutral `50` must leave the sound unchanged
- EQ should continue to work after changing tracks on a deck
- Repeated re-renders must not recreate broken audio graphs or duplicate media connections
- If Web Audio setup is unavailable, playback should fail gracefully instead of crashing the app

## Implementation Notes

- Add a small helper module for EQ value mapping and any per-deck graph setup that can be isolated cleanly
- Reuse the existing hidden `<audio>` elements as the media source
- Keep deck volume and crossfader gain downstream from EQ so all controls compose correctly
- Cover the behavior with focused tests for:
  - neutral value maps to `0 dB`
  - values below neutral attenuate
  - values above neutral boost
  - mapping is symmetric and bounded enough for stable UI behavior

## Out Of Scope

- Additional FX routing
- Cue-specific EQ
- Separate EQ for samples, pad FX, or hot cues
- Visual spectrum analyzers
