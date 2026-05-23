export const MONITOR_DECKS = ['A', 'B'];

export const isMonitorDeck = (deck) => MONITOR_DECKS.includes(deck);

const normalizeSeconds = (value) => (
  Number.isFinite(value) && value > 0 ? Number(value) : 0
);

const normalizePlaybackRate = (value) => (
  Number.isFinite(value) && value > 0 ? Number(value) : 1
);

export const serializeMonitorTrack = (track) => {
  if (!track || !track.src) {
    return null;
  }

  return {
    id: String(track.id ?? ''),
    title: String(track.title ?? 'Untitled'),
    artist: String(track.artist ?? ''),
    src: String(track.src),
  };
};

export const createMonitorSelectMessage = (deck) => {
  if (!isMonitorDeck(deck)) {
    throw new Error('Monitor deck must be A or B');
  }

  return {
    type: 'monitor-select',
    deck,
  };
};

export const createMonitorClearMessage = () => ({
  type: 'monitor-clear',
});

export const getNextMonitorDeckSelection = (currentDeck, requestedDeck) => {
  if (!isMonitorDeck(requestedDeck)) {
    return isMonitorDeck(currentDeck) ? currentDeck : null;
  }

  return currentDeck === requestedDeck ? null : requestedDeck;
};

export const createDeckLoadMessage = ({
  deck,
  track,
  currentTime = 0,
  playbackRate = 1,
  isPlaying = false,
}) => {
  if (!isMonitorDeck(deck)) {
    throw new Error('Deck must be A or B');
  }

  return {
    type: 'deck-load',
    deck,
    track: serializeMonitorTrack(track),
    currentTime: normalizeSeconds(currentTime),
    playbackRate: normalizePlaybackRate(playbackRate),
    isPlaying: Boolean(isPlaying),
  };
};

export const createDeckPlaybackMessage = ({
  deck,
  action,
  currentTime = 0,
  playbackRate = 1,
}) => {
  if (!isMonitorDeck(deck)) {
    throw new Error('Deck must be A or B');
  }

  if (action === 'play') {
    return {
      type: 'deck-play',
      deck,
      currentTime: normalizeSeconds(currentTime),
      playbackRate: normalizePlaybackRate(playbackRate),
    };
  }

  if (action === 'pause') {
    return {
      type: 'deck-pause',
      deck,
      currentTime: normalizeSeconds(currentTime),
    };
  }

  if (action === 'seek') {
    return {
      type: 'deck-seek',
      deck,
      currentTime: normalizeSeconds(currentTime),
    };
  }

  if (action === 'rate') {
    return {
      type: 'deck-rate',
      deck,
      playbackRate: normalizePlaybackRate(playbackRate),
    };
  }

  throw new Error('Unsupported monitor playback action');
};

export const createMonitorSyncMessage = ({
  selectedDeck,
  deck,
  track,
  currentTime = 0,
  playbackRate = 1,
  isPlaying = false,
}) => {
  if (!isMonitorDeck(deck)) {
    throw new Error('Deck must be A or B');
  }

  return {
    type: 'deck-sync',
    selectedDeck: isMonitorDeck(selectedDeck) ? selectedDeck : null,
    deck,
    track: serializeMonitorTrack(track),
    currentTime: normalizeSeconds(currentTime),
    playbackRate: normalizePlaybackRate(playbackRate),
    isPlaying: Boolean(isPlaying),
  };
};

export const shouldApplyMonitorMessage = ({ selectedDeck, message }) => {
  if (!message) {
    return false;
  }

  if (message.type === 'monitor-select' || message.type === 'monitor-clear') {
    return true;
  }

  if (!isMonitorDeck(selectedDeck) || !isMonitorDeck(message.deck)) {
    return false;
  }

  return selectedDeck === message.deck;
};
