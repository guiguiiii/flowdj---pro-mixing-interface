# Level Target Volume Design

## Summary

Make each side panel's `Level` slider control different volume groups depending on the selected target button.

- Default mode controls that deck's track volume.
- `Cue` mode controls that deck's shared hot cue volume.
- `Pad` mode controls that deck's shared sample and pad FX volume.

## Current Behavior

The UI already has:

- per-deck `Level` sliders
- per-deck target toggles for `Cue` and `Pad`
- stored values for `level`, `cueLevel`, `padsLevel`
- stored target state for `master`, `cues`, `pads`

Right now the default track level is connected to deck audio gain, but the cue and pad level targets are only stateful UI and do not yet drive real audio group volume behavior.

## Desired Behavior

### Target Mapping

For each deck independently:

- No target selected:
  - `Level` controls the deck track volume
- `Cue` selected:
  - `Level` controls the shared volume for all hot cues on that deck
- `Pad` selected:
  - `Level` controls the shared volume for all samples and pad FX on that deck

### Toggle Rules

- Pressing `Cue` selects cue-volume mode for that deck.
- Pressing `Pad` selects pad-volume mode for that deck.
- Pressing the already-selected target button again returns that deck to default track-volume mode.
- `Cue` and `Pad` are mutually exclusive on the same deck.
- Deck A and deck B targets operate independently.

### Scope Rules

`Cue` mode is not limited to the currently selected hot cue pad. It applies to all hot cues on that deck.

`Pad` mode is not limited to the currently visible pad page. It applies to:

- all sample pads on that deck
- all pad FX pads on that deck

## Audio Model

Each deck should expose three logical volume groups:

- `track`
- `cues`
- `pads`

The UI slider should write into exactly one of those groups based on the active target mode.

For this change, the implementation should connect the volume-routing logic end to end, even if some triggered sounds are still represented by UI state instead of fully separate audio sources.

## UI Expectations

- Keep the current `Cue` and `Pad` buttons and current slider layout.
- Keep the current stored values per group so switching modes restores the previous slider position for that group.
- The visible `Level` slider position should always reflect the currently selected target group's stored value.
- No new UI controls are added in this change.

## Guard Rails

- Changing deck A's target or level must not affect deck B.
- Returning to default mode must restore the deck track-level slider position previously set for `master`.
- `Cue` and `Pad` levels must persist while switching between targets.
- If a cue, sample, or pad FX source is not currently active, its group volume value should still be stored for later use.

## Implementation Notes

- Reuse the existing `level`, `cueLevel`, `padsLevel`, `levelTarget`, and `getLevelControl(...)` structure already present in `src/App.tsx`.
- Extend audio/mixing helpers only where needed to make the three group volumes meaningful.
- Prefer a small helper or model for per-deck group-volume resolution rather than scattering target checks throughout the component.
- Cover the behavior with focused tests for:
  - target toggle switching
  - slider value switching by target
  - default track volume isolation by deck
  - cue and pad volume persistence across mode changes

## Out Of Scope

- Separate per-pad individual volume controls
- Separate sample volume and pad FX volume controls
- New visual indicators beyond the existing active button styling
- Redesigning the side panel layout
