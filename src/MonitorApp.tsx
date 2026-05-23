import React, { useEffect, useRef, useState } from 'react';
import { Activity, Headphones, Pause, Play, Wifi, WifiOff } from 'lucide-react';
import { formatClock } from './audio.js';
import { shouldApplyMonitorMessage } from './remoteMonitor.js';

type MonitorDeck = 'A' | 'B';

type MonitorTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
};

const defaultTrack: MonitorTrack = {
  id: '',
  title: 'No deck selected',
  artist: '',
  src: '',
};

export default function MonitorApp() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedDeckRef = useRef<MonitorDeck>('B');
  const pendingPlayRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<MonitorDeck>('B');
  const [track, setTrack] = useState<MonitorTrack>(defaultTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const helperText = track.src
    ? (isPlaying ? 'Monitoring through this computer' : `Waiting for Deck ${selectedDeck} playback from iPad`)
    : 'Select Cue A or Cue B on the iPad';

  const applySelectedDeck = (deck: MonitorDeck) => {
    selectedDeckRef.current = deck;
    setSelectedDeck(deck);
  };

  const loadTrack = (nextTrack: MonitorTrack | null) => {
    const audio = audioRef.current;

    if (!audio || !nextTrack?.src) {
      setTrack(defaultTrack);
      if (audio) {
        audio.removeAttribute('src');
        audio.load();
      }
      return;
    }

    if (audio.src !== new URL(nextTrack.src, window.location.href).href) {
      audio.src = nextTrack.src;
      audio.load();
    }

    setTrack(nextTrack);
    setError(null);
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;

    if (!audio || !Number.isFinite(time)) {
      return;
    }

    try {
      audio.currentTime = Math.max(time, 0);
      setCurrentTime(audio.currentTime);
    } catch {
      setError('Track is not ready for seeking yet');
    }
  };

  const softSyncTo = (time: number, thresholdSeconds = 0.75) => {
    const audio = audioRef.current;

    if (!audio || !Number.isFinite(time)) {
      return;
    }

    if (Math.abs(audio.currentTime - time) < thresholdSeconds) {
      setCurrentTime(audio.currentTime);
      return;
    }

    seekTo(time);
  };

  const playAudio = async () => {
    const audio = audioRef.current;

    if (!audio || !audio.src) {
      pendingPlayRef.current = true;
      return;
    }

    if (!unlocked) {
      pendingPlayRef.current = true;
      return;
    }

    try {
      await audio.play();
      pendingPlayRef.current = false;
      setIsPlaying(true);
      setError(null);
    } catch {
      pendingPlayRef.current = true;
      setError('Click Enable Monitor Audio before playback');
    }
  };

  const pauseAudio = () => {
    const audio = audioRef.current;

    pendingPlayRef.current = false;
    audio?.pause();
    setIsPlaying(false);
  };

  const applyMonitorMessage = (message: any) => {
    if (message.type === 'monitor-clear') {
      pauseAudio();
      setTrack(defaultTrack);
      setCurrentTime(0);
      setError(null);
      if (audioRef.current) {
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      return;
    }

    if (message.type === 'monitor-select') {
      applySelectedDeck(message.deck);
      return;
    }

    if (message.type === 'deck-sync' && message.selectedDeck) {
      applySelectedDeck(message.selectedDeck);
    }

    if (!shouldApplyMonitorMessage({ selectedDeck: selectedDeckRef.current, message })) {
      return;
    }

    if (message.type === 'deck-load' || message.type === 'deck-sync') {
      const hadTrackLoaded = Boolean(audioRef.current?.src);
      loadTrack(message.track);
      setPlaybackRate(message.playbackRate ?? 1);

      if (audioRef.current) {
        audioRef.current.playbackRate = message.playbackRate ?? 1;
      }

      if (message.type === 'deck-load' && !hadTrackLoaded) {
        seekTo(message.currentTime ?? 0);
      } else {
        softSyncTo(message.currentTime ?? 0);
      }

      if (message.isPlaying) {
        void playAudio();
      } else {
        pauseAudio();
      }
      return;
    }

    if (message.type === 'deck-seek') {
      seekTo(message.currentTime ?? 0);
      return;
    }

    if (message.type === 'deck-rate') {
      const nextRate = Number.isFinite(message.playbackRate) ? message.playbackRate : 1;
      setPlaybackRate(nextRate);

      if (audioRef.current) {
        audioRef.current.playbackRate = nextRate;
      }
      return;
    }

    if (message.type === 'deck-play') {
      if (Number.isFinite(message.playbackRate) && audioRef.current) {
        audioRef.current.playbackRate = message.playbackRate;
        setPlaybackRate(message.playbackRate);
      }

      softSyncTo(message.currentTime ?? 0, 0.35);
      void playAudio();
      return;
    }

    if (message.type === 'deck-pause') {
      softSyncTo(message.currentTime ?? 0, 0.35);
      pauseAudio();
    }
  };

  const unlockAudio = async () => {
    const audio = audioRef.current;

    setUnlocked(true);

    if (!audio) {
      return;
    }

    try {
      if (pendingPlayRef.current && audio.src) {
        await audio.play();
        setIsPlaying(true);
        pendingPlayRef.current = false;
      }
      setError(null);
    } catch {
      setError('Browser blocked monitor audio');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    let reconnectTimer: number | null = null;
    let isClosed = false;
    let activeSocket: WebSocket | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/flowdj-monitor?role=monitor`);
      activeSocket = socket;

      socket.addEventListener('open', () => {
        setConnected(true);
      });

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'monitor-status' || message.type === 'monitor-hello') {
            setConnected(true);
            return;
          }

          applyMonitorMessage(message);
        } catch {
          setError('Monitor received an invalid message');
        }
      });

      socket.addEventListener('close', () => {
        setConnected(false);

        if (!isClosed) {
          reconnectTimer = window.setTimeout(connect, 1200);
        }
      });
    };

    connect();

    return () => {
      isClosed = true;

      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }

      activeSocket?.close();
    };
  }, [unlocked]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return () => {};
    }

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleError = () => {
      setError('Computer could not load this track');
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#242424] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-10">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#D0D0D0] text-black">
              <Headphones size={22} />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.22em] text-white/45">FlowDJ Monitor</div>
              <h1 className="text-3xl font-black tracking-normal">Deck {selectedDeck}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-white/60">
            {connected ? <Wifi size={18} className="text-[#7ED321]" /> : <WifiOff size={18} className="text-white/35" />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40">
              <Activity size={14} />
              Cue {selectedDeck}
            </div>
            <div className="truncate text-4xl font-black tracking-normal">{track.title}</div>
            <div className="mt-2 truncate text-lg font-semibold text-white/50">{track.artist || helperText}</div>
            {track.artist ? (
              <div className="mt-1 text-sm font-semibold text-white/35">{helperText}</div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={unlockAudio}
            className={`flex h-16 min-w-44 items-center justify-center gap-3 rounded-lg px-5 text-sm font-black uppercase tracking-[0.14em] transition-all active:scale-95 ${
              unlocked ? 'bg-[#7ED321] text-black' : 'bg-[#D0D0D0] text-black'
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {unlocked ? 'Audio Ready' : 'Enable Audio'}
          </button>
        </section>

        <div className="mt-8 h-2 overflow-hidden rounded-full bg-black/45">
          <div className="h-full bg-[#2E8DFF]" style={{ width: `${Math.min((currentTime / Math.max(audioRef.current?.duration ?? 0, 1)) * 100, 100)}%` }} />
        </div>

        <div className="mt-4 flex items-center justify-between font-mono text-sm font-bold text-white/55">
          <span>{formatClock(currentTime)}</span>
          <span>{playbackRate.toFixed(2)}x</span>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-[#FF3B30]/45 bg-[#FF3B30]/10 px-4 py-3 text-sm font-semibold text-[#FFB4AD]">
            {error}
          </div>
        ) : null}

        <audio ref={audioRef} preload="auto" playsInline />
      </main>
    </div>
  );
}
