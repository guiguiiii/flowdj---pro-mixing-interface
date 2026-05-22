# Remote A/B Monitor Design

## Goal

FlowDJ should let an iPad keep playing the performance output through its normal audio route, such as a Bluetooth speaker, while a computer with wired headphones acts as a remote cue monitor. The monitor must be switchable between Deck A and Deck B from the iPad interface.

## Scope

The first version supports one active monitor target at a time:

- Cue A sends Deck A state to the computer monitor.
- Cue B sends Deck B state to the computer monitor.
- Switching A/B immediately changes what the computer headphones follow.
- The computer monitor is a playback outlet only; all DJ controls remain on the iPad.

This version does not mix A and B together in the monitor, does not stream raw iPad system audio, and does not solve Bluetooth speaker latency.

## Recommended Approach

Use a local monitor page that mirrors the selected deck instead of raw audio streaming from the iPad.

The iPad app publishes monitor commands over a local WebSocket channel:

- selected monitor deck
- track id and source URL
- play or pause
- current playback time
- playback rate
- cue recall and hot cue jumps
- periodic sync ticks

The computer opens a `/monitor` page from the same dev/server host. That page owns its own audio element and plays the selected deck's track through the computer headphone output. Because the computer plays the same track locally, this avoids fragile browser-to-browser audio streaming on iPad Safari.

## User Flow

1. Start FlowDJ server on the computer.
2. Open the main FlowDJ app on the iPad.
3. Open the monitor page on the computer and plug wired headphones into the computer.
4. On the iPad, tap Cue A or Cue B.
5. The monitor page follows the selected deck.
6. Hot cues, cue recall, waveform seek, jog seek, play/pause, and tempo changes on the selected deck are mirrored to the computer monitor.

## Components

### Monitor Protocol

A small shared module defines the monitor message types and helpers. It keeps message shape testable outside React.

Important message types:

- `monitor-select`
- `deck-load`
- `deck-play`
- `deck-pause`
- `deck-seek`
- `deck-rate`
- `deck-sync`

### Monitor Server

The local server serves the React app and hosts a WebSocket endpoint. It broadcasts iPad monitor messages to connected monitor clients.

### iPad Main App

The main app adds Cue A and Cue B monitor controls. It sends monitor messages whenever the selected deck changes state, and it sends enough deck state after switching A/B for the monitor page to catch up immediately.

### Computer Monitor Page

The monitor page connects to the WebSocket endpoint, shows the current monitor target, and plays the selected deck through an audio element. It remains visually simple and optimized for confidence: connected state, selected deck, track title, playback state, and time.

## Data Flow

```text
iPad FlowDJ UI
  -> monitor protocol messages
  -> local WebSocket server
  -> computer /monitor page
  -> computer audio element
  -> wired headphones
```

The main performance output remains handled by the iPad browser and iPad audio route.

## Error Handling

- If the monitor server is unavailable, the iPad shows a disconnected monitor state but DJ playback still works.
- If the computer monitor page has not been unlocked by a user gesture, it asks for one click/tap before playback.
- If the selected track URL is not available to the computer, the monitor page shows a load error.
- If the WebSocket reconnects, the iPad sends the current selected deck state again on the next sync tick or deck action.

## Testing

Automated tests cover:

- monitor message creation and validation
- selected deck switching
- sync state for A and B
- playback rate and seek messages

Manual verification covers:

- computer monitor follows Deck A
- computer monitor follows Deck B
- switching A/B changes the headphone monitor
- hot cue and cue recall jumps are mirrored
- main iPad output remains independent

