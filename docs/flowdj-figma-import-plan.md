# FlowDJ Figma Import Plan

This file prepares a low-call-count `use_figma` import flow for rebuilding the local FlowDJ interface in Figma once MCP quota is available again.

## Goal

Rebuild the local app UI into the Figma file:

- File: `https://www.figma.com/design/Siclvi2kOYSE37w6kFg5oC/App2`
- Target page: `FlowDJ Import`

## Low-call strategy

Use as few Figma MCP calls as possible:

1. `use_figma` call: create or reuse the `FlowDJ Import` page and generate the whole editable screen in one script.
2. Optional `get_screenshot` call: visually verify the result.
3. Optional `use_figma` fix-up call: only if something obvious needs adjustment.

That means the likely real import path is:

- Best case: `1` write call + `1` screenshot call
- Safe case: `1` write call + `1` screenshot call + `1` targeted fix call

## Why this is the lowest practical count

- The file is currently almost empty, so we do not need extra discovery calls.
- Existing linked design systems are generic and not a close fit for this DJ console UI.
- The fastest recoverable path is to draw a fully editable native Figma screen with frames, rectangles, ellipses, lines, and text.
- This avoids burning calls searching/importing unrelated library components.

## Screen structure to generate

The import script creates one main frame named `FlowDJ Interface` at `1440 x 900` with these sections:

- Header bar
  - Left deck artwork and track info
  - Center record/settings controls
  - Right deck artwork and track info
- Middle workspace
  - Left mode panel with three knobs
  - Left circular BPM/time deck display
  - Center vertical waveform and VU block
  - Right circular BPM/time deck display
  - Right mode panel with three knobs
- Bottom workspace
  - Left pitch/sync strip
  - Left hot cue pad block
  - Right hot cue pad block
  - Right pitch/sync strip
- Footer
  - Transport buttons
  - Crossfader rail and handle

## Source assumptions captured from code

These values are already baked into the prepared script:

- Base background: `#333333`
- Panel grey: `#ADADAD`
- Deck surface grey: `#D0D0D0`
- Deck A accent: `#FF9457`
- Deck B accent: `#2E8DFF`
- Status red: `#FF3B30`
- Track A
  - Title: `One Love`
  - Artist: `David Guetta`
  - Key: `4A`
  - Time display: `-01:48`
- Track B
  - Title: `Teenage Dream`
  - Artist: `Katy Perry`
  - Key: `5B`
  - Time display: `-03:20`

## Execution instructions

When quota is back, use this exact order:

1. Call `use_figma` with the script in [flowdj-figma-import.use_figma.js](./flowdj-figma-import.use_figma.js)
2. If successful, call `get_screenshot` on the returned `rootId`
3. Only if needed, run one small repair script instead of re-importing

## Notes

- The script removes a prior top-level node named `FlowDJ Interface` on the `FlowDJ Import` page before rebuilding. That keeps retries clean without touching anything else.
- The output is intentionally built from editable native shapes rather than flattened image content.
- Fonts are chosen defensively. The script tries `Chiron GoRound TC` and `JetBrains Mono`, then falls back to `Inter` if needed.
