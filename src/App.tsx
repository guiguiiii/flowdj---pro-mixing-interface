/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { 
  SkipBack, 
  SkipForward, 
  Music, 
  Settings, 
  Search, 
  Volume2, 
  Maximize2, 
  ListMusic,
  Activity,
  Disc,
  RotateCcw,
  SlidersHorizontal,
  Mic2,
  ChevronDown,
  Layers,
  Zap,
  Grid3X3,
  Circle,
  MoreHorizontal,
  Plus,
  Minus,
  RotateCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from './types';
import {
  buildTrackAnalysisEntry,
  hydrateTracksWithAnalysis,
  loadTrackAnalysisCache,
  saveTrackAnalysisCache,
} from './analysisCache.js';
import { formatClock, formatRemainingTime } from './audio.js';
import {
  applyCueAssignment,
  createCueState,
  getCueButtonAction,
  toggleCueSetMode,
} from './cue.js';
import { applyDeckEqValues, createDeckEqGraph } from './eq.js';
import {
  applyDeckFxValues,
  createFxKnobState,
  fxValueToKnobValue,
  knobValueToFxValue,
} from './fxKnob.js';
import {
  assignHotCuePad,
  createHotCueBanks,
  getHotCuePadAction,
} from './hotCue.js';
import {
  clampJogTime,
  getPointerAngleDegrees,
  getShortestAngleDelta,
} from './jogWheel.js';
import { findTrackById, updateTrackInLibrary } from './library.js';
import {
  createDeckVolumeGroups,
  getLevelSliderValue,
  setLevelSliderValue,
  toggleLevelTarget,
} from './levelControl.js';
import { TRACK_LIBRARY } from './trackLibrary.js';
import { applyPadFx, clearPadFx, PAD_FX_BANKS } from './padFx.js';
import { createLoopState, getLoopPlaybackWrapTime, toggleLoopState } from './loop.js';
import { SAMPLE_BANKS, SAMPLE_TRIGGER_MS } from './sample.js';
import {
  analyzeTrackWaveform,
  EMPTY_WAVEFORM_PEAKS,
  getDisplayedWaveformPeaks,
  getPlaybackLineWaveformFrame,
  getVerticalWaveformTranslateY,
  getWaveformBandWidths,
  getWaveformBeatWindowSize,
  getWaveformProgress,
  normalizeWaveformPeaks,
  shapeWaveformForDisplay,
} from './waveform.js';
import {
  getScrubbedTimeFromVerticalDrag,
  getSeekTimeFromHorizontalPointer,
} from './waveformScrub.js';
import {
  createLocalTrack,
  getFileSignature,
  isSupportedAudioFile,
  mergeImportedTracks,
} from './localTracks.js';
import { getDeckMixGains } from './mixer.js';
import {
  shouldRunActionOnPointerDown,
  shouldSuppressClick,
  TOUCH_CLICK_SUPPRESSION_MS,
} from './multiTouchPress.js';
import {
  createDeckLoadMessage,
  createDeckPlaybackMessage,
  createMonitorClearMessage,
  createMonitorSelectMessage,
  createMonitorSyncMessage,
  getNextMonitorDeckSelection,
} from './remoteMonitor.js';
import { getSyncPressAction, getSyncedPlaybackRate, SYNC_LONG_PRESS_MS } from './sync.js';
import {
  getPlaybackRateFromTempoPercent,
  getSliderValueFromTempoPercent,
  getTempoPercentFromPlaybackRate,
  getTempoPercentFromSliderValue,
} from './tempoFader.js';
import {
  getCrossfaderHandleLeft,
  getCrossfaderValueFromPointer,
  getVerticalFaderHandleBottom,
  getVerticalFaderValueFromPointer,
} from './crossfader.js';
import {
  getKnobPointerAngleDegrees,
  getKnobRotationDegrees,
  getKnobValueFromAngleDrag,
} from './knob.js';

const PlayPauseIcon = ({ width = 28, height = 18 }: { width?: number; height?: number }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 28 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="block select-none pointer-events-none"
    aria-hidden="true"
  >
    <path d="M10.1531 1.49228C10.1531 0.668118 9.47164 0 8.63103 0C7.79043 0 7.10898 0.668118 7.10898 1.49228V16.5077C7.10898 17.3319 7.79043 18 8.63103 18C9.47164 18 10.1531 17.3319 10.1531 16.5077V1.49228Z" fill="#3C3C3C"/>
    <path d="M3.04411 1.49228C3.04411 0.668118 2.36266 0 1.52206 0C0.681447 0 0 0.668118 0 1.49228V16.5077C0 17.3319 0.681447 18 1.52206 18C2.36266 18 3.04411 17.3319 3.04411 16.5077V1.49228Z" fill="#3C3C3C"/>
    <path d="M14.0509 10.3106L25.686 16.8959C26.7141 17.48 28 16.7499 28 15.5853V2.41471C28 1.25008 26.7141 0.519968 25.686 1.10406L14.0509 7.68934C13.0228 8.27343 13.0228 9.72654 14.0509 10.3106Z" fill="#3C3C3C"/>
  </svg>
);

const transportPlayButtonClassName =
  "w-14 h-10 rounded-[12px] flex items-center justify-center border border-white/10 bg-[#D0D0D0] shadow-[-1px_-1px_2px_rgba(78,78,78,0.1),1px_2px_4px_rgba(42,42,42,0.28)] transition-transform duration-150 hover:scale-[1.02] active:scale-95 active:shadow-[inset_-1px_-1px_2px_rgba(78,78,78,0.1),inset_1px_1px_3px_rgba(42,42,42,0.25)]";
const defaultDeckAudioState = { currentTime: 0, duration: 0, error: null as string | null };
const createMixerKnobState = () => ({ hi: 50, mid: 50, low: 50 });
const transportSecondaryButtonClassName =
  "px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-3 h-10 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-8 rounded-xl flex items-center justify-center transition-transform transition-colors duration-150 shadow-[1px_2px_3px_rgba(42,42,42,0.28),-1px_-1px_2px_rgba(78,78,78,0.5)] active:shadow-[inset_1px_1px_3px_rgba(42,42,42,0.28),inset_-1px_-1px_2px_rgba(78,78,78,0.45)] active:scale-95 border border-white/10";
const LOOP_SEEK_COVER_MS = 140;
const defaultWaveformState = {
  peaks: EMPTY_WAVEFORM_PEAKS,
  displayPeaks: EMPTY_WAVEFORM_PEAKS,
  duration: 0,
  beatOffset: 0,
  status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
};
const AUDIO_READY_TIMEOUT_MS = 5000;
const analysisWaveformPalette = {
  outer: '#1D6FFF',
  mid: '#C97A12',
  core: '#FFF5DD',
  spine: '#FFF9EA',
} as const;
const getBrowserStorage = () => (typeof window === 'undefined' ? undefined : window.localStorage);
const getIsIpadSafari = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor;
  const isTouchIpad = navigator.maxTouchPoints > 1
    && (userAgent.includes('iPad') || userAgent.includes('Macintosh'));

  return vendor.includes('Apple')
    && userAgent.includes('Safari')
    && isTouchIpad
    && !userAgent.includes('CriOS')
    && !userAgent.includes('EdgiOS')
    && !userAgent.includes('FxiOS');
};
const getInitialAnalysisCache = () => loadTrackAnalysisCache(getBrowserStorage());
const getInitialWaveformLibrary = () => {
  const cachedAnalysis = getInitialAnalysisCache();

  return Object.fromEntries(
    Object.entries(cachedAnalysis).map(([trackId, analysis]: [string, any]) => {
      const peaks = normalizeWaveformPeaks(analysis.peaks, EMPTY_WAVEFORM_PEAKS.length);

      return [
        trackId,
        {
          peaks,
          displayPeaks: shapeWaveformForDisplay(peaks),
          duration: analysis.duration ?? 0,
          beatOffset: analysis.beatOffset ?? 0,
          status: 'ready' as const,
        },
      ];
    }),
  );
};
type WaveformPoint = {
  peak: number,
  energy: number,
  low: number,
  mid: number,
  high: number,
};
type DeckAudioGraph = {
  source: MediaElementAudioSourceNode,
  lowFilter: BiquadFilterNode,
  midFilter: BiquadFilterNode,
  highFilter: BiquadFilterNode,
  fxFilter: BiquadFilterNode,
  echoDelay: DelayNode,
  echoFeedback: GainNode,
  echoWetGain: GainNode,
  reverbDelay: DelayNode,
  reverbFeedback: GainNode,
  reverbWetGain: GainNode,
  outputGain: GainNode,
};

const waitForAudioReady = (audio: HTMLAudioElement, timeoutMs = AUDIO_READY_TIMEOUT_MS) => {
  if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;

    const cleanup = () => {
      audio.removeEventListener('canplay', handleReady);
      audio.removeEventListener('loadeddata', handleReady);
      audio.removeEventListener('error', handleError);

      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(audio.error ?? new Error('Audio failed to load'));
    };

    audio.addEventListener('canplay', handleReady, { once: true });
    audio.addEventListener('loadeddata', handleReady, { once: true });
    audio.addEventListener('error', handleError, { once: true });

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timed out'));
    }, timeoutMs);

    if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY) {
      audio.load();
    }
  });
};

const emphasizeWaveformContrast = (value: number, exponent = 1.8, floor = 0) => {
  const normalized = Math.max(value - floor, 0);
  return Math.pow(normalized, exponent);
};

const buildWaveformPoints = (
  peaks: WaveformPoint[],
  sampleKey: 'peak' | 'energy',
  width: number,
  height: number,
  floor = 0,
  exponent = 1.8,
) => {
  if (!peaks.length) {
    return `0,${height} ${width},${height}`;
  }

  return peaks
    .map((point, index) => {
      const x = peaks.length === 1 ? width / 2 : (index / (peaks.length - 1)) * width;
      const amplitude = emphasizeWaveformContrast(point[sampleKey], exponent, floor);
      const y = height - amplitude * height;
      return `${x.toFixed(2)},${Math.max(0, y).toFixed(2)}`;
    })
    .join(' ');
};

const buildWaveformSpikePoints = (
  peaks: WaveformPoint[],
  width: number,
  height: number,
) => {
  if (!peaks.length) {
    return `0,${height} ${width},${height}`;
  }

  const points: string[] = [];

  peaks.forEach((point, index) => {
    const x = peaks.length === 1 ? width / 2 : (index / (peaks.length - 1)) * width;
    const amplitude = emphasizeWaveformContrast(point.peak, 1.05, 0) * height;
    const y = Math.max(height - amplitude, 0);

    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });

  return points.join(' ');
};

const buildVerticalWaveformLayerPath = (
  widths: number[],
  centerX: number,
  rowStep: number,
  minHalfWidth = 0,
) => {
  if (!widths.length) {
    return '';
  }

  const leftPoints: string[] = [];
  const rightPoints: string[] = [];

  widths.forEach((width, index) => {
    const y = index * rowStep;
    const halfWidth = width > 0 ? Math.max(width, minHalfWidth) : 0;
    leftPoints.push(`${(centerX - halfWidth).toFixed(2)},${y.toFixed(2)}`);
    rightPoints.push(`${(centerX + halfWidth).toFixed(2)},${y.toFixed(2)}`);
  });

  const lastY = ((widths.length - 1) * rowStep + rowStep * 0.9).toFixed(2);
  const firstWidth = widths[0] > 0 ? Math.max(widths[0], minHalfWidth) : 0;
  const lastWidth = widths[widths.length - 1] > 0 ? Math.max(widths[widths.length - 1], minHalfWidth) : 0;

  return [
    `M ${(centerX - firstWidth).toFixed(2)} 0`,
    ...leftPoints.slice(1).map((point) => `L ${point}`),
    `L ${(centerX - lastWidth).toFixed(2)} ${lastY}`,
    `L ${(centerX + lastWidth).toFixed(2)} ${lastY}`,
    ...rightPoints.reverse().map((point) => `L ${point}`),
    'Z',
  ].join(' ');
};

// --- UI Components ---

const Knob = ({ 
  label, 
  color = "white", 
  value = 50, 
  valueLabel,
  size = "sm", 
  variant = "standard", 
  onChange = (_val: number) => {} 
}: { 
  label: string; 
  color?: string; 
  value?: number; 
  valueLabel?: string;
  size?: string; 
  variant?: string; 
  onChange?: (val: number) => void; 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const startAngle = useRef(0);
  const startValue = useRef(0);
  const knobMetrics = size === 'sm'
    ? { shell: 46, labelClass: 'text-[8.5px]', dotOffsetY: 1.8 }
    : { shell: 58, labelClass: 'text-[9px]', dotOffsetY: 2.2 };
  const rotation = getKnobRotationDegrees(value);
  const knobId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const outerPath =
    'M50.9475 0.6064C54.1575 -0.8436 57.9475 0.3864 59.6975 3.4464C62.5575 8.4564 67.4275 11.9964 73.0675 13.1664C76.5175 13.8864 78.8575 17.1064 78.4775 20.6064C77.8475 26.3364 79.7075 32.0664 83.5875 36.3264C85.9575 38.9364 85.9575 42.9164 83.5875 45.5264C79.7075 49.7864 77.8475 55.5164 78.4775 61.2464C78.8675 64.7464 76.5275 67.9764 73.0675 68.6864C67.4275 69.8564 62.5475 73.3964 59.6975 78.4064C57.9475 81.4664 54.1675 82.6964 50.9475 81.2464C45.6975 78.8764 39.6775 78.8764 34.4175 81.2464C31.2075 82.6964 27.4175 81.4664 25.6675 78.4064C22.8075 73.3964 17.9375 69.8564 12.2975 68.6864C8.8475 67.9664 6.5075 64.7464 6.8875 61.2464C7.5175 55.5164 5.6575 49.7864 1.7775 45.5264C-0.5925 42.9164 -0.5925 38.9364 1.7775 36.3264C5.6575 32.0664 7.5175 26.3364 6.8875 20.6064C6.4975 17.1064 8.8375 13.8764 12.2975 13.1664C17.9375 11.9964 22.8175 8.4564 25.6675 3.4464C27.4175 0.3864 31.1975 -0.8436 34.4175 0.6064C39.6675 2.9764 45.6875 2.9764 50.9475 0.6064Z';
  const ringPath =
    'M42.6875 16.1365C56.3775 16.1365 67.4675 27.2365 67.4675 40.9165C67.4675 54.5965 56.3675 65.6965 42.6875 65.6965C29.0075 65.6965 17.9075 54.5965 17.9075 40.9165C17.9075 27.2365 29.0075 16.1365 42.6875 16.1365ZM42.6875 14.1365C27.9175 14.1365 15.9075 26.1465 15.9075 40.9165C15.9075 55.6865 27.9175 67.6965 42.6875 67.6965C57.4575 67.6965 69.4675 55.6865 69.4675 40.9165C69.4675 26.1465 57.4575 14.1365 42.6875 14.1365Z';
  const innerFacePath =
    'M42.6875 66.7065C28.4675 66.7065 16.9075 55.1365 16.9075 40.9265C16.9075 26.7165 28.4775 15.1465 42.6875 15.1465C56.8975 15.1465 68.4675 26.7165 68.4675 40.9265C68.4675 55.1365 56.8975 66.7065 42.6875 66.7065Z';
  const dotPath =
    'M42.6875 26.9864C44.383 26.9864 45.7575 25.6119 45.7575 23.9164C45.7575 22.2209 44.383 20.8464 42.6875 20.8464C40.992 20.8464 39.6175 22.2209 39.6175 23.9164C39.6175 25.6119 40.992 26.9864 42.6875 26.9864Z';

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setIsDragging(true);
    activePointerId.current = e.pointerId;
    startAngle.current = getKnobPointerAngleDegrees({
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      pointerX: e.clientX,
      pointerY: e.clientY,
    });
    startValue.current = value;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || activePointerId.current !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();

    onChange(
      getKnobValueFromAngleDrag({
        startValue: startValue.current,
        startAngle: startAngle.current,
        currentAngle: getKnobPointerAngleDegrees({
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          pointerX: e.clientX,
          pointerY: e.clientY,
        }),
      }),
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;

    setIsDragging(false);
    activePointerId.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;

    setIsDragging(false);
    activePointerId.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex flex-col items-center gap-0 shrink-0">
      <div 
        className="relative flex items-center justify-center cursor-pointer active:scale-95 transition-all touch-none"
        style={{ width: knobMetrics.shell, height: knobMetrics.shell }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {variant === 'gear' ? (
          <div
            className="relative w-full h-full flex items-center justify-center pointer-events-none"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg
              className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
              viewBox="0 0 86 82"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`knob-shell-${knobId}`} x1="14" y1="10" x2="70" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F3F3F3" />
                  <stop offset="45%" stopColor="#D0D0D0" />
                  <stop offset="100%" stopColor="#B9B9B9" />
                </linearGradient>
                <linearGradient id={`knob-face-${knobId}`} x1="20" y1="15" x2="64" y2="67" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FAFAFA" />
                  <stop offset="50%" stopColor="#D0D0D0" />
                  <stop offset="100%" stopColor="#C3C3C3" />
                </linearGradient>
              </defs>
              <path d={outerPath} fill={`url(#knob-shell-${knobId})`} />
              <path d={innerFacePath} fill={`url(#knob-face-${knobId})`} />
              <path d={ringPath} fill={color} />
              <g transform={`translate(0 ${knobMetrics.dotOffsetY})`}>
                <path d={dotPath} fill={color} />
              </g>
            </svg>
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-[#D0D0D0] relative flex items-center justify-center shadow-[1px_2px_3px_rgba(0,0,0,0.18),-1px_-1px_2px_rgba(255,255,255,0.36)] pointer-events-none">
            {/* Center-aligned indicator container */}
            <div
              className="absolute inset-0 flex items-start justify-center pt-2.5"
              style={{ transform: `rotate(${getKnobRotationDegrees(value)}deg)` }}
            >
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
          </div>
        )}
      </div>
      <span className={`${knobMetrics.labelClass} font-bold uppercase tracking-widest leading-none text-black/85 pointer-events-none`}>{label}</span>
      {valueLabel ? (
        <span className="text-[8px] leading-none font-mono font-bold text-black/45 pointer-events-none">{valueLabel}</span>
      ) : null}
    </div>
  );
};

const FaderHandle = ({ color, orientation = 'vertical', size = 'md' }: { color: string, orientation?: 'vertical' | 'horizontal', size?: 'sm' | 'md' | 'lg' }) => {
  const isVertical = orientation === 'vertical';
  
  // Responsive sizing based on orientation and size prop
  const dims = isVertical 
    ? (size === 'sm' ? 'w-6 h-10' : size === 'md' ? 'w-8 h-12' : 'w-10 h-16')
    : (size === 'sm' ? 'w-10 h-6' : size === 'md' ? 'w-12 h-8' : 'w-16 h-10');

  return (
    <div className={`relative ${dims} bg-gradient-to-b from-[#F2F2F2] via-[#D0D0D0] to-[#B8B8B8] rounded-full border-[3px] shadow-[0_2px_7px_rgba(0,0,0,0.24)] flex items-center justify-center overflow-hidden transition-transform active:scale-95`} style={{ borderColor: color }}>
      {/* Vertical center line */}
      <div className={`${isVertical ? 'w-[1.5px] h-1/2' : 'h-[1.5px] w-1/2'} rounded-full`} style={{ backgroundColor: color, opacity: 0.4 }} />
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
    </div>
  );
};

const VerticalFader = ({ 
  value, 
  onChange = (_val: number) => {}, 
  color = "white", 
  height = "h-24",
  handleSize = 'md',
  handleOrientation = 'vertical',
  showCenterMarker = false,
}: { 
  value: number; 
  onChange?: (val: number) => void; 
  color?: string; 
  height?: string; 
  handleSize?: 'sm' | 'md' | 'lg';
  handleOrientation?: 'vertical' | 'horizontal';
  showCenterMarker?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const [faderMetrics, setFaderMetrics] = useState({ trackHeight: 0, handleHeight: 0 });
  const faderTravelInset = 4;

  useEffect(() => {
    const updateFaderMetrics = () => {
      setFaderMetrics({
        trackHeight: trackRef.current?.clientHeight ?? 0,
        handleHeight: handleRef.current?.offsetHeight ?? 0,
      });
    };

    updateFaderMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateFaderMetrics();
    });

    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    if (handleRef.current) {
      resizeObserver.observe(handleRef.current);
    }

    window.addEventListener('resize', updateFaderMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFaderMetrics);
    };
  }, []);

  const updateValueFromPointer = (clientY: number) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const trackTop = rect.top + faderTravelInset;
    const trackHeight = Math.max(rect.height - faderTravelInset * 2, 0);

    onChange(
      getVerticalFaderValueFromPointer({
        pointerY: clientY,
        trackTop,
        trackHeight,
        handleHeight: faderMetrics.handleHeight,
      }),
    );
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    activePointerId.current = e.pointerId;
    updateValueFromPointer(e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || activePointerId.current !== e.pointerId) return;
    updateValueFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;

    setIsDragging(false);
    activePointerId.current = null;

    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    handlePointerUp(e);
  };

  const handleBottom = getVerticalFaderHandleBottom({
    value,
    trackHeight: Math.max(faderMetrics.trackHeight - faderTravelInset * 2, 0),
    handleHeight: faderMetrics.handleHeight,
  });

  return (
    <div 
      ref={containerRef}
      className={`w-12 ${height} bg-black/30 rounded-xl relative flex justify-center py-4 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)] cursor-ns-resize touch-none overflow-hidden`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Scale Lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-6 px-3 pointer-events-none opacity-10">
        {[...Array(11)].map((_, i) => (
          <div key={i} className={`w-full h-px ${i % 5 === 0 ? 'bg-white/40' : 'bg-white/20'}`} />
        ))}
      </div>
      
      <div ref={trackRef} className="w-[3px] h-full bg-black/40 rounded-full relative pointer-events-none shadow-inner">
        {showCenterMarker ? (
          <div className="absolute left-1/2 top-1/2 z-0 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-white/45" />
        ) : null}
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2 z-10"
          ref={handleRef}
          style={{ bottom: handleBottom + faderTravelInset }}
        >
          <FaderHandle color={color} size={handleSize} orientation={handleOrientation} />
        </motion.div>
      </div>
    </div>
  );
};

const HorizontalWaveform = memo(({
  peaks,
  progress,
  isAnalyzing,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  peaks: WaveformPoint[],
  progress: number,
  isAnalyzing: boolean,
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>,
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>,
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>,
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>,
}) => {
  const width = 560;
  const height = 72;
  const { basePolygon, innerPolygon, spikePolyline } = useMemo(() => ({
    basePolygon: `0,${height} ${buildWaveformPoints(peaks, 'peak', width, height, 0.035, 1.55)} ${width},${height}`,
    innerPolygon: `0,${height} ${buildWaveformPoints(peaks, 'energy', width, height * 0.94, 0.015, 1.15)} ${width},${height}`,
    spikePolyline: buildWaveformSpikePoints(peaks, width, height * 0.92),
  }), [peaks]);
  const playedWidth = Math.max(progress * width, 0);

  return (
    <div
      className="h-full w-full bg-black rounded-[3px] border border-white/10 overflow-hidden relative touch-none cursor-ew-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.24))]" />
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polygon points={basePolygon} fill={analysisWaveformPalette.outer} opacity="0.98" />
        <polygon points={innerPolygon} fill={analysisWaveformPalette.mid} opacity="0.92" />
        <polyline points={spikePolyline} fill="none" stroke={analysisWaveformPalette.core} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.98" />
      </svg>
      <div className="absolute top-0 bottom-0 w-[2px] bg-[#FF4A4A] z-10 shadow-[0_0_5px_rgba(255,74,74,0.3)]" style={{ left: `calc(${progress * 100}% - 1px)` }} />
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/45 bg-black/20">
          analyzing
        </div>
      )}
    </div>
  );
});

const VerticalWaveform = memo(({
  peaks,
  offset,
  isAnalyzing,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  peaks: WaveformPoint[],
  offset: number,
  isAnalyzing: boolean,
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>,
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>,
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>,
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>,
}) => {
  const rowStep = 10;
  const svgWidth = 164;
  const svgHeight = Math.max(peaks.length * rowStep, rowStep);
  const centerX = svgWidth / 2;
  const maxHalfWidth = svgWidth / 2;
  const splitIndex = Math.floor(peaks.length / 2);
  const playbackRowIndex = Math.min(splitIndex, Math.max(peaks.length - 1, 0));
  const buildSegmentPaths = (segmentPeaks: WaveformPoint[]) => {
    const widths = segmentPeaks.map((point) => getWaveformBandWidths(point, maxHalfWidth));

    return {
      outer: buildVerticalWaveformLayerPath(widths.map((item) => item.outer), centerX, rowStep, 0.75),
      bass: buildVerticalWaveformLayerPath(widths.map((item) => Math.min(item.bass, item.outer * 0.34)), centerX, rowStep, 0.2),
      mid: buildVerticalWaveformLayerPath(widths.map((item) => Math.min(item.mid, item.outer * 0.72)), centerX, rowStep, 0.45),
      core: buildVerticalWaveformLayerPath(widths.map((item) => Math.min(item.core, item.mid * 0.58)), centerX, rowStep, 0.18),
    };
  };
  const { pastPaths, futurePaths, spinePoints } = useMemo(() => {
    const pastPeaks = peaks.slice(0, playbackRowIndex + 1);
    const futurePeaks = peaks.slice(playbackRowIndex);

    return {
      pastPaths: buildSegmentPaths(pastPeaks),
      futurePaths: buildSegmentPaths(futurePeaks),
      spinePoints: peaks
        .map((point, index) => {
          const y = index * rowStep;
          const drift = (point.high - point.low) * (svgWidth * 0.028);
          return `${(svgWidth / 2 + drift).toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' '),
    };
  }, [peaks, playbackRowIndex]);
  const translateY = getVerticalWaveformTranslateY(playbackRowIndex, rowStep, offset);

  return (
    <div
      className="flex-1 h-full relative bg-black border-x border-white/5 overflow-hidden touch-none cursor-ns-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none">
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#FF4A4A] shadow-[0_0_4px_rgba(255,74,74,0.26)]" />
        <div className="absolute left-0 right-0 top-1/4 h-px bg-white/55" />
        <div className="absolute left-0 right-0 top-3/4 h-px bg-white/55" />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-x-0 top-1/2 px-2.5 will-change-transform"
          style={{ transform: `translateY(${translateY}px)` }}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="block w-full"
            style={{ height: `${svgHeight}px` }}
          >
            <g>
              <path d={pastPaths.outer} fill="#185CFF" opacity="0.92" />
              <path d={pastPaths.bass} fill="#0D63FF" opacity="0.84" />
              <path d={pastPaths.mid} fill="#D58A18" opacity="0.94" />
              <path d={pastPaths.core} fill="#FFF4D9" opacity="0.99" />
            </g>
            <g transform={`translate(0 ${(playbackRowIndex * rowStep).toFixed(2)})`}>
              <path d={futurePaths.outer} fill="#185CFF" opacity="0.86" />
              <path d={futurePaths.bass} fill="#0D63FF" opacity="0.84" />
              <path d={futurePaths.mid} fill="#D58A18" opacity="0.94" />
              <path d={futurePaths.core} fill="#FFF4D9" opacity="0.99" />
            </g>
            <polyline points={spinePoints} fill="none" stroke={analysisWaveformPalette.spine} strokeWidth="1.1" opacity="0.42" />
          </svg>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.88)_38%,rgba(0,0,0,0.96)_72%,rgba(0,0,0,1))] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(0,0,0,1),rgba(0,0,0,0.82)_45%,rgba(0,0,0,0))] pointer-events-none" />
      </div>

      {isAnalyzing && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
          analyzing
        </div>
      )}
    </div>
  );
});

const DeckDisplay = ({
  color,
  active,
  bpm,
  tempoPercent,
  jogRotationDeg,
  time,
  duration,
  progress,
  title,
  artist,
  monitorDeck,
  isMonitorSelected = false,
  monitorPlacement = 'right',
  onMonitorToggle,
  isJogDragging = false,
  onJogPointerDown,
  onJogPointerMove,
  onJogPointerUp,
  onJogPointerCancel,
}: {
  color: string,
  active: boolean,
  bpm: number,
  tempoPercent: number,
  jogRotationDeg: number,
  time: string,
  duration: string,
  progress: number,
  title: string,
  artist: string,
  monitorDeck: 'A' | 'B',
  isMonitorSelected?: boolean,
  monitorPlacement?: 'left' | 'right',
  onMonitorToggle?: () => void,
  isJogDragging?: boolean,
  onJogPointerDown?: React.PointerEventHandler<HTMLDivElement>,
  onJogPointerMove?: React.PointerEventHandler<HTMLDivElement>,
  onJogPointerUp?: React.PointerEventHandler<HTMLDivElement>,
  onJogPointerCancel?: React.PointerEventHandler<HTMLDivElement>,
}) => {
  const orbitSize = 'clamp(172px, 21vw, 214px)';
  const orbitDotSize = 'clamp(14px, 1.8vw, 18px)';
  const orbitStartAngle = 45;
  const progressDashOffset = 304.7 * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full relative p-1 min-w-0">
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onMonitorToggle?.();
        }}
        className={`ipad-only absolute top-[clamp(22px,12%,54px)] ${monitorPlacement === 'left' ? 'left-[clamp(18px,13%,68px)]' : 'right-[clamp(18px,13%,68px)]'} z-20 h-10 min-w-10 rounded-full border border-black/10 bg-[#E0E0E0] px-3 text-[13px] font-black uppercase tracking-[0.08em] shadow-[1px_2px_4px_rgba(0,0,0,0.18),-1px_-1px_2px_rgba(255,255,255,0.55)] transition-transform transition-colors duration-150 active:scale-95 ${isMonitorSelected ? 'ring-1 ring-offset-2 ring-offset-[#D0D0D0]' : 'text-black/55'}`}
        style={isMonitorSelected ? { color, boxShadow: `0 0 9px ${color}40, 1px 2px 4px rgba(0,0,0,0.18), -1px -1px 2px rgba(255,255,255,0.55)` } : undefined}
        aria-pressed={isMonitorSelected}
        aria-label={isMonitorSelected ? `Turn deck ${monitorDeck} monitor off` : `Monitor deck ${monitorDeck}`}
      >
        {monitorDeck}
      </button>

      {/* Circular Data Meter - Enlarged by another 20% while keeping container height fixed */}
      <div
        data-jog-wheel
        className={`relative w-[150px] h-[150px] md:w-[165px] md:h-[165px] xl:w-[185px] xl:h-[185px] rounded-full neu-convex border-[5px] xl:border-[6px] border-[#D1D1D1] flex flex-col items-center justify-center overflow-visible shrink-0 select-none touch-none ${isJogDragging ? 'cursor-grabbing shadow-[inset_0_0_10px_rgba(255,148,87,0.14),0_5px_16px_rgba(0,0,0,0.18)]' : 'cursor-grab shadow-[0_3px_8px_rgba(0,0,0,0.16)]'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={onJogPointerDown}
        onPointerMove={onJogPointerMove}
        onPointerUp={onJogPointerUp}
        onPointerCancel={onJogPointerCancel}
      >
      {/* Outer Orbit Track & Moving Dot */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: orbitSize, height: orbitSize }}
      >
        <div className="absolute inset-0 rounded-full border-[2px]" style={{ borderColor: 'rgba(138, 138, 138, 0.5)' }} />
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${jogRotationDeg + orbitStartAngle}deg)`, transformOrigin: '50% 50%' }}
        >
          <div className="absolute inset-0">
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="relative h-10 w-10">
                <div
                  className="absolute left-1/2 top-1/2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
                  style={{
                    width: orbitDotSize,
                    height: orbitDotSize,
                    backgroundColor: color,
                    boxShadow: isJogDragging ? `0 0 10px ${color}cc, 0 0 16px ${color}55` : `0 0 6px ${color}aa`,
                    scale: `${isJogDragging ? 1.18 : 1}`,
                    left: '50%',
                    top: '50%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inner Shadow Ring */}
      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.15)] pointer-events-none" />
      
      {/* Main BPM Display */}
      <div className="text-[28px] md:text-[32px] xl:text-[35px] font-mono font-bold leading-none tracking-tighter text-black/80">{bpm.toFixed(1)}</div>
      
      {/* Bottom Info Row (BPM Label, Pitch, Range) */}
      <div className="relative w-full flex items-center justify-center px-4 md:px-5 xl:px-6 mb-1 xl:mb-2">
        <div className="absolute left-2 md:left-3 text-[10px] md:text-[11px] xl:text-[12px] font-mono font-bold text-black/50">{`${tempoPercent > 0 ? '+' : ''}${tempoPercent.toFixed(1)}%`}</div>
        <div className="text-[11px] md:text-[12px] xl:text-[12px] font-bold uppercase tracking-[0.1em] text-black/40">BPM</div>
        <div className="absolute right-2 md:right-3 flex items-center gap-0.5 px-1 rounded bg-black/5 border border-black/10">
          <span className="text-[7px] font-bold text-black/40">±</span>
          <span className="text-[10px] md:text-[11px] xl:text-[12px] font-mono font-bold text-black/60">8</span>
        </div>
      </div>
      
      {/* Time Display */}
      <div className="flex flex-col items-center w-24 md:w-28 mt-1 md:mt-2">
        <div className="w-full h-[3px] rounded-full mb-2" style={{ backgroundColor: color }} />
        <div className="text-[15px] md:text-[16px] xl:text-[17px] font-mono font-bold text-black/90 tracking-tight">{time}</div>
        <div className="text-[11px] md:text-[12px] xl:text-[13px] font-mono font-bold text-black/50 leading-none">{duration}</div>
      </div>

      {/* Progress Ring */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {/* Background Track */}
        <circle 
          cx="50" cy="50" r="48.5" 
          fill="none" stroke="#7B7B7B" strokeWidth="0.8" 
          strokeOpacity="0.2"
        />
        {/* Active Progress */}
        <circle 
          cx="50" cy="50" r="48.5" 
          fill="none" stroke={color} strokeWidth="1.5" 
          strokeDasharray="304.7" 
          strokeDashoffset={progressDashOffset}
          strokeLinecap="round"
          style={{ rotate: -90, transformOrigin: '50% 50%' }}
        />
      </svg>
    </div>
    </div>
  );
};

const MusicLibraryModal = ({
  deck,
  isOpen,
  tracks,
  currentTrackId,
  importError,
  onClose,
  onAddTracks,
  onSelectTrack,
}: {
  deck: 'A' | 'B' | null;
  isOpen: boolean;
  tracks: Track[];
  currentTrackId: string | null;
  importError: string | null;
  onClose: () => void;
  onAddTracks: () => void;
  onSelectTrack: (trackId: string) => void;
}) => {
  if (!isOpen || !deck) return null;

  const tagOptions = ['全部', ...Array.from(new Set(tracks.map((track) => track.tag).filter(Boolean)))];
  const [activeTag, setActiveTag] = useState('全部');
  const visibleTracks = activeTag === '全部'
    ? tracks
    : tracks.filter((track) => track.tag === activeTag);

  useEffect(() => {
    if (!tagOptions.includes(activeTag)) {
      setActiveTag('全部');
    }
  }, [activeTag, tagOptions]);

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/68 px-4">
      <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-[#2E2E2E] shadow-[0_14px_34px_rgba(0,0,0,0.36)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#383838]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">Deck {deck}</div>
            <h2 className="text-white text-lg font-semibold">Music Library</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddTracks}
              className="px-3 py-1.5 rounded-full bg-[#4b8dff] text-white text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#5b97ff]"
            >
              Add Track
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-full bg-white/8 text-white/75 text-xs font-bold uppercase tracking-[0.18em] hover:bg-white/12"
            >
              Close
            </button>
          </div>
        </div>
        {importError && (
          <div className="px-5 py-2 text-[11px] font-medium text-[#FFB4B4] border-b border-white/10 bg-[#3a2a2a]">
            {importError}
          </div>
        )}
        <div className="px-4 py-3 border-b border-white/10 bg-[#333333] flex flex-wrap gap-2">
          {tagOptions.map((tag) => {
            const isActiveTag = activeTag === tag;

            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[0.08em] transition-colors ${isActiveTag ? 'bg-white text-[#202020]' : 'bg-white/8 text-white/70 hover:bg-white/12'}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <div className="p-4 grid gap-3 max-h-[70vh] overflow-y-auto">
          {visibleTracks.map((track) => {
            const isActive = currentTrackId === track.id;

            return (
              <button
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`w-full rounded-[22px] border text-left p-3 transition-all ${isActive ? 'border-white/50 bg-white/12' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-semibold leading-tight whitespace-normal break-words">{track.title}</div>
                        <div className="text-white/50 text-[11px] uppercase tracking-[0.16em] truncate">{track.fileName ?? track.artist}</div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-white/80 text-xs font-mono">{track.duration}</div>
                        <div className="text-white/35 text-[10px] font-bold uppercase tracking-[0.12em]">{track.bpm == null ? '-- BPM' : `${track.bpm} BPM`}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  const isIpadSafari = useMemo(() => getIsIpadSafari(), []);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>(() => hydrateTracksWithAnalysis(TRACK_LIBRARY, getInitialAnalysisCache()));
  const [trackAId, setTrackAId] = useState(TRACK_LIBRARY[0]?.id ?? '');
  const [trackBId, setTrackBId] = useState(TRACK_LIBRARY[1]?.id ?? TRACK_LIBRARY[0]?.id ?? '');
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [audioStateA, setAudioStateA] = useState(defaultDeckAudioState);
  const [audioStateB, setAudioStateB] = useState(defaultDeckAudioState);
  const [libraryDeck, setLibraryDeck] = useState<'A' | 'B' | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [waveformLibrary, setWaveformLibrary] = useState<Record<string, typeof defaultWaveformState>>(getInitialWaveformLibrary);
  const [crossfader, setCrossfader] = useState(50);
  const [playbackRateA, setPlaybackRateA] = useState(1);
  const [playbackRateB, setPlaybackRateB] = useState(1);
  const [selectedMonitorDeck, setSelectedMonitorDeck] = useState<'A' | 'B' | null>(null);
  const [monitorStatus, setMonitorStatus] = useState({
    connected: false,
    monitors: 0,
  });
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const monitorSocketRef = useRef<WebSocket | null>(null);
  const monitorSyncRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const deckAudioGraphRef = useRef<{ A: DeckAudioGraph | null; B: DeckAudioGraph | null }>({ A: null, B: null });
  const loopCoverAudioRef = useRef<{ A: HTMLAudioElement | null; B: HTMLAudioElement | null }>({ A: null, B: null });
  const loopCoverSourceRef = useRef<{ A: MediaElementAudioSourceNode | null; B: MediaElementAudioSourceNode | null }>({ A: null, B: null });
  const loopCoverTimeoutRef = useRef<{ A: number | null; B: number | null }>({ A: null, B: null });
  const activePadFxRuntimeRef = useRef<{ A: { padId: string, playbackRate: number } | null; B: { padId: string, playbackRate: number } | null }>({ A: null, B: null });
  const sampleTriggerTimeoutRef = useRef<{ A: number | null; B: number | null }>({ A: null, B: null });
  const activeSampleAudioRef = useRef<{ A: HTMLAudioElement[]; B: HTMLAudioElement[] }>({ A: [], B: [] });
  const syncPressTimeoutRef = useRef<{ A: number | null; B: number | null }>({ A: null, B: null });
  const syncPressStartedAtRef = useRef<{ A: number; B: number }>({ A: 0, B: 0 });
  const syncLongPressTriggeredRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });
  const syncSuppressClickRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });
  const touchPressSuppressClickUntilRef = useRef(0);
  const crossfaderRef = useRef<HTMLDivElement>(null);
  const crossfaderHandleRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localTrackUrlsRef = useRef(new Set<string>());
  const horizontalWaveformDragRef = useRef<Record<'A' | 'B', { pointerId: number | null }>>({
    A: { pointerId: null },
    B: { pointerId: null },
  });
  const verticalWaveformDragRef = useRef<Record<'A' | 'B', {
    pointerId: number | null,
    startY: number,
    startTime: number,
  }>>({
    A: { pointerId: null, startY: 0, startTime: 0 },
    B: { pointerId: null, startY: 0, startTime: 0 },
  });
  const jogDotDragRef = useRef<Record<'A' | 'B', {
    pointerId: number | null,
    lastAngleDeg: number,
    wasPlaying: boolean,
  }>>({
    A: { pointerId: null, lastAngleDeg: 0, wasPlaying: false },
    B: { pointerId: null, lastAngleDeg: 0, wasPlaying: false },
  });
  const jogRotationFrameRef = useRef<{ A: number | null; B: number | null }>({ A: null, B: null });
  const jogRotationTimestampRef = useRef<{ A: number | null; B: number | null }>({ A: null, B: null });
  const [jogRotationA, setJogRotationA] = useState(0);
  const [jogRotationB, setJogRotationB] = useState(0);
  const [isJogDotDraggingA, setIsJogDotDraggingA] = useState(false);
  const [isJogDotDraggingB, setIsJogDotDraggingB] = useState(false);
  const [isCrossfaderDragging, setIsCrossfaderDragging] = useState(false);
  const crossfaderPointerIdRef = useRef<number | null>(null);
  const [crossfaderMetrics, setCrossfaderMetrics] = useState({ trackWidth: 0, handleWidth: 0 });
  const analyzedTrackIdsRef = useRef(new Set(Object.keys(getInitialAnalysisCache())));
  const [searchQuery, setSearchQuery] = useState('');
  const trackA = findTrackById(libraryTracks, trackAId);
  const trackB = findTrackById(libraryTracks, trackBId);
  
  const [modeA, setModeA] = useState('Mixer');
  const [modeB, setModeB] = useState('Mixer');
  const panelModes = ['FX', 'Mixer', 'Level'];

  const getMultiTouchPressHandlers = <Element extends HTMLElement>(
    action: () => void,
  ) => ({
    onPointerDown: (event: React.PointerEvent<Element>) => {
      if (!shouldRunActionOnPointerDown(event)) {
        return;
      }

      event.preventDefault();
      touchPressSuppressClickUntilRef.current = Date.now() + TOUCH_CLICK_SUPPRESSION_MS;
      action();
    },
    onClick: (event: React.MouseEvent<Element>) => {
      if (shouldSuppressClick({ now: Date.now(), suppressUntil: touchPressSuppressClickUntilRef.current })) {
        event.preventDefault();
        return;
      }

      action();
    },
  });

  // Mixer & FX States
  const [mixerA, setMixerA] = useState(createMixerKnobState);
  const [fxA, setFxA] = useState(createFxKnobState);
  const [mixerB, setMixerB] = useState(createMixerKnobState);
  const [fxB, setFxB] = useState(createFxKnobState);
  const [deckVolumesA, setDeckVolumesA] = useState(() => createDeckVolumeGroups(80));
  const [deckVolumesB, setDeckVolumesB] = useState(() => createDeckVolumeGroups(80));
  const [levelTargetA, setLevelTargetA] = useState<'master' | 'cues' | 'pads'>('master');
  const [levelTargetB, setLevelTargetB] = useState<'master' | 'cues' | 'pads'>('master');
  const [selectedHotCueA, setSelectedHotCueA] = useState(0);
  const [selectedHotCueB, setSelectedHotCueB] = useState(0);
  const [padModeA, setPadModeA] = useState<'hotCue' | 'padFx' | 'sample'>('hotCue');
  const [padModeB, setPadModeB] = useState<'hotCue' | 'padFx' | 'sample'>('hotCue');
  const [hotCueBankA, setHotCueBankA] = useState<'cue1' | 'cue2'>('cue1');
  const [hotCueBankB, setHotCueBankB] = useState<'cue1' | 'cue2'>('cue1');
  const [padFxBankA, setPadFxBankA] = useState<'fx1' | 'fx2'>('fx1');
  const [padFxBankB, setPadFxBankB] = useState<'fx1' | 'fx2'>('fx1');
  const [sampleBankA, setSampleBankA] = useState<'s1' | 's2' | 's3'>('s1');
  const [sampleBankB, setSampleBankB] = useState<'s1' | 's2' | 's3'>('s1');
  const [activePadFxA, setActivePadFxA] = useState<string | null>(null);
  const [activePadFxB, setActivePadFxB] = useState<string | null>(null);
  const [activeSampleA, setActiveSampleA] = useState<string | null>(null);
  const [activeSampleB, setActiveSampleB] = useState<string | null>(null);
  const [loopStateA, setLoopStateA] = useState(createLoopState);
  const [loopStateB, setLoopStateB] = useState(createLoopState);
  const [cueStateA, setCueStateA] = useState(createCueState);
  const [cueStateB, setCueStateB] = useState(createCueState);
  const [hotCuePadsA, setHotCuePadsA] = useState(createHotCueBanks);
  const [hotCuePadsB, setHotCuePadsB] = useState(createHotCueBanks);

  const cycleMode = (current: string, direction: number) => {
    const idx = panelModes.indexOf(current);
    const nextIdx = (idx + direction + panelModes.length) % panelModes.length;
    return panelModes[nextIdx];
  };

  const levelControlA = {
    value: getLevelSliderValue({ groups: deckVolumesA, target: levelTargetA }),
    onChange: (nextValue: number) => {
      setDeckVolumesA((prev) => setLevelSliderValue({ groups: prev, target: levelTargetA, nextValue }));
    },
  };

  const levelControlB = {
    value: getLevelSliderValue({ groups: deckVolumesB, target: levelTargetB }),
    onChange: (nextValue: number) => {
      setDeckVolumesB((prev) => setLevelSliderValue({ groups: prev, target: levelTargetB, nextValue }));
    },
  };

  const ensureAudioContext = () => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const webAudioWindow = window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext,
    };
    const AudioContextClass = webAudioWindow.AudioContext || webAudioWindow.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  };

  const ensureDeckAudioGraph = (deck: 'A' | 'B', audio: HTMLAudioElement | null) => {
    const existingGraph = deckAudioGraphRef.current[deck];

    if (existingGraph || !audio) {
      return existingGraph;
    }

    const context = ensureAudioContext();

    if (!context) {
      return null;
    }

    const graph = createDeckEqGraph({ context, audio });
    deckAudioGraphRef.current[deck] = graph;
    audio.volume = 1;

    return graph;
  };

  const ensureLoopCoverAudio = (deck: 'A' | 'B') => {
    const track = deck === 'A' ? trackA : trackB;

    if (!track?.src) {
      return null;
    }

    let coverAudio = loopCoverAudioRef.current[deck];

    if (!coverAudio || coverAudio.src !== new URL(track.src, window.location.href).href) {
      if (loopCoverTimeoutRef.current[deck] != null) {
        window.clearTimeout(loopCoverTimeoutRef.current[deck] as number);
        loopCoverTimeoutRef.current[deck] = null;
      }

      loopCoverSourceRef.current[deck]?.disconnect();
      loopCoverSourceRef.current[deck] = null;
      coverAudio?.pause();

      coverAudio = new Audio(track.src);
      coverAudio.preload = 'auto';
      loopCoverAudioRef.current[deck] = coverAudio;
      coverAudio.load();
    }

    const graph = deckAudioGraphRef.current[deck];
    const context = audioContextRef.current;

    if (graph && context && !loopCoverSourceRef.current[deck]) {
      const coverSource = context.createMediaElementSource(coverAudio);
      coverSource.connect(graph.lowFilter);
      loopCoverSourceRef.current[deck] = coverSource;
      coverAudio.volume = 1;
    }

    return coverAudio;
  };

  const coverLoopSeekGap = (deck: 'A' | 'B', wrapTime: number) => {
    const mainAudio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const coverAudio = ensureLoopCoverAudio(deck);

    if (!mainAudio || !coverAudio || !Number.isFinite(wrapTime)) {
      return;
    }

    if (loopCoverTimeoutRef.current[deck] != null) {
      window.clearTimeout(loopCoverTimeoutRef.current[deck] as number);
      loopCoverTimeoutRef.current[deck] = null;
    }

    coverAudio.pause();
    coverAudio.currentTime = Math.max(wrapTime, 0);
    coverAudio.playbackRate = mainAudio.playbackRate;
    void coverAudio.play().catch(() => {});

    loopCoverTimeoutRef.current[deck] = window.setTimeout(() => {
      coverAudio.pause();
      loopCoverTimeoutRef.current[deck] = null;
    }, LOOP_SEEK_COVER_MS);
  };

  const getDeckMixerState = (deck: 'A' | 'B') => (deck === 'A' ? mixerA : mixerB);
  const getDeckFxState = (deck: 'A' | 'B') => (deck === 'A' ? fxA : fxB);

  const handleFxKnobChange = (
    deck: 'A' | 'B',
    effectType: 'filter' | 'echo' | 'reverb',
    knobValue: number,
  ) => {
    const graph = deckAudioGraphRef.current[deck];
    const contextTime = audioContextRef.current?.currentTime ?? 0;
    const nextValue = knobValueToFxValue(knobValue);
    const updateFx = deck === 'A' ? setFxA : setFxB;

    updateFx((prev) => {
      const nextFx = {
        ...prev,
        [effectType]: nextValue,
      };

      applyDeckFxValues({ graph, fx: nextFx, contextTime });
      return nextFx;
    });
  };

  const getDeckTrackGain = (deck: 'A' | 'B') => {
    if (selectedMonitorDeck === deck) {
      return 0;
    }

    const gains = getDeckMixGains({
      crossfader,
      levelA: deckVolumesA.track,
      levelB: deckVolumesB.track,
    });

    return deck === 'A' ? gains.deckA : gains.deckB;
  };

  const applyDeckOutputGain = (deck: 'A' | 'B') => {
    const gain = getDeckTrackGain(deck);
    const context = audioContextRef.current;
    const graph = deckAudioGraphRef.current[deck];
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const loopCoverAudio = loopCoverAudioRef.current[deck];

    if (selectedMonitorDeck === deck && loopCoverAudio) {
      loopCoverAudio.pause();
      loopCoverAudio.volume = 0;
    } else if (loopCoverAudio) {
      loopCoverAudio.volume = graph ? 1 : gain;
    }

    if (graph && context) {
      graph.outputGain.gain.setTargetAtTime(gain, context.currentTime, 0.01);
      return;
    }

    if (audio) {
      audio.volume = gain;
    }
  };

  const getDeckMonitorSnapshot = (deck: 'A' | 'B') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const track = deck === 'A' ? trackA : trackB;
    const playbackRate = deck === 'A' ? playbackRateA : playbackRateB;

    return {
      deck,
      track,
      currentTime: audio?.currentTime ?? (deck === 'A' ? audioStateA.currentTime : audioStateB.currentTime),
      playbackRate,
      isPlaying: Boolean(audio && !audio.paused),
    };
  };

  const sendMonitorMessage = (message: unknown) => {
    const socket = monitorSocketRef.current;

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  };

  const sendDeckMonitorLoad = (deck: 'A' | 'B') => {
    sendMonitorMessage(createDeckLoadMessage(getDeckMonitorSnapshot(deck)));
  };

  const sendDeckMonitorPlayback = (
    deck: 'A' | 'B',
    action: 'play' | 'pause' | 'seek' | 'rate',
    overrides: { currentTime?: number; playbackRate?: number } = {},
  ) => {
    const snapshot = getDeckMonitorSnapshot(deck);

    sendMonitorMessage(createDeckPlaybackMessage({
      deck,
      action,
      currentTime: overrides.currentTime ?? snapshot.currentTime,
      playbackRate: overrides.playbackRate ?? snapshot.playbackRate,
    }));
  };

  const sendSelectedMonitorSync = () => {
    if (!selectedMonitorDeck) {
      return;
    }

    const snapshot = getDeckMonitorSnapshot(selectedMonitorDeck);

    sendMonitorMessage(createMonitorSyncMessage({
      selectedDeck: selectedMonitorDeck,
      ...snapshot,
    }));
  };

  monitorSyncRef.current = sendSelectedMonitorSync;

  const handleMonitorDeckSelect = (deck: 'A' | 'B') => {
    const nextDeck = getNextMonitorDeckSelection(selectedMonitorDeck, deck) as 'A' | 'B' | null;

    setSelectedMonitorDeck(nextDeck);

    if (nextDeck == null) {
      sendMonitorMessage(createMonitorClearMessage());
      return;
    }

    sendMonitorMessage(createMonitorSelectMessage(nextDeck));
    sendMonitorMessage(createDeckLoadMessage(getDeckMonitorSnapshot(nextDeck)));
  };

  const openMonitorWindow = () => {
    window.open('/monitor', 'flowdj-monitor', 'noopener,noreferrer');
  };

  const handleTempoFaderChange = (deck: 'A' | 'B', sliderValue: number) => {
    const tempoPercent = getTempoPercentFromSliderValue(sliderValue);
    const nextPlaybackRate = getPlaybackRateFromTempoPercent(tempoPercent);
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;

    if (audio) {
      audio.playbackRate = nextPlaybackRate;
    }

    applyDeckOutputGain(deck);

    if (deck === 'A') {
      setPlaybackRateA(nextPlaybackRate);
      sendDeckMonitorPlayback(deck, 'rate', { playbackRate: nextPlaybackRate });
      return;
    }

    setPlaybackRateB(nextPlaybackRate);
    sendDeckMonitorPlayback(deck, 'rate', { playbackRate: nextPlaybackRate });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    let reconnectTimer: number | null = null;
    let isClosed = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/flowdj-monitor?role=controller`);
      monitorSocketRef.current = socket;

      socket.addEventListener('open', () => {
        setMonitorStatus((prev) => ({
          ...prev,
          connected: true,
        }));
        if (selectedMonitorDeck) {
          sendMonitorMessage(createMonitorSelectMessage(selectedMonitorDeck));
          sendSelectedMonitorSync();
        } else {
          sendMonitorMessage(createMonitorClearMessage());
        }
      });

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'monitor-status') {
            setMonitorStatus({
              connected: true,
              monitors: Number(message.monitors ?? 0),
            });

            if (Number(message.monitors ?? 0) > 0) {
              if (selectedMonitorDeck) {
                sendMonitorMessage(createMonitorSelectMessage(selectedMonitorDeck));
                sendSelectedMonitorSync();
              } else {
                sendMonitorMessage(createMonitorClearMessage());
              }
            }
          }
        } catch {
          // Ignore non-protocol messages from browser extensions or proxies.
        }
      });

      socket.addEventListener('close', () => {
        if (monitorSocketRef.current === socket) {
          monitorSocketRef.current = null;
        }

        setMonitorStatus((prev) => ({
          ...prev,
          connected: false,
        }));

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

      monitorSocketRef.current?.close();
      monitorSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      monitorSyncRef.current?.();
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        monitorSyncRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const updateCrossfaderMetrics = () => {
      setCrossfaderMetrics({
        trackWidth: crossfaderRef.current?.clientWidth ?? 0,
        handleWidth: crossfaderHandleRef.current?.offsetWidth ?? 0,
      });
    };

    updateCrossfaderMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateCrossfaderMetrics();
    });

    if (crossfaderRef.current) {
      resizeObserver.observe(crossfaderRef.current);
    }

    if (crossfaderHandleRef.current) {
      resizeObserver.observe(crossfaderHandleRef.current);
    }

    window.addEventListener('resize', updateCrossfaderMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCrossfaderMetrics);
    };
  }, []);

  useEffect(() => {
    const cachedAnalysis = getInitialAnalysisCache();

    const analyzeTrack = async (track: Track) => {
      setWaveformLibrary((prev) => ({
        ...prev,
        [track.id]: {
          ...(prev[track.id] ?? defaultWaveformState),
          status: 'loading',
        },
      }));

      try {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const analysis = await analyzeTrackWaveform(track.src, undefined, { includeKey: false });
        const nextEntry = buildTrackAnalysisEntry(track, analysis);
        const displayPeaks = shapeWaveformForDisplay(analysis.peaks);

        setWaveformLibrary((prev) => ({
          ...prev,
          [track.id]: {
            peaks: analysis.peaks,
            displayPeaks,
            duration: analysis.duration,
            beatOffset: analysis.beatOffset ?? 0,
            status: 'ready',
          },
        }));
        setLibraryTracks((prev) => updateTrackInLibrary(prev, track.id, {
          duration: formatClock(analysis.duration),
          bpm: analysis.bpm,
          key: analysis.key ?? track.key,
        }));
        saveTrackAnalysisCache(getBrowserStorage(), {
          ...loadTrackAnalysisCache(getBrowserStorage()),
          [track.id]: nextEntry,
        });
      } catch {
        setWaveformLibrary((prev) => ({
          ...prev,
          [track.id]: {
            ...(prev[track.id] ?? defaultWaveformState),
            status: 'error',
          },
        }));
      }
    };

    [trackA, trackB].filter(Boolean).forEach((track) => {
      if (analyzedTrackIdsRef.current.has(track.id)) {
        return;
      }

      if (cachedAnalysis[track.id] && Number.isFinite(cachedAnalysis[track.id].beatOffset)) {
        analyzedTrackIdsRef.current.add(track.id);
        const peaks = normalizeWaveformPeaks(cachedAnalysis[track.id].peaks, EMPTY_WAVEFORM_PEAKS.length);
        setWaveformLibrary((prev) => ({
          ...prev,
          [track.id]: {
            peaks,
            displayPeaks: shapeWaveformForDisplay(peaks),
            duration: cachedAnalysis[track.id].duration ?? 0,
            beatOffset: cachedAnalysis[track.id].beatOffset ?? 0,
            status: 'ready',
          },
        }));
        return;
      }

      analyzedTrackIdsRef.current.add(track.id);
      void analyzeTrack(track);
    });
  }, [trackA, trackB]);

  useEffect(() => {
    const syncDeck = (
      audio: HTMLAudioElement | null,
      trackId: string,
      setAudioState: React.Dispatch<React.SetStateAction<typeof defaultDeckAudioState>>,
      setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      if (!audio || !trackId) return () => {};

      const updateTime = () => {
        setAudioState((prev) => ({
          ...prev,
          currentTime: audio.currentTime,
          duration: Number.isFinite(audio.duration) ? audio.duration : prev.duration,
        }));
      };

      const updateMetadata = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;

        setAudioState((prev) => ({
          ...prev,
          duration,
          error: null,
        }));
        setLibraryTracks((prev) => updateTrackInLibrary(prev, trackId, { duration: formatClock(duration) }));
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setAudioState((prev) => ({ ...prev, error: null }));
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setAudioState((prev) => ({ ...prev, currentTime: 0 }));
      };

      const handleError = () => {
        setAudioState((prev) => ({
          ...prev,
          error: 'Audio failed to load',
        }));
        setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', updateMetadata);
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      updateMetadata();
      updateTime();

      return () => {
        audio.removeEventListener('loadedmetadata', updateMetadata);
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    };

    const cleanupA = syncDeck(audioRefA.current, trackAId, setAudioStateA, setIsPlayingA);
    const cleanupB = syncDeck(audioRefB.current, trackBId, setAudioStateB, setIsPlayingB);

    return () => {
      cleanupA();
      cleanupB();
    };
  }, [trackAId, trackBId]);

  useEffect(() => {
    let frameId = 0;
    let lastUiUpdateAt = 0;
    const uiUpdateIntervalMs = 180;

    const tick = (timestamp: number) => {
      if (audioRefA.current && !audioRefA.current.paused) {
        if (loopStateA.activeLoop && loopStateA.loopStart !== null && loopStateA.loopEnd !== null) {
          const wrapTime = getLoopPlaybackWrapTime({
            currentTime: audioRefA.current.currentTime,
            loopStart: loopStateA.loopStart,
            loopEnd: loopStateA.loopEnd,
          });

          if (wrapTime !== null) {
            coverLoopSeekGap('A', wrapTime);
            audioRefA.current.currentTime = wrapTime;
          }
        }
      }

      if (audioRefB.current && !audioRefB.current.paused) {
        if (loopStateB.activeLoop && loopStateB.loopStart !== null && loopStateB.loopEnd !== null) {
          const wrapTime = getLoopPlaybackWrapTime({
            currentTime: audioRefB.current.currentTime,
            loopStart: loopStateB.loopStart,
            loopEnd: loopStateB.loopEnd,
          });

          if (wrapTime !== null) {
            coverLoopSeekGap('B', wrapTime);
            audioRefB.current.currentTime = wrapTime;
          }
        }
      }

      if (timestamp - lastUiUpdateAt >= uiUpdateIntervalMs) {
        lastUiUpdateAt = timestamp;

        if (audioRefA.current && !audioRefA.current.paused) {
          setAudioStateA((prev) => ({
            ...prev,
            currentTime: audioRefA.current?.currentTime ?? prev.currentTime,
            duration: Number.isFinite(audioRefA.current?.duration) ? audioRefA.current.duration : prev.duration,
          }));
        }

        if (audioRefB.current && !audioRefB.current.paused) {
          setAudioStateB((prev) => ({
            ...prev,
            currentTime: audioRefB.current?.currentTime ?? prev.currentTime,
            duration: Number.isFinite(audioRefB.current?.duration) ? audioRefB.current.duration : prev.duration,
          }));
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [loopStateA.activeLoop, loopStateA.loopEnd, loopStateA.loopStart, loopStateB.activeLoop, loopStateB.loopEnd, loopStateB.loopStart]);
  useEffect(() => () => {
    localTrackUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    localTrackUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    const context = audioContextRef.current;
    const graphA = deckAudioGraphRef.current.A;
    const graphB = deckAudioGraphRef.current.B;

    if (graphA && context) {
      applyDeckEqValues({ graph: graphA, mixer: mixerA });
      applyDeckFxValues({ graph: graphA, fx: fxA, contextTime: context.currentTime });
      applyDeckOutputGain('A');
    } else if (audioRefA.current) {
      applyDeckOutputGain('A');
    }

    if (graphB && context) {
      applyDeckEqValues({ graph: graphB, mixer: mixerB });
      applyDeckFxValues({ graph: graphB, fx: fxB, contextTime: context.currentTime });
      applyDeckOutputGain('B');
    } else if (audioRefB.current) {
      applyDeckOutputGain('B');
    }
  }, [
    crossfader,
    deckVolumesA.track,
    deckVolumesB.track,
    mixerA.hi,
    mixerA.mid,
    mixerA.low,
    mixerB.hi,
    mixerB.mid,
    mixerB.low,
    fxA.filter,
    fxA.echo,
    fxA.reverb,
    fxB.filter,
    fxB.echo,
    fxB.reverb,
    selectedMonitorDeck,
    trackAId,
    trackBId,
  ]);

  useEffect(() => {
    if (audioRefA.current) {
      audioRefA.current.playbackRate = playbackRateA;
    }

    if (loopCoverAudioRef.current.A) {
      loopCoverAudioRef.current.A.playbackRate = playbackRateA;
    }
  }, [playbackRateA, trackAId]);

  useEffect(() => {
    if (audioRefB.current) {
      audioRefB.current.playbackRate = playbackRateB;
    }

    if (loopCoverAudioRef.current.B) {
      loopCoverAudioRef.current.B.playbackRate = playbackRateB;
    }
  }, [playbackRateB, trackBId]);

  useEffect(() => {
    const syncDeckSource = (
      audio: HTMLAudioElement | null,
      track: Track | null,
      setAudioState: React.Dispatch<React.SetStateAction<typeof defaultDeckAudioState>>,
      setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      if (!audio || !track?.src) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      audio.load();
      if (loopCoverTimeoutRef.current.A != null) {
        window.clearTimeout(loopCoverTimeoutRef.current.A);
        loopCoverTimeoutRef.current.A = null;
      }
      loopCoverAudioRef.current.A?.pause();
      loopCoverAudioRef.current.A = null;
      loopCoverSourceRef.current.A?.disconnect();
      loopCoverSourceRef.current.A = null;
      setIsPlaying(false);
      setAudioState({
        currentTime: 0,
        duration: 0,
        error: null,
      });
    };

    syncDeckSource(audioRefA.current, trackA, setAudioStateA, setIsPlayingA);
  }, [trackA?.src]);

  useEffect(() => {
    const syncDeckSource = (
      audio: HTMLAudioElement | null,
      track: Track | null,
      setAudioState: React.Dispatch<React.SetStateAction<typeof defaultDeckAudioState>>,
      setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      if (!audio || !track?.src) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      audio.load();
      if (loopCoverTimeoutRef.current.B != null) {
        window.clearTimeout(loopCoverTimeoutRef.current.B);
        loopCoverTimeoutRef.current.B = null;
      }
      loopCoverAudioRef.current.B?.pause();
      loopCoverAudioRef.current.B = null;
      loopCoverSourceRef.current.B?.disconnect();
      loopCoverSourceRef.current.B = null;
      setIsPlaying(false);
      setAudioState({
        currentTime: 0,
        duration: 0,
        error: null,
      });
    };

    syncDeckSource(audioRefB.current, trackB, setAudioStateB, setIsPlayingB);
  }, [trackB?.src]);

  useEffect(() => () => {
    const frameA = jogRotationFrameRef.current.A;
    const frameB = jogRotationFrameRef.current.B;

    if (frameA != null) {
      window.cancelAnimationFrame(frameA);
    }

    if (frameB != null) {
      window.cancelAnimationFrame(frameB);
    }
  }, []);

  useEffect(() => () => {
    const timeoutA = syncPressTimeoutRef.current.A;
    const timeoutB = syncPressTimeoutRef.current.B;
    const sampleTimeoutA = sampleTriggerTimeoutRef.current.A;
    const sampleTimeoutB = sampleTriggerTimeoutRef.current.B;

    if (timeoutA != null) {
      window.clearTimeout(timeoutA);
    }

    if (timeoutB != null) {
      window.clearTimeout(timeoutB);
    }

    if (sampleTimeoutA != null) {
      window.clearTimeout(sampleTimeoutA);
    }

    if (sampleTimeoutB != null) {
      window.clearTimeout(sampleTimeoutB);
    }

    if (loopCoverTimeoutRef.current.A != null) {
      window.clearTimeout(loopCoverTimeoutRef.current.A);
    }

    if (loopCoverTimeoutRef.current.B != null) {
      window.clearTimeout(loopCoverTimeoutRef.current.B);
    }

    activeSampleAudioRef.current.A.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    activeSampleAudioRef.current.B.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });

    loopCoverAudioRef.current.A?.pause();
    loopCoverAudioRef.current.B?.pause();

    loopCoverSourceRef.current.A?.disconnect();
    loopCoverSourceRef.current.B?.disconnect();
    deckAudioGraphRef.current.A?.outputGain.disconnect();
    deckAudioGraphRef.current.A?.reverbWetGain.disconnect();
    deckAudioGraphRef.current.A?.reverbDelay.disconnect();
    deckAudioGraphRef.current.A?.reverbFeedback.disconnect();
    deckAudioGraphRef.current.A?.echoWetGain.disconnect();
    deckAudioGraphRef.current.A?.echoDelay.disconnect();
    deckAudioGraphRef.current.A?.echoFeedback.disconnect();
    deckAudioGraphRef.current.A?.fxFilter.disconnect();
    deckAudioGraphRef.current.A?.highFilter.disconnect();
    deckAudioGraphRef.current.A?.midFilter.disconnect();
    deckAudioGraphRef.current.A?.lowFilter.disconnect();
    deckAudioGraphRef.current.A?.source.disconnect();
    deckAudioGraphRef.current.B?.outputGain.disconnect();
    deckAudioGraphRef.current.B?.reverbWetGain.disconnect();
    deckAudioGraphRef.current.B?.reverbDelay.disconnect();
    deckAudioGraphRef.current.B?.reverbFeedback.disconnect();
    deckAudioGraphRef.current.B?.echoWetGain.disconnect();
    deckAudioGraphRef.current.B?.echoDelay.disconnect();
    deckAudioGraphRef.current.B?.echoFeedback.disconnect();
    deckAudioGraphRef.current.B?.fxFilter.disconnect();
    deckAudioGraphRef.current.B?.highFilter.disconnect();
    deckAudioGraphRef.current.B?.midFilter.disconnect();
    deckAudioGraphRef.current.B?.lowFilter.disconnect();
    deckAudioGraphRef.current.B?.source.disconnect();

    void audioContextRef.current?.close();
  }, []);

  const toggleDeckPlayback = async (deck: 'A' | 'B') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;

    if (!audio) return;

    if (audio.paused) {
      try {
        const context = ensureAudioContext();
        const setAudioState = deck === 'A' ? setAudioStateA : setAudioStateB;

        setAudioState((prev) => ({ ...prev, error: null }));

        ensureDeckAudioGraph(deck, audio);

        if (context?.state === 'suspended') {
          await context.resume();
        }

        await waitForAudioReady(audio);

        const graph = ensureDeckAudioGraph(deck, audio);

        if (graph && context) {
          const mixer = deck === 'A' ? mixerA : mixerB;
          const fx = getDeckFxState(deck);
          applyDeckEqValues({ graph, mixer });
          applyDeckFxValues({ graph, fx, contextTime: context.currentTime });
          applyDeckOutputGain(deck);
        }

        await audio.play();
        sendDeckMonitorPlayback(deck, 'play', {
          currentTime: audio.currentTime,
          playbackRate: audio.playbackRate,
        });
      } catch (error) {
        const message = error instanceof Error && error.message === 'Audio load timed out'
          ? 'Audio is still loading. Try again in a moment.'
          : 'Audio failed to load or playback was blocked';

        if (deck === 'A') {
          setAudioStateA((prev) => ({ ...prev, error: message }));
        } else {
          setAudioStateB((prev) => ({ ...prev, error: message }));
        }
      }
      return;
    }

    audio.pause();
    sendDeckMonitorPlayback(deck, 'pause', {
      currentTime: audio.currentTime,
    });
  };

  const getDeckDuration = (deck: 'A' | 'B') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const audioState = deck === 'A' ? audioStateA : audioStateB;
    const track = deck === 'A' ? trackA : trackB;
    const waveform = waveformLibrary[track?.id ?? ''];

    return audio?.duration || audioState.duration || waveform?.duration || 0;
  };

  const updateDeckPlaybackTime = (deck: 'A' | 'B', nextTime: number) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setAudioState = deck === 'A' ? setAudioStateA : setAudioStateB;
    const duration = getDeckDuration(deck);

    if (!audio || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const clampedTime = clampJogTime(nextTime, duration);
    audio.currentTime = clampedTime;
    setAudioState((prev) => ({
      ...prev,
      currentTime: clampedTime,
      duration: Number.isFinite(duration) ? duration : prev.duration,
    }));
    sendDeckMonitorPlayback(deck, 'seek', { currentTime: clampedTime });
  };

  const seekDeckFromHorizontalPointer = (
    deck: 'A' | 'B',
    pointerX: number,
    bounds: DOMRect,
  ) => {
    const duration = getDeckDuration(deck);

    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const nextTime = getSeekTimeFromHorizontalPointer({
      pointerX,
      left: bounds.left,
      width: bounds.width,
      duration,
    });

    updateDeckPlaybackTime(deck, nextTime);
  };

  const scrubDeckFromVerticalPointer = (
    deck: 'A' | 'B',
    currentY: number,
  ) => {
    const duration = getDeckDuration(deck);

    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const nextTime = getScrubbedTimeFromVerticalDrag({
      startTime: verticalWaveformDragRef.current[deck].startTime,
      startY: verticalWaveformDragRef.current[deck].startY,
      currentY,
      duration,
    });

    updateDeckPlaybackTime(deck, nextTime);
  };

  const getPointerAngleForJogWheel = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const orbitBounds = event.currentTarget.getBoundingClientRect();

    if (!orbitBounds) {
      return null;
    }

    return getPointerAngleDegrees({
      centerX: orbitBounds.left + orbitBounds.width / 2,
      centerY: orbitBounds.top + orbitBounds.height / 2,
      pointerX: event.clientX,
      pointerY: event.clientY,
    });
  };

  const handleJogWheelPointerDown = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const duration = getDeckDuration(deck);
    const startAngleDeg = getPointerAngleForJogWheel(event);

    if (!audio || !Number.isFinite(duration) || duration <= 0 || startAngleDeg == null) {
      return;
    }

    const wasPlaying = !audio.paused;

    jogDotDragRef.current[deck] = {
      pointerId: event.pointerId,
      lastAngleDeg: startAngleDeg,
      wasPlaying,
    };

    if (deck === 'A') {
      setIsJogDotDraggingA(true);
    } else {
      setIsJogDotDraggingB(true);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleJogWheelPointerMove = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      jogDotDragRef.current[deck].pointerId !== event.pointerId
    ) {
      return;
    }

    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const duration = getDeckDuration(deck);
    const nextAngleDeg = getPointerAngleForJogWheel(event);

    if (!audio || !Number.isFinite(duration) || duration <= 0 || nextAngleDeg == null) {
      return;
    }

    const deltaAngle = getShortestAngleDelta(jogDotDragRef.current[deck].lastAngleDeg, nextAngleDeg);
    const setJogRotation = deck === 'A' ? setJogRotationA : setJogRotationB;

    setJogRotation((prev) => (prev + deltaAngle + 360) % 360);
    updateDeckPlaybackTime(deck, audio.currentTime + deltaAngle * 0.01);
    jogDotDragRef.current[deck].lastAngleDeg = nextAngleDeg;
  };

  const handleJogWheelPointerEnd = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      jogDotDragRef.current[deck].pointerId !== event.pointerId
    ) {
      return;
    }

    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const wasPlaying = jogDotDragRef.current[deck].wasPlaying;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    jogDotDragRef.current[deck] = {
      pointerId: null,
      lastAngleDeg: 0,
      wasPlaying: false,
    };

    if (deck === 'A') {
      setIsJogDotDraggingA(false);
    } else {
      setIsJogDotDraggingB(false);
    }

    if (wasPlaying && audio?.paused) {
      void audio.play().catch(() => {});
    }
  };

  const handleHorizontalWaveformPointerDown = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    horizontalWaveformDragRef.current[deck] = { pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    seekDeckFromHorizontalPointer(deck, event.clientX, event.currentTarget.getBoundingClientRect());
  };

  const handleHorizontalWaveformPointerMove = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      horizontalWaveformDragRef.current[deck].pointerId !== event.pointerId
    ) {
      return;
    }

    seekDeckFromHorizontalPointer(deck, event.clientX, event.currentTarget.getBoundingClientRect());
  };

  const handleHorizontalWaveformPointerEnd = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      horizontalWaveformDragRef.current[deck].pointerId !== event.pointerId
    ) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    horizontalWaveformDragRef.current[deck] = { pointerId: null };
  };

  const handleVerticalWaveformPointerDown = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    verticalWaveformDragRef.current[deck] = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTime: audio?.currentTime ?? 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleVerticalWaveformPointerMove = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      verticalWaveformDragRef.current[deck].pointerId !== event.pointerId
    ) {
      return;
    }

    scrubDeckFromVerticalPointer(deck, event.clientY);
  };

  const handleVerticalWaveformPointerEnd = (
    deck: 'A' | 'B',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      verticalWaveformDragRef.current[deck].pointerId !== event.pointerId
    ) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    verticalWaveformDragRef.current[deck] = {
      pointerId: null,
      startY: 0,
      startTime: 0,
    };
  };

  const handlePadFxPress = (deck: 'A' | 'B', padId: string) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setActivePadFx = deck === 'A' ? setActivePadFxA : setActivePadFxB;
    const playbackRate = deck === 'A' ? playbackRateA : playbackRateB;
    const context = ensureAudioContext();
    const graph = ensureDeckAudioGraph(deck, audio);

    setActivePadFx(padId);
    if (context?.state === 'suspended') {
      void context.resume();
    }

    activePadFxRuntimeRef.current[deck] = applyPadFx({
      padId,
      audio,
      graph,
      mixer: getDeckMixerState(deck),
      playbackRate,
      contextTime: context?.currentTime ?? 0,
    });
  };

  const handlePadFxRelease = (deck: 'A' | 'B', padId: string) => {
    const setActivePadFx = deck === 'A' ? setActivePadFxA : setActivePadFxB;
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const context = audioContextRef.current;
    const graph = deckAudioGraphRef.current[deck];
    const activeEffect = activePadFxRuntimeRef.current[deck];
    const playbackRate = deck === 'A' ? playbackRateA : playbackRateB;
    const fx = getDeckFxState(deck);

    if (activeEffect?.padId !== padId) {
      return;
    }

    clearPadFx({
      effectState: activeEffect,
      audio,
      graph,
      mixer: getDeckMixerState(deck),
      playbackRate,
      contextTime: context?.currentTime ?? 0,
    });
    applyDeckFxValues({ graph, fx, contextTime: context?.currentTime ?? 0 });
    applyDeckOutputGain(deck);
    activePadFxRuntimeRef.current[deck] = null;
    setActivePadFx(null);
  };

  const handleSampleTrigger = (deck: 'A' | 'B', sample) => {
    const setActiveSample = deck === 'A' ? setActiveSampleA : setActiveSampleB;
    const currentTimeout = sampleTriggerTimeoutRef.current[deck];

    if (currentTimeout != null) {
      window.clearTimeout(currentTimeout);
    }

    setActiveSample(sample.id);
    sampleTriggerTimeoutRef.current[deck] = window.setTimeout(() => {
      setActiveSample((prev) => (prev === sample.id ? null : prev));
      sampleTriggerTimeoutRef.current[deck] = null;
    }, SAMPLE_TRIGGER_MS);

    const sampleAudio = new Audio(sample.src);
    sampleAudio.preload = 'auto';
    activeSampleAudioRef.current[deck].push(sampleAudio);

    const cleanup = () => {
      activeSampleAudioRef.current[deck] = activeSampleAudioRef.current[deck].filter((audioItem) => audioItem !== sampleAudio);
    };

    sampleAudio.addEventListener('ended', cleanup, { once: true });
    sampleAudio.addEventListener('error', cleanup, { once: true });

    void sampleAudio.play().catch(cleanup);
  };

  const handleLoopToggle = (deck: 'A' | 'B', loopId: 'loop4' | 'loop8') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setLoopState = deck === 'A' ? setLoopStateA : setLoopStateB;
    const duration = getDeckDuration(deck);
    const track = deck === 'A' ? trackA : trackB;
    const bpm = track?.bpm ?? (deck === 'A' ? effectiveBpmA : effectiveBpmB);
    const beatOffset = waveformLibrary[track?.id ?? '']?.beatOffset ?? 0;

    if (!audio) {
      return;
    }

    setLoopState((prev) => toggleLoopState({
      state: prev,
      loopId,
      currentTime: audio.currentTime,
      bpm,
      beatOffset,
      duration,
    }));
  };

  const toggleDeckCueSetMode = (deck: 'A' | 'B') => {
    const setCueState = deck === 'A' ? setCueStateA : setCueStateB;
    setCueState((prev) => toggleCueSetMode(prev));
  };

  const handleDeckCuePress = (deck: 'A' | 'B') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setCueState = deck === 'A' ? setCueStateA : setCueStateB;

    if (!audio) {
      return;
    }

    const cueState = deck === 'A' ? cueStateA : cueStateB;
    const action = getCueButtonAction({
      state: cueState,
    });

    if (action.type === 'assign') {
      setCueState(applyCueAssignment({
        state: cueState,
        currentTime: audio.currentTime,
      }));
      return;
    }

    if (action.type !== 'recall') {
      return;
    }

    audio.currentTime = action.cuePoint;
    audio.pause();
    sendDeckMonitorPlayback(deck, 'seek', { currentTime: action.cuePoint });
    sendDeckMonitorPlayback(deck, 'pause', { currentTime: action.cuePoint });
  };

  const handleDeckHotCuePress = async (deck: 'A' | 'B', padIndex: number) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const cueState = deck === 'A' ? cueStateA : cueStateB;
    const setCueState = deck === 'A' ? setCueStateA : setCueStateB;
    const hotCueBank = deck === 'A' ? hotCueBankA : hotCueBankB;
    const hotCuePads = deck === 'A' ? hotCuePadsA[hotCueBank] : hotCuePadsB[hotCueBank];
    const setHotCuePads = deck === 'A' ? setHotCuePadsA : setHotCuePadsB;
    const setSelectedHotCue = deck === 'A' ? setSelectedHotCueA : setSelectedHotCueB;
    const setAudioState = deck === 'A' ? setAudioStateA : setAudioStateB;

    if (!audio) {
      return;
    }

    const pad = hotCuePads[padIndex];

    if (!pad) {
      return;
    }

    const action = getHotCuePadAction({
      pad,
      isSetMode: cueState.isSetMode,
    });

    if (action.type === 'assign') {
      setHotCuePads((prev) => ({
        ...prev,
        [hotCueBank]: assignHotCuePad({
          pads: prev[hotCueBank],
          index: padIndex,
          currentTime: audio.currentTime,
        }),
      }));
      setSelectedHotCue(padIndex);

      if (cueState.isSetMode) {
        setCueState((prev) => ({
          ...prev,
          isSetMode: false,
        }));
      }
      return;
    }

    audio.currentTime = action.time;
    setAudioState((prev) => ({
      ...prev,
      currentTime: action.time,
    }));
    setSelectedHotCue(padIndex);
    sendDeckMonitorPlayback(deck, 'seek', { currentTime: action.time });

    if (action.shouldPlay && audio.paused) {
      try {
        await audio.play();
        sendDeckMonitorPlayback(deck, 'play', {
          currentTime: action.time,
          playbackRate: audio.playbackRate,
        });
      } catch {
        setAudioState((prev) => ({
          ...prev,
          error: 'Playback was blocked by the browser',
        }));
      }
    }
  };

  const openLibrary = (deck: 'A' | 'B') => {
    setLibraryDeck(deck);
  };

  const closeLibrary = () => {
    setLibraryDeck(null);
    setImportError(null);
  };

  const openTrackFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleImportTracks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setImportError(null);

    try {
      const supportedFiles = files.filter((file) => isSupportedAudioFile(file));
      const existingSignatures = new Set(
        libraryTracks
          .map((track) => track.fileSignature)
          .filter(Boolean),
      );
      const dedupedFiles = supportedFiles.filter((file) => !existingSignatures.has(getFileSignature(file)));

      if (supportedFiles.length === 0) {
        setImportError('No supported audio files were selected.');
        return;
      }

      if (dedupedFiles.length === 0) {
        setImportError('All selected tracks are already in the library.');
        return;
      }

      const importedResults = await Promise.all(
        dedupedFiles.map((file, index) => createLocalTrack(file, index)),
      );
      const importedTracks = importedResults.map((result) => result.track);

      importedTracks.forEach((track) => {
        if (track.url) {
          localTrackUrlsRef.current.add(track.url);
        }
      });

      setLibraryTracks((prev) => mergeImportedTracks(prev, importedTracks));

      if (dedupedFiles.length !== files.length) {
        setImportError('Some files were skipped because they were unsupported or already imported.');
      }
    } catch {
      setImportError('Failed to import one or more tracks.');
    } finally {
      event.target.value = '';
    }
  };

  const selectTrackForDeck = (deck: 'A' | 'B', trackId: string) => {
    const selectedTrack = findTrackById(libraryTracks, trackId);

    if (!selectedTrack) return;

    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setAudioState = deck === 'A' ? setAudioStateA : setAudioStateB;
    const setIsPlaying = deck === 'A' ? setIsPlayingA : setIsPlayingB;
    const setTrackId = deck === 'A' ? setTrackAId : setTrackBId;
    const setPlaybackRate = deck === 'A' ? setPlaybackRateA : setPlaybackRateB;
    const setCueState = deck === 'A' ? setCueStateA : setCueStateB;
    const setHotCuePads = deck === 'A' ? setHotCuePadsA : setHotCuePadsB;
    const setSelectedHotCue = deck === 'A' ? setSelectedHotCueA : setSelectedHotCueB;
    const setHotCueBank = deck === 'A' ? setHotCueBankA : setHotCueBankB;
    const setLoopState = deck === 'A' ? setLoopStateA : setLoopStateB;
    const setMixer = deck === 'A' ? setMixerA : setMixerB;
    const setFx = deck === 'A' ? setFxA : setFxB;
    const setActivePadFx = deck === 'A' ? setActivePadFxA : setActivePadFxB;
    const graph = deckAudioGraphRef.current[deck];
    const contextTime = audioContextRef.current?.currentTime ?? 0;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = 1;
    }

    setTrackId(selectedTrack.id);
    setPlaybackRate(1);
    setAudioState({ ...defaultDeckAudioState });
    setIsPlaying(false);
    setCueState(createCueState());
    setHotCuePads(createHotCueBanks());
    setHotCueBank('cue1');
    setSelectedHotCue(0);
    setLoopState(createLoopState());
    setMixer(createMixerKnobState());
    setFx(createFxKnobState());
    setActivePadFx(null);
    activePadFxRuntimeRef.current[deck] = null;

    if (graph) {
      const nextMixer = createMixerKnobState();
      const nextFx = createFxKnobState();
      applyDeckEqValues({ graph, mixer: nextMixer });
      applyDeckFxValues({ graph, fx: nextFx, contextTime });
    }

    sendMonitorMessage(createDeckLoadMessage({
      deck,
      track: selectedTrack,
      currentTime: 0,
      playbackRate: 1,
      isPlaying: false,
    }));
    closeLibrary();
  };

  const cueSetButtonClassName = (isSetMode: boolean) =>
    `${transportSecondaryButtonClassName} ${isSetMode ? 'bg-[#FFE2DE] ring-1 ring-[#FF3B30]/50 shadow-[0_0_16px_rgba(255,59,48,0.22),2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e]' : 'bg-[#D0D0D0]'}`;

  const cueRecallButtonClassName = (isCueSet: boolean, isSetMode: boolean) =>
    `${transportSecondaryButtonClassName} ${isCueSet ? 'bg-[#FFF1D6] text-[#8A5A00] ring-1 ring-[#FFB74D]/35 shadow-[0_0_7px_rgba(255,183,77,0.14),1px_2px_3px_rgba(42,42,42,0.24),-1px_-1px_2px_rgba(78,78,78,0.42)]' : 'bg-[#D0D0D0] text-[#3C3C3C]'} ${isSetMode ? 'scale-[0.98]' : ''}`;

  const syncDeckToOther = (targetDeck: 'A' | 'B') => {
    const sourceTrack = targetDeck === 'A' ? trackB : trackA;
    const targetTrack = targetDeck === 'A' ? trackA : trackB;
    const sourceBpm = targetDeck === 'A' ? effectiveBpmB : effectiveBpmA;
    const nextPlaybackRate = getSyncedPlaybackRate({
      sourceBpm,
      targetBaseBpm: targetTrack?.bpm ?? 0,
    });

    if (sourceTrack == null || targetTrack == null || nextPlaybackRate == null) {
      return;
    }

    if (targetDeck === 'A') {
      setPlaybackRateA(nextPlaybackRate);
    } else {
      setPlaybackRateB(nextPlaybackRate);
    }
  };

  const restoreDeckBpm = (deck: 'A' | 'B') => {
    const track = deck === 'A' ? trackA : trackB;

    if (track == null) {
      return;
    }

    if (deck === 'A') {
      setPlaybackRateA(1);
    } else {
      setPlaybackRateB(1);
    }
  };

  const clearSyncPressTimeout = (deck: 'A' | 'B') => {
    const timeoutId = syncPressTimeoutRef.current[deck];

    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
      syncPressTimeoutRef.current[deck] = null;
    }
  };

  const cancelSyncPress = (deck: 'A' | 'B') => {
    clearSyncPressTimeout(deck);
    syncPressStartedAtRef.current[deck] = 0;
    syncLongPressTriggeredRef.current[deck] = false;
  };

  const handleSyncPointerDown = (deck: 'A' | 'B') => {
    clearSyncPressTimeout(deck);
    syncPressStartedAtRef.current[deck] = Date.now();
    syncLongPressTriggeredRef.current[deck] = false;
    syncSuppressClickRef.current[deck] = false;

    syncPressTimeoutRef.current[deck] = window.setTimeout(() => {
      syncPressTimeoutRef.current[deck] = null;
      syncLongPressTriggeredRef.current[deck] = true;
      syncSuppressClickRef.current[deck] = true;
      restoreDeckBpm(deck);
    }, SYNC_LONG_PRESS_MS);
  };

  const handleSyncPointerUp = (deck: 'A' | 'B') => {
    const startedAt = syncPressStartedAtRef.current[deck];

    if (startedAt === 0) {
      return;
    }

    const durationMs = Date.now() - startedAt;
    const action = getSyncPressAction({ durationMs });

    clearSyncPressTimeout(deck);
    syncPressStartedAtRef.current[deck] = 0;

    if (action === 'restore' || syncLongPressTriggeredRef.current[deck]) {
      syncLongPressTriggeredRef.current[deck] = false;
      syncSuppressClickRef.current[deck] = true;
      return;
    }
  };

  const handleSyncClick = (deck: 'A' | 'B') => {
    if (syncSuppressClickRef.current[deck]) {
      syncSuppressClickRef.current[deck] = false;
      return;
    }

    syncDeckToOther(deck);
  };

  const updateCrossfaderFromPointer = (clientX: number) => {
    if (!crossfaderRef.current) return;

    const rect = crossfaderRef.current.getBoundingClientRect();
    setCrossfader(
      getCrossfaderValueFromPointer({
        pointerX: clientX,
        trackLeft: rect.left,
        trackWidth: rect.width,
        handleWidth: crossfaderMetrics.handleWidth,
      }),
    );
  };

  const handleCrossfaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsCrossfaderDragging(true);
    crossfaderPointerIdRef.current = e.pointerId;
    updateCrossfaderFromPointer(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCrossfaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCrossfaderDragging || crossfaderPointerIdRef.current !== e.pointerId) return;
    updateCrossfaderFromPointer(e.clientX);
  };

  const handleCrossfaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (crossfaderPointerIdRef.current !== e.pointerId) return;

    setIsCrossfaderDragging(false);
    crossfaderPointerIdRef.current = null;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const orange = "#FF9457";
  const blue = "#2E8DFF";
  const currentTimeA = formatClock(audioStateA.currentTime);
  const currentTimeB = formatClock(audioStateB.currentTime);
  const totalDurationA = trackA?.duration ?? '00:00';
  const totalDurationB = trackB?.duration ?? '00:00';
  const remainingTimeA = audioStateA.duration > 0 ? formatRemainingTime(audioStateA.currentTime, audioStateA.duration) : `-${totalDurationA}`;
  const remainingTimeB = audioStateB.duration > 0 ? formatRemainingTime(audioStateB.currentTime, audioStateB.duration) : `-${totalDurationB}`;
  const effectiveBpmA = (trackA?.bpm ?? 0) * playbackRateA;
  const effectiveBpmB = (trackB?.bpm ?? 0) * playbackRateB;
  const pitchPercentA = getTempoPercentFromPlaybackRate(playbackRateA);
  const pitchPercentB = getTempoPercentFromPlaybackRate(playbackRateB);
  const pitchFaderValueA = getSliderValueFromTempoPercent(pitchPercentA);
  const pitchFaderValueB = getSliderValueFromTempoPercent(pitchPercentB);
  const formatTempoPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const progressA = getWaveformProgress(audioStateA.currentTime, audioStateA.duration || waveformLibrary[trackA?.id ?? '']?.duration || 0);
  const progressB = getWaveformProgress(audioStateB.currentTime, audioStateB.duration || waveformLibrary[trackB?.id ?? '']?.duration || 0);
  const waveformA = trackA ? (waveformLibrary[trackA.id] ?? defaultWaveformState) : defaultWaveformState;
  const waveformB = trackB ? (waveformLibrary[trackB.id] ?? defaultWaveformState) : defaultWaveformState;
  const overviewPeaksA = useMemo(
    () => getDisplayedWaveformPeaks(waveformA.displayPeaks, 120),
    [waveformA.displayPeaks],
  );
  const overviewPeaksB = useMemo(
    () => getDisplayedWaveformPeaks(waveformB.displayPeaks, 120),
    [waveformB.displayPeaks],
  );
  const beatWindowSizeA = useMemo(
    () => getWaveformBeatWindowSize(
      waveformA.peaks.length,
      audioStateA.duration || waveformA.duration,
      effectiveBpmA,
      8,
      24,
      120,
    ),
    [waveformA.peaks.length, audioStateA.duration, waveformA.duration, effectiveBpmA],
  );
  const beatWindowSizeB = useMemo(
    () => getWaveformBeatWindowSize(
      waveformB.peaks.length,
      audioStateB.duration || waveformB.duration,
      effectiveBpmB,
      8,
      24,
      120,
    ),
    [waveformB.peaks.length, audioStateB.duration, waveformB.duration, effectiveBpmB],
  );
  const rawBeatWindowFrameA = useMemo(
    () => getPlaybackLineWaveformFrame(
      waveformA.displayPeaks,
      progressA,
      beatWindowSizeA,
    ),
    [waveformA.displayPeaks, progressA, beatWindowSizeA],
  );
  const rawBeatWindowFrameB = useMemo(
    () => getPlaybackLineWaveformFrame(
      waveformB.displayPeaks,
      progressB,
      beatWindowSizeB,
    ),
    [waveformB.displayPeaks, progressB, beatWindowSizeB],
  );
  const beatWindowFrameA = rawBeatWindowFrameA;
  const beatWindowFrameB = rawBeatWindowFrameB;
  const crossfaderHandleLeft = getCrossfaderHandleLeft({
    value: crossfader,
    trackWidth: crossfaderMetrics.trackWidth,
    handleWidth: crossfaderMetrics.handleWidth,
  });

  const hotCueButtons = [
    { id: 1, slot: '1', label: 'Hot Cue', color: '#FF3B7F', glow: 'rgba(255, 59, 127, 0.28)' },
    { id: 2, slot: '2', label: 'Hot Cue', color: '#2E8DFF', glow: 'rgba(46, 141, 255, 0.24)' },
    { id: 3, slot: '3', label: 'Hot Cue', color: '#7ED321', glow: 'rgba(126, 211, 33, 0.24)' },
    { id: 4, slot: '4', label: 'Hot Cue', color: '#A86BFF', glow: 'rgba(168, 107, 255, 0.24)' },
  ] as const;
  const padFxButtonsA = PAD_FX_BANKS[padFxBankA];
  const padFxButtonsB = PAD_FX_BANKS[padFxBankB];
  const sampleButtonsA = SAMPLE_BANKS[sampleBankA];
  const sampleButtonsB = SAMPLE_BANKS[sampleBankB];
  const hotCuesA = hotCueButtons.map((button, index) => ({
    ...button,
    ...hotCuePadsA[hotCueBankA][index],
    displayTime: hotCuePadsA[hotCueBankA][index]?.isSet && hotCuePadsA[hotCueBankA][index].time !== null
      ? formatClock(hotCuePadsA[hotCueBankA][index].time)
      : '--:--',
  }));
  const hotCuesB = hotCueButtons.map((button, index) => ({
    ...button,
    ...hotCuePadsB[hotCueBankB][index],
    displayTime: hotCuePadsB[hotCueBankB][index]?.isSet && hotCuePadsB[hotCueBankB][index].time !== null
      ? formatClock(hotCuePadsB[hotCueBankB][index].time)
      : '--:--',
  }));

  return (
    <div className={`${isIpadSafari ? 'ipad-safari-device' : ''} h-screen [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-[100svh] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:min-h-[100svh] w-screen flex flex-col bg-base-grey select-none overflow-hidden text-gray-900 font-sans relative`}>
      <div className="desktop-only fixed left-1/2 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-[80] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#2C2C2C]/95 px-2.5 py-2 shadow-[0_8px_22px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          {(['A', 'B'] as const).map((deck) => (
          <button
            key={deck}
            type="button"
              {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleMonitorDeckSelect(deck))}
              className={`h-10 min-w-[56px] rounded-xl px-3 text-[13px] font-black uppercase tracking-[0.12em] transition-all active:scale-95 ${
                selectedMonitorDeck === deck ? 'bg-[#D0D0D0] text-black shadow-[0_0_8px_rgba(255,255,255,0.18)]' : 'bg-white/10 text-white/60'
              }`}
              style={selectedMonitorDeck === deck ? { color: deck === 'A' ? orange : blue } : undefined}
              aria-pressed={selectedMonitorDeck === deck}
              aria-label={selectedMonitorDeck === deck ? `Turn deck ${deck} monitor off` : `Monitor deck ${deck}`}
            >
              {deck}
            </button>
          ))}
          <div
            className={`h-2.5 w-2.5 rounded-full ${monitorStatus.connected ? 'bg-[#7ED321] shadow-[0_0_6px_rgba(126,211,33,0.55)]' : 'bg-white/25'}`}
            title={monitorStatus.connected ? `${monitorStatus.monitors} monitor connected` : 'Monitor disconnected'}
          />
          <button
            type="button"
            {...getMultiTouchPressHandlers<HTMLButtonElement>(openMonitorWindow)}
            className="h-10 rounded-xl bg-white/10 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white/70 transition-all active:scale-95"
            aria-label="Open remote monitor page"
          >
            Open
          </button>
        </div>
      </div>

      {/* 1. Header: Song Information & Global Controls - Further shrunk height and updated color */}
      <header className="h-[72px] grid grid-cols-[1fr_auto_1fr] bg-[#3C3C3C] shrink-0 z-50 border-b border-white/10">
        {/* Deck A Section */}
        <div className="flex bg-[#3C3C3C] relative overflow-hidden group border-r border-white/5">
          {/* Artwork - Flush with top and left */}
          <button
            type="button"
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => openLibrary('A'))}
            className="h-full aspect-square relative shrink-0 cursor-pointer"
          >
            <img src={trackA?.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Artwork A" />
            {/* Library Icon - Bottom Left of artwork */}
            <span className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded bg-black/68 flex items-center justify-center text-white/70 shadow-[0_2px_5px_rgba(0,0,0,0.32)] border border-white/10">
              <ListMusic size={12} />
            </span>
          </button>

          {/* Info & Waveform Container */}
          <div className="flex-1 flex flex-col p-1.5 min-w-0">
            {/* Top Row: Title, Key, Time */}
            <div className="flex justify-between items-start mb-0">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <h2 className="text-white text-[11px] font-bold truncate leading-tight">{trackA?.title}</h2>
                <div className="px-1 py-0.5 bg-[#4cd964] text-white text-[8px] font-bold rounded-sm shrink-0">
                  {trackA?.key}
                </div>
              </div>
              <div className="text-white text-[12px] font-mono font-bold tracking-tighter">{remainingTimeA}</div>
            </div>
            
            {/* Artist Row */}
            <div className="mb-0.5">
              <p className="text-white/40 text-[8px] uppercase font-bold tracking-widest truncate">{trackA?.artist}</p>
            </div>
            
            {/* Waveform Area - Next to artwork */}
            <div className="flex-1 flex items-end pt-1">
              <div className="w-full h-7 opacity-95">
                <HorizontalWaveform
                  peaks={overviewPeaksA}
                  progress={progressA}
                  isAnalyzing={waveformA.status === 'loading'}
                  onPointerDown={(event) => handleHorizontalWaveformPointerDown('A', event)}
                  onPointerMove={(event) => handleHorizontalWaveformPointerMove('A', event)}
                  onPointerUp={(event) => handleHorizontalWaveformPointerEnd('A', event)}
                  onPointerCancel={(event) => handleHorizontalWaveformPointerEnd('A', event)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Control Section */}
        <div className="desktop-only flex-col items-center justify-center px-2 gap-1 bg-[#333] border-x border-white/10 relative">
          <div className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer group transition-all bg-[#D0D0D0] shadow-[0_2px_6px_rgba(0,0,0,0.3)] border border-white/20">
            <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full shadow-[0_0_10px_#FF3B30] group-hover:scale-110 transition-transform" />
          </div>

          <button className="w-6 h-6 rounded-full flex items-center justify-center text-[#3C3C3C] hover:text-[#3C3C3C]/80 transition-all bg-[#D0D0D0] shadow-[0_2px_6px_rgba(0,0,0,0.3)] border border-white/20 active:scale-95">
            <Settings size={12} />
          </button>
        </div>

        <div className="ipad-only items-center justify-center px-2 bg-[#333] border-x border-white/10 relative">
          <button
            type="button"
            {...getMultiTouchPressHandlers<HTMLButtonElement>(openMonitorWindow)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[#3C3C3C] hover:text-[#3C3C3C]/80 transition-all bg-[#D0D0D0] shadow-[0_2px_6px_rgba(0,0,0,0.3)] border border-white/20 active:scale-95 ${selectedMonitorDeck ? 'ring-1 ring-white/40' : ''}`}
            aria-label="Open remote monitor page"
            title={monitorStatus.connected ? `${monitorStatus.monitors} monitor connected` : 'Monitor disconnected'}
          >
            <Activity size={16} strokeWidth={2.4} />
            <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#333] ${monitorStatus.connected ? 'bg-[#7ED321] shadow-[0_0_8px_rgba(126,211,33,0.75)]' : 'bg-white/35'}`} />
          </button>
        </div>

        {/* Deck B Section */}
        <div className="flex flex-row-reverse bg-[#3C3C3C] relative overflow-hidden group border-l border-white/5">
          {/* Artwork - Flush with top and right */}
          <button
            type="button"
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => openLibrary('B'))}
            className="h-full aspect-square relative shrink-0 cursor-pointer"
          >
            <img src={trackB?.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Artwork B" />
            {/* Library Icon - Bottom Right of artwork */}
            <span className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded bg-black/68 flex items-center justify-center text-white/70 shadow-[0_2px_5px_rgba(0,0,0,0.32)] border border-white/10">
              <ListMusic size={12} />
            </span>
          </button>

          {/* Info & Waveform Container */}
          <div className="flex-1 flex flex-col p-1.5 min-w-0 text-right">
            {/* Top Row: Title, Key, Time */}
            <div className="flex flex-row-reverse justify-between items-start mb-0">
              <div className="flex flex-row-reverse items-baseline gap-1.5 min-w-0">
                <h2 className="text-white text-[11px] font-bold truncate leading-tight">{trackB?.title}</h2>
                <div className="px-1 py-0.5 bg-[#007aff] text-white text-[8px] font-bold rounded-sm shrink-0">
                  {trackB?.key}
                </div>
              </div>
              <div className="text-white text-[12px] font-mono font-bold tracking-tighter">{remainingTimeB}</div>
            </div>
            
            {/* Artist Row */}
            <div className="mb-0.5">
              <p className="text-white/40 text-[8px] uppercase font-bold tracking-widest truncate">{trackB?.artist}</p>
            </div>
            
            {/* Waveform Area - Next to artwork */}
            <div className="flex-1 flex items-end pt-1">
              <div className="w-full h-7 opacity-95">
                <HorizontalWaveform
                  peaks={overviewPeaksB}
                  progress={progressB}
                  isAnalyzing={waveformB.status === 'loading'}
                  onPointerDown={(event) => handleHorizontalWaveformPointerDown('B', event)}
                  onPointerMove={(event) => handleHorizontalWaveformPointerMove('B', event)}
                  onPointerUp={(event) => handleHorizontalWaveformPointerEnd('B', event)}
                  onPointerCancel={(event) => handleHorizontalWaveformPointerEnd('B', event)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* 2 & 3. Middle & Bottom Sections: Unified Grid with Spanning Waveforms */}
      <div className="flex-1 grid grid-cols-[72px_minmax(0,1fr)_220px_minmax(0,1fr)_72px] md:grid-cols-[80px_minmax(0,1fr)_244px_minmax(0,1fr)_80px] xl:grid-cols-[98px_1fr_312px_1fr_98px] grid-rows-[minmax(0,1fr)_252px] md:grid-rows-[minmax(0,1fr)_276px] xl:grid-rows-[minmax(0,1fr)_320px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:grid-rows-[minmax(0,1fr)_212px] gap-0 overflow-hidden">
        
        {/* Row 1: Side Panels, Deck Displays */}
        {/* Left Side Panel */}
        <div className="p-1.5 md:p-2 flex flex-col min-w-0 border-r border-black/5 border-b border-black/10 relative shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] overflow-hidden" style={{ backgroundColor: '#ADADAD' }}>
          {/* Mode Selector Header - Unified 2-Tier Layout */}
          <div className="flex flex-col border-b border-black/20 -mx-1.5 md:-mx-2 -mt-1.5 md:-mt-2 mb-1 bg-[#D0D0D0] overflow-hidden shrink-0">
            {/* Top Tier: Title (Fixed Height) */}
            <div className="h-6 md:h-7 flex items-center justify-center border-b border-black/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] md:tracking-widest text-black/80 whitespace-nowrap">{modeA}</div>
            </div>
            {/* Bottom Tier: Navigation Buttons (Fixed Height) */}
            <div className="h-6 md:h-7 flex">
              <button 
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setModeA(cycleMode(modeA, -1)))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] border-r border-black/10 active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-black/60 border-b-[4px] border-b-transparent" />
              </button>
              <button 
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setModeA(cycleMode(modeA, 1)))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/60 border-b-[4px] border-b-transparent" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-0 py-0 min-h-0 scale-[0.84] md:scale-[0.92] xl:scale-100 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:scale-[0.8] origin-center">
            {modeA === 'Mixer' && (
              <div className="flex flex-col items-center justify-center gap-[clamp(14px,2.8vh,30px)] py-[clamp(6px,1.6vh,18px)] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0">
                <Knob 
                  label="Hi" color="#95ED21" value={mixerA.hi} variant="gear" 
                  onChange={(val) => setMixerA(prev => ({ ...prev, hi: val }))} 
                />
                <Knob 
                  label="Mid" color="#ff8736" value={mixerA.mid} variant="gear" 
                  onChange={(val) => setMixerA(prev => ({ ...prev, mid: val }))} 
                />
                <Knob 
                  label="Low" color="#008cd3" value={mixerA.low} variant="gear" 
                  onChange={(val) => setMixerA(prev => ({ ...prev, low: val }))} 
                />
              </div>
            )}
            {modeA === 'FX' && (
              <div className="flex flex-col items-center justify-center gap-[clamp(14px,2.8vh,30px)] py-[clamp(6px,1.6vh,18px)] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0">
                <Knob 
                  label="Filter" color={orange} value={fxValueToKnobValue(fxA.filter)} valueLabel={`${Math.round(fxA.filter * 100)}%`} variant="gear" 
                  onChange={(val) => handleFxKnobChange('A', 'filter', val)} 
                />
                <Knob 
                  label="Echo" color={orange} value={fxValueToKnobValue(fxA.echo)} valueLabel={`${Math.round(fxA.echo * 100)}%`} variant="gear" 
                  onChange={(val) => handleFxKnobChange('A', 'echo', val)} 
                />
                <Knob 
                  label="Reverb" color={orange} value={fxValueToKnobValue(fxA.reverb)} valueLabel={`${Math.round(fxA.reverb * 100)}%`} variant="gear" 
                  onChange={(val) => handleFxKnobChange('A', 'reverb', val)} 
                />
              </div>
            )}
            {modeA === 'Level' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <VerticalFader 
                  value={levelControlA.value} color={orange} height="h-40" handleSize="sm" handleOrientation="horizontal"
                  onChange={levelControlA.onChange} 
                />
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setLevelTargetA((prev) => toggleLevelTarget(prev, 'cues')))}
                    className={`min-w-[46px] rounded-lg px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors ${levelTargetA === 'cues' ? 'text-white' : 'text-black/45 bg-white/20'}`}
                    style={levelTargetA === 'cues' ? { backgroundColor: orange, boxShadow: `0 0 12px ${orange}88` } : undefined}
                  >
                    Cue
                  </button>
                  <button
                    {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setLevelTargetA((prev) => toggleLevelTarget(prev, 'pads')))}
                    className={`min-w-[46px] rounded-lg px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors ${levelTargetA === 'pads' ? 'text-white' : 'text-black/45 bg-white/20'}`}
                    style={levelTargetA === 'pads' ? { backgroundColor: orange, boxShadow: `0 0 12px ${orange}88` } : undefined}
                  >
                    Pad
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deck Display A */}
        <div className="flex items-center justify-center relative overflow-hidden min-w-0 border-r border-black/5 border-b border-black/10 bg-[#D0D0D0] shadow-[1px_1px_2px_#b1b1b1,-1px_-1px_2px_#f1f1f1]">
          <DeckDisplay 
            color={orange} 
            active={isPlayingA} 
            bpm={effectiveBpmA} 
            tempoPercent={pitchPercentA}
            jogRotationDeg={jogRotationA}
            time={currentTimeA}
            duration={totalDurationA}
            progress={progressA}
            title={trackA?.title || ""} 
            artist={trackA?.artist || ""} 
            monitorDeck="A"
            isMonitorSelected={selectedMonitorDeck === 'A'}
            monitorPlacement="right"
            onMonitorToggle={() => handleMonitorDeckSelect('A')}
            isJogDragging={isJogDotDraggingA}
            onJogPointerDown={(event) => handleJogWheelPointerDown('A', event)}
            onJogPointerMove={(event) => handleJogWheelPointerMove('A', event)}
            onJogPointerUp={(event) => handleJogWheelPointerEnd('A', event)}
            onJogPointerCancel={(event) => handleJogWheelPointerEnd('A', event)}
          />
        </div>

        {/* Central Vertical Waveforms & VU Meters - Spanning 2 rows */}
        <div className="row-span-2 opz-panel flex overflow-hidden relative px-1.5 md:px-2 py-1 gap-1.5 md:gap-2.5 min-w-0 border-x border-black/5">
          <VerticalWaveform
            peaks={beatWindowFrameA.peaks}
            offset={beatWindowFrameA.offset}
            isAnalyzing={waveformA.status === 'loading'}
            onPointerDown={(event) => handleVerticalWaveformPointerDown('A', event)}
            onPointerMove={(event) => handleVerticalWaveformPointerMove('A', event)}
            onPointerUp={(event) => handleVerticalWaveformPointerEnd('A', event)}
            onPointerCancel={(event) => handleVerticalWaveformPointerEnd('A', event)}
          />
          <VerticalWaveform
            peaks={beatWindowFrameB.peaks}
            offset={beatWindowFrameB.offset}
            isAnalyzing={waveformB.status === 'loading'}
            onPointerDown={(event) => handleVerticalWaveformPointerDown('B', event)}
            onPointerMove={(event) => handleVerticalWaveformPointerMove('B', event)}
            onPointerUp={(event) => handleVerticalWaveformPointerEnd('B', event)}
            onPointerCancel={(event) => handleVerticalWaveformPointerEnd('B', event)}
          />
        </div>

        {/* Deck Display B */}
        <div className="flex items-center justify-center relative overflow-hidden min-w-0 border-l border-black/5 border-b border-black/10 bg-[#D0D0D0] shadow-[1px_1px_2px_#b1b1b1,-1px_-1px_2px_#f1f1f1]">
          <DeckDisplay 
            color={blue} 
            active={isPlayingB} 
            bpm={effectiveBpmB} 
            tempoPercent={pitchPercentB}
            jogRotationDeg={jogRotationB}
            time={currentTimeB}
            duration={totalDurationB}
            progress={progressB}
            title={trackB?.title || ""} 
            artist={trackB?.artist || ""} 
            monitorDeck="B"
            isMonitorSelected={selectedMonitorDeck === 'B'}
            monitorPlacement="left"
            onMonitorToggle={() => handleMonitorDeckSelect('B')}
            isJogDragging={isJogDotDraggingB}
            onJogPointerDown={(event) => handleJogWheelPointerDown('B', event)}
            onJogPointerMove={(event) => handleJogWheelPointerMove('B', event)}
            onJogPointerUp={(event) => handleJogWheelPointerEnd('B', event)}
            onJogPointerCancel={(event) => handleJogWheelPointerEnd('B', event)}
          />
        </div>

        {/* Right Side Panel */}
        <div className="p-1.5 md:p-2 flex flex-col min-w-0 border-l border-black/5 border-b border-black/10 relative shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] overflow-hidden" style={{ backgroundColor: '#ADADAD' }}>
          {/* Mode Selector Header - Unified 2-Tier Layout */}
          <div className="flex flex-col border-b border-black/20 -mx-1.5 md:-mx-2 -mt-1.5 md:-mt-2 mb-1 bg-[#D0D0D0] overflow-hidden shrink-0">
            {/* Top Tier: Title (Fixed Height) */}
            <div className="h-6 md:h-7 flex items-center justify-center border-b border-black/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] md:tracking-widest text-black/80 whitespace-nowrap">{modeB}</div>
            </div>
            {/* Bottom Tier: Navigation Buttons (Fixed Height) */}
            <div className="h-6 md:h-7 flex">
              <button 
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setModeB(cycleMode(modeB, -1)))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] border-r border-black/10 active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-black/60 border-b-[4px] border-b-transparent" />
              </button>
              <button 
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setModeB(cycleMode(modeB, 1)))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/60 border-b-[4px] border-b-transparent" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-0 py-0 min-h-0 scale-[0.84] md:scale-[0.92] xl:scale-100 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:scale-[0.8] origin-center">
            {modeB === 'Mixer' && (
              <div className="flex flex-col items-center justify-center gap-[clamp(14px,2.8vh,30px)] py-[clamp(6px,1.6vh,18px)] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0">
                <Knob 
                  label="Hi" color="#95ED21" value={mixerB.hi} variant="gear" 
                  onChange={(val) => setMixerB(prev => ({ ...prev, hi: val }))} 
                />
                <Knob 
                  label="Mid" color="#ff8736" value={mixerB.mid} variant="gear" 
                  onChange={(val) => setMixerB(prev => ({ ...prev, mid: val }))} 
                />
                <Knob 
                  label="Low" color="#008cd3" value={mixerB.low} variant="gear" 
                  onChange={(val) => setMixerB(prev => ({ ...prev, low: val }))} 
                />
              </div>
            )}
            {modeB === 'FX' && (
              <div className="flex flex-col items-center justify-center gap-[clamp(14px,2.8vh,30px)] py-[clamp(6px,1.6vh,18px)] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0">
                <Knob 
                  label="Filter" color={blue} value={fxValueToKnobValue(fxB.filter)} valueLabel={`${Math.round(fxB.filter * 100)}%`} variant="gear" 
                  onChange={(val) => handleFxKnobChange('B', 'filter', val)} 
                />
                <Knob 
                  label="Echo" color={blue} value={fxValueToKnobValue(fxB.echo)} valueLabel={`${Math.round(fxB.echo * 100)}%`} variant="gear" 
                  onChange={(val) => handleFxKnobChange('B', 'echo', val)} 
                />
                <Knob 
                  label="Reverb" color={blue} value={fxValueToKnobValue(fxB.reverb)} valueLabel={`${Math.round(fxB.reverb * 100)}%`} variant="gear" 
                  onChange={(val) => handleFxKnobChange('B', 'reverb', val)} 
                />
              </div>
            )}
            {modeB === 'Level' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <VerticalFader 
                  value={levelControlB.value} color={blue} height="h-40" handleSize="sm" handleOrientation="horizontal"
                  onChange={levelControlB.onChange} 
                />
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setLevelTargetB((prev) => toggleLevelTarget(prev, 'cues')))}
                    className={`min-w-[46px] rounded-lg px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors ${levelTargetB === 'cues' ? 'text-white' : 'text-black/45 bg-white/20'}`}
                    style={levelTargetB === 'cues' ? { backgroundColor: blue, boxShadow: `0 0 12px ${blue}88` } : undefined}
                  >
                    Cue
                  </button>
                  <button
                    {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setLevelTargetB((prev) => toggleLevelTarget(prev, 'pads')))}
                    className={`min-w-[46px] rounded-lg px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors ${levelTargetB === 'pads' ? 'text-white' : 'text-black/45 bg-white/20'}`}
                    style={levelTargetB === 'pads' ? { backgroundColor: blue, boxShadow: `0 0 12px ${blue}88` } : undefined}
                  >
                    Pad
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Pitch, Hot Cues */}
        {/* Pitch A with Integrated Sync */}
        <div className="opz-panel p-2 md:p-2.5 xl:p-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex flex-col items-center justify-between gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 min-w-0 border-r border-black/5" style={{ backgroundColor: '#ADADAD' }}>
          <div className="w-full max-w-[72px] md:max-w-[78px] xl:max-w-[86px] flex flex-col items-center gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1">
          <button
            type="button"
            onClick={() => handleSyncClick('A')}
            onPointerDown={() => handleSyncPointerDown('A')}
            onPointerUp={() => handleSyncPointerUp('A')}
            onPointerLeave={() => cancelSyncPress('A')}
            onPointerCancel={() => cancelSyncPress('A')}
            className="w-full py-1 md:py-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-xl neu-button text-[10px] xl:text-[11px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold uppercase text-deck-a shrink-0 tracking-[0.14em]"
          >
            Sync
          </button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[14px] md:text-[15px] xl:text-[16px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[12px] font-mono font-bold text-black/80">{effectiveBpmA.toFixed(1)}</div>
            <div className="text-[9px] md:text-[9.5px] xl:text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-mono font-semibold text-black/35">{formatTempoPercent(pitchPercentA)}</div>
          </div>
          </div>
          <div className="flex-1 flex items-center min-h-0 py-2 md:py-3 xl:py-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-1">
            <VerticalFader value={pitchFaderValueA} color={orange} height="h-44 md:h-48 xl:h-56" handleSize="sm" handleOrientation="horizontal" showCenterMarker onChange={(value) => handleTempoFaderChange('A', value)} />
          </div>
        </div>

        {/* Named Hot Cues A */}
        <div className="opz-panel p-1.5 md:p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1 flex flex-col gap-1 md:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-0.5 min-w-0 border-r border-black/5" style={{ backgroundColor: '#6C6C6C' }}>
          <div className="flex justify-between items-center shrink-0 gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 text-[10px] md:text-[11px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold uppercase tracking-[0.14em] md:tracking-[0.16em] flex-1 max-w-[280px] xl:max-w-[320px]">
              <button
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadModeA('hotCue'))}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeA === 'hotCue' ? 'text-white border-deck-a' : 'text-black/30 border-transparent'}`}
                style={padModeA === 'hotCue' ? { textShadow: '0 0 8px rgba(255, 148, 87, 0.85), 0 0 14px rgba(255, 148, 87, 0.45)' } : undefined}
              >
                Hot Cue
              </button>
              <button
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadModeA('padFx'))}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeA === 'padFx' ? 'text-white border-deck-a' : 'text-black/30 border-transparent'}`}
                style={padModeA === 'padFx' ? { textShadow: '0 0 8px rgba(255, 148, 87, 0.85), 0 0 14px rgba(255, 148, 87, 0.45)' } : undefined}
              >
                Pad FX
              </button>
              <button
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadModeA('sample'))}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeA === 'sample' ? 'text-white border-deck-a' : 'text-black/30 border-transparent'}`}
                style={padModeA === 'sample' ? { textShadow: '0 0 8px rgba(255, 148, 87, 0.85), 0 0 14px rgba(255, 148, 87, 0.45)' } : undefined}
              >
                Sample
              </button>
            </div>
            <div className="shrink-0 flex items-center gap-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-0.5">
              {padModeA === 'hotCue' && (
                <>
                  {(['cue1', 'cue2'] as const).map((bank) => (
                    <button
                      key={bank}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setHotCueBankA(bank))}
                      className={`px-1.5 md:px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-lg text-[8px] md:text-[9px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[7px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${hotCueBankA === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {padModeA === 'padFx' && (
                <>
                  {(['fx1', 'fx2'] as const).map((bank) => (
                    <button
                      key={bank}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadFxBankA(bank))}
                      className={`px-1.5 md:px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-lg text-[8px] md:text-[9px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[7px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${padFxBankA === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {padModeA === 'sample' && (
                <>
                  {(['s1', 's2', 's3'] as const).map((bank) => (
                    <button
                      key={bank}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setSampleBankA(bank))}
                      className={`px-1.5 md:px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-lg text-[8px] md:text-[9px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[7px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${sampleBankA === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            {padModeA === 'hotCue' && (
              <div className="h-full flex flex-col gap-1 md:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 min-h-0">
                <div className="grid grid-cols-4 gap-0.5 md:gap-1 min-h-0 flex-1">
                  {hotCuesA.map((cue, i) => (
                    <button
                      key={cue.id}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => void handleDeckHotCuePress('A', i))}
                      className="relative rounded-xl min-h-0 overflow-hidden border-2 flex flex-col justify-between p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-150 active:scale-[0.98]"
                      style={{
                        backgroundColor: cue.isSet ? '#D8D8D8' : '#D0D0D0',
                        borderColor: cue.isSet || selectedHotCueA === i ? cue.color : '#D0D0D0',
                        boxShadow: cue.isSet || selectedHotCueA === i
                          ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px ${cue.color}, 0 0 8px ${cue.glow}`
                          : `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(0,0,0,0.08), 0 0 6px ${cue.glow}`,
                        transform: selectedHotCueA === i ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                    >
                      <div
                        className="absolute left-1.5 top-1.5 rounded-md px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1.5 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 text-[12px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[10px] font-black leading-none transition-all duration-150"
                        style={{ backgroundColor: cue.color, color: '#111111' }}
                      >
                        {cue.slot}
                      </div>
                      {cue.isSet && (
                        <div className="absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/90 bg-black/55">
                          Set
                        </div>
                      )}
                      <div className="flex-1" />
                      <div className="space-y-1">
                        <div className="text-[18px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[15px] font-mono font-semibold tracking-tight text-[#5B5B5B]">{cue.displayTime}</div>
                        <div className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: cue.isSet || selectedHotCueA === i ? cue.color : '#5B5B5B' }}>{cue.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-0.5 md:gap-1 h-14 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-12 shrink-0">
                  {[
                    { id: 'loop4' as const, label: 'Loop 4' },
                    { id: 'loop8' as const, label: 'Loop 8' },
                  ].map((loop) => (
                    <button
                      key={loop.id}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleLoopToggle('A', loop.id))}
                      className="rounded-xl border-2 px-3 py-2 flex items-center justify-center text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-150 active:scale-[0.98]"
                      style={{
                        backgroundColor: loopStateA.activeLoop === loop.id ? '#D8D8D8' : '#D0D0D0',
                        borderColor: loopStateA.activeLoop === loop.id ? orange : '#D0D0D0',
                        boxShadow: loopStateA.activeLoop === loop.id
                          ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px ${orange}, 0 0 8px ${orange}44`
                          : `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(0,0,0,0.08)`,
                      }}
                    >
                      <span className="text-[12px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: loopStateA.activeLoop === loop.id ? orange : '#5B5B5B' }}>
                        {loop.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {padModeA === 'padFx' && (
              <div className="grid grid-cols-4 gap-0.5 md:gap-1 min-h-0 h-full">
                {padFxButtonsA.map((pad) => (
                  <button
                    key={pad.id}
                    onPointerDown={() => handlePadFxPress('A', pad.id)}
                    onPointerUp={() => handlePadFxRelease('A', pad.id)}
                    onPointerLeave={() => handlePadFxRelease('A', pad.id)}
                    onPointerCancel={() => handlePadFxRelease('A', pad.id)}
                    className="rounded-xl min-h-0 border-2 p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex flex-col justify-between text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                    style={{
                      backgroundColor: activePadFxA === pad.id ? '#DADADA' : '#D0D0D0',
                      borderColor: pad.accent,
                      boxShadow: activePadFxA === pad.id
                        ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${pad.accent}, 0 0 8px ${pad.accent}44`
                        : `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 4px rgba(0,0,0,0.08)`,
                      transform: activePadFxA === pad.id ? 'translateY(1px)' : 'translateY(0)',
                    }}
                  >
                    <div className="flex-1" />
                    <div className="leading-none space-y-1">
                      <div className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: pad.accent }}>{pad.label}</div>
                      <div className="text-[16px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[13px] font-mono font-semibold tracking-tight text-[#5B5B5B]">{pad.value}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {padModeA === 'sample' && (
              <div className="grid grid-cols-4 gap-0.5 md:gap-1 min-h-0 h-full">
                {sampleButtonsA.map((sample) => (
                  <button
                    key={sample.id}
                    {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleSampleTrigger('A', sample))}
                    className="rounded-xl min-h-0 border-2 p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex items-end justify-start text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                    style={{
                      backgroundColor: activeSampleA === sample.id ? '#DADADA' : '#D0D0D0',
                      borderColor: sample.accent,
                      boxShadow: activeSampleA === sample.id
                        ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${sample.accent}, 0 0 8px ${sample.accent}44`
                        : `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 4px rgba(0,0,0,0.08)`,
                      transform: activeSampleA === sample.id ? 'translateY(1px)' : 'translateY(0)',
                    }}
                  >
                    <span className="text-[12px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: sample.accent }}>{sample.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Central Column is spanned by the row-span-2 div above */}

        {/* Named Hot Cues B */}
        <div className="opz-panel p-1.5 md:p-2 flex flex-col gap-1 md:gap-1.5 min-w-0 border-l border-black/5" style={{ backgroundColor: '#6C6C6C' }}>
          <div className="flex justify-between items-center shrink-0 gap-1.5 md:gap-2">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] md:tracking-[0.16em] flex-1 max-w-[280px] xl:max-w-[320px]">
              <button
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadModeB('hotCue'))}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeB === 'hotCue' ? 'text-white border-deck-b' : 'text-black/30 border-transparent'}`}
                style={padModeB === 'hotCue' ? { textShadow: '0 0 5px rgba(46, 141, 255, 0.55)' } : undefined}
              >
                Hot Cue
              </button>
              <button
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadModeB('padFx'))}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeB === 'padFx' ? 'text-white border-deck-b' : 'text-black/30 border-transparent'}`}
                style={padModeB === 'padFx' ? { textShadow: '0 0 5px rgba(46, 141, 255, 0.55)' } : undefined}
              >
                Pad FX
              </button>
              <button
                {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadModeB('sample'))}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeB === 'sample' ? 'text-white border-deck-b' : 'text-black/30 border-transparent'}`}
                style={padModeB === 'sample' ? { textShadow: '0 0 5px rgba(46, 141, 255, 0.55)' } : undefined}
              >
                Sample
              </button>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {padModeB === 'hotCue' && (
                <>
                  {(['cue1', 'cue2'] as const).map((bank) => (
                    <button
                      key={bank}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setHotCueBankB(bank))}
                      className={`px-1.5 md:px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${hotCueBankB === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {padModeB === 'padFx' && (
                <>
                  {(['fx1', 'fx2'] as const).map((bank) => (
                    <button
                      key={bank}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setPadFxBankB(bank))}
                      className={`px-1.5 md:px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${padFxBankB === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {padModeB === 'sample' && (
                <>
                  {(['s1', 's2', 's3'] as const).map((bank) => (
                    <button
                      key={bank}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => setSampleBankB(bank))}
                      className={`px-1.5 md:px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${sampleBankB === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            {padModeB === 'hotCue' && (
              <div className="h-full flex flex-col gap-1 md:gap-1.5 min-h-0">
                <div className="grid grid-cols-4 gap-0.5 md:gap-1 min-h-0 flex-1">
                  {hotCuesB.map((cue, i) => (
                    <button
                      key={cue.id}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => void handleDeckHotCuePress('B', i))}
                      className="relative rounded-xl min-h-0 overflow-hidden border-2 flex flex-col justify-between p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-150 active:scale-[0.98]"
                      style={{
                        backgroundColor: cue.isSet ? '#D8D8D8' : '#D0D0D0',
                        borderColor: cue.isSet || selectedHotCueB === i ? cue.color : '#D0D0D0',
                        boxShadow: cue.isSet || selectedHotCueB === i
                          ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px ${cue.color}, 0 0 8px ${cue.glow}`
                          : `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(0,0,0,0.08), 0 0 6px ${cue.glow}`,
                        transform: selectedHotCueB === i ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                    >
                      <div
                        className="absolute left-1.5 top-1.5 rounded-md px-2 py-1 text-[12px] font-black leading-none transition-all duration-150"
                        style={{ backgroundColor: cue.color, color: '#111111' }}
                      >
                        {cue.slot}
                      </div>
                      {cue.isSet && (
                        <div className="absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/90 bg-black/55">
                          Set
                        </div>
                      )}
                      <div className="flex-1" />
                      <div className="space-y-1">
                        <div className="text-[18px] font-mono font-semibold tracking-tight text-[#5B5B5B]">{cue.displayTime}</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: cue.isSet || selectedHotCueB === i ? cue.color : '#5B5B5B' }}>{cue.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-0.5 md:gap-1 h-14 shrink-0">
                  {[
                    { id: 'loop4' as const, label: 'Loop 4' },
                    { id: 'loop8' as const, label: 'Loop 8' },
                  ].map((loop) => (
                    <button
                      key={loop.id}
                      {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleLoopToggle('B', loop.id))}
                      className="rounded-xl border-2 px-3 py-2 flex items-center justify-center text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-150 active:scale-[0.98]"
                      style={{
                        backgroundColor: loopStateB.activeLoop === loop.id ? '#D8D8D8' : '#D0D0D0',
                        borderColor: loopStateB.activeLoop === loop.id ? blue : '#D0D0D0',
                        boxShadow: loopStateB.activeLoop === loop.id
                          ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px ${blue}, 0 0 8px ${blue}44`
                          : `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(0,0,0,0.08)`,
                      }}
                    >
                      <span className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: loopStateB.activeLoop === loop.id ? blue : '#5B5B5B' }}>
                        {loop.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {padModeB === 'padFx' && (
              <div className="grid grid-cols-4 gap-0.5 md:gap-1 min-h-0 h-full">
                {padFxButtonsB.map((pad) => (
                  <button
                    key={pad.id}
                    onPointerDown={() => handlePadFxPress('B', pad.id)}
                    onPointerUp={() => handlePadFxRelease('B', pad.id)}
                    onPointerLeave={() => handlePadFxRelease('B', pad.id)}
                    onPointerCancel={() => handlePadFxRelease('B', pad.id)}
                    className="rounded-xl min-h-0 border-2 p-2 flex flex-col justify-between text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                    style={{
                      backgroundColor: activePadFxB === pad.id ? '#DADADA' : '#D0D0D0',
                      borderColor: pad.accent,
                      boxShadow: activePadFxB === pad.id
                        ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${pad.accent}, 0 0 8px ${pad.accent}44`
                        : `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 4px rgba(0,0,0,0.08)`,
                      transform: activePadFxB === pad.id ? 'translateY(1px)' : 'translateY(0)',
                    }}
                  >
                    <div className="flex-1" />
                    <div className="leading-none space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: pad.accent }}>{pad.label}</div>
                      <div className="text-[16px] font-mono font-semibold tracking-tight text-[#5B5B5B]">{pad.value}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {padModeB === 'sample' && (
              <div className="grid grid-cols-4 gap-0.5 md:gap-1 min-h-0 h-full">
                {sampleButtonsB.map((sample) => (
                  <button
                    key={sample.id}
                    {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleSampleTrigger('B', sample))}
                    className="rounded-xl min-h-0 border-2 p-2 flex items-end justify-start text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                    style={{
                      backgroundColor: activeSampleB === sample.id ? '#DADADA' : '#D0D0D0',
                      borderColor: sample.accent,
                      boxShadow: activeSampleB === sample.id
                        ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${sample.accent}, 0 0 8px ${sample.accent}44`
                        : `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 4px rgba(0,0,0,0.08)`,
                      transform: activeSampleB === sample.id ? 'translateY(1px)' : 'translateY(0)',
                    }}
                  >
                    <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: sample.accent }}>{sample.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pitch B with Integrated Sync */}
        <div className="opz-panel p-2 md:p-2.5 xl:p-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex flex-col items-center justify-between gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 min-w-0 border-l border-black/5" style={{ backgroundColor: '#ADADAD' }}>
          <div className="w-full max-w-[72px] md:max-w-[78px] xl:max-w-[86px] flex flex-col items-center gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1">
          <button
            type="button"
            onClick={() => handleSyncClick('B')}
            onPointerDown={() => handleSyncPointerDown('B')}
            onPointerUp={() => handleSyncPointerUp('B')}
            onPointerLeave={() => cancelSyncPress('B')}
            onPointerCancel={() => cancelSyncPress('B')}
            className="w-full py-1 md:py-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-xl neu-button text-[10px] xl:text-[11px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold uppercase text-deck-b shrink-0 tracking-[0.14em]"
          >
            Sync
          </button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[14px] md:text-[15px] xl:text-[16px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[12px] font-mono font-bold text-black/80">{effectiveBpmB.toFixed(1)}</div>
            <div className="text-[9px] md:text-[9.5px] xl:text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-mono font-semibold text-black/35">{formatTempoPercent(pitchPercentB)}</div>
          </div>
          </div>
          <div className="flex-1 flex items-center min-h-0 py-2 md:py-3 xl:py-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-1">
            <VerticalFader value={pitchFaderValueB} color={blue} height="h-44 md:h-48 xl:h-56" handleSize="sm" handleOrientation="horizontal" showCenterMarker onChange={(value) => handleTempoFaderChange('B', value)} />
          </div>
        </div>
      </div>

    {/* 4. Footer: Transport Controls & Crossfader - Updated button styles and shortened range */}
    <footer className={`ipad-transport-footer ${isIpadSafari ? 'ipad-safari-footer' : ''} h-20 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-[calc(104px+env(safe-area-inset-bottom))] grid grid-cols-[auto_1fr_auto] gap-0 items-center [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:items-start px-6 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-4 pt-0 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:pt-4 pb-[calc(env(safe-area-inset-bottom)+8px)] shrink-0 bg-[#3C3C3C] border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]`}>
        {/* Left Controls */}
        <div className="flex items-center gap-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5">
          <button 
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => void toggleDeckPlayback('A'))}
            className={transportPlayButtonClassName}
          >
            <PlayPauseIcon />
          </button>
          <button
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => toggleDeckCueSetMode('A'))}
            className={`${cueSetButtonClassName(cueStateA.isSetMode)} group`}
            aria-pressed={cueStateA.isSetMode}
            aria-label={cueStateA.isSetMode ? 'Deck A set mode armed' : 'Arm deck A cue set mode'}
          >
            <div className={`w-2.5 h-2.5 rounded-full transition-transform ${cueStateA.isSetMode ? 'bg-[#FF3B30] shadow-[0_0_7px_rgba(255,59,48,0.65)]' : 'bg-[#FF3B30] shadow-[0_0_5px_rgba(255,59,48,0.6)] group-hover:scale-110'}`} />
          </button>
          <button
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleDeckCuePress('A'))}
            className={cueRecallButtonClassName(cueStateA.isCueSet, cueStateA.isSetMode)}
            aria-pressed={cueStateA.isCueSet}
            aria-label={cueStateA.isCueSet ? 'Deck A cue point is set' : 'Deck A cue point is not set'}
          >
            <span className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold tracking-widest">CUE</span>
          </button>
        </div>

        {/* Center Crossfader Section */}
        <div className="flex items-center justify-center px-8 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:pt-1 relative h-full">
          <div className="flex items-center gap-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-2 w-full max-w-[280px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:max-w-[220px] h-10 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-12 relative">
            {/* Left Arrow Icon */}
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-white/20 border-b-[4px] border-b-transparent shrink-0" />
            
            {/* Inner Draggable Area */}
            <div
              ref={crossfaderRef}
              className="flex-1 h-full relative flex items-center touch-none cursor-ew-resize"
              onPointerDown={handleCrossfaderPointerDown}
	              onPointerMove={handleCrossfaderPointerMove}
	              onPointerUp={handleCrossfaderPointerUp}
	              onPointerCancel={handleCrossfaderPointerUp}
	            >
              {/* Track Line */}
              <div className="w-full h-[3px] bg-[#2a2a2a] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.05)]" />
              
              {/* Vertical Markers */}
              <div className="absolute inset-0 flex justify-between items-center pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[1.5px] h-4 bg-white/5" />
                ))}
              </div>
              
              {/* Draggable Handle - Redsigned to match FaderHandle.png */}
              <motion.div 
                ref={crossfaderHandleRef}
                style={{ left: crossfaderHandleLeft }}
                className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              >
                <FaderHandle color="#FF823C" orientation="vertical" size="md" />
              </motion.div>
            </div>

            {/* Right Arrow Icon */}
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white/20 border-b-[4px] border-b-transparent shrink-0" />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5">
          <button
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => handleDeckCuePress('B'))}
            className={cueRecallButtonClassName(cueStateB.isCueSet, cueStateB.isSetMode)}
            aria-pressed={cueStateB.isCueSet}
            aria-label={cueStateB.isCueSet ? 'Deck B cue point is set' : 'Deck B cue point is not set'}
          >
            <span className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold tracking-widest">CUE</span>
          </button>
          <button
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => toggleDeckCueSetMode('B'))}
            className={`${cueSetButtonClassName(cueStateB.isSetMode)} group`}
            aria-pressed={cueStateB.isSetMode}
            aria-label={cueStateB.isSetMode ? 'Deck B set mode armed' : 'Arm deck B cue set mode'}
          >
            <div className={`w-2.5 h-2.5 rounded-full transition-transform ${cueStateB.isSetMode ? 'bg-[#FF3B30] shadow-[0_0_7px_rgba(255,59,48,0.65)]' : 'bg-[#FF3B30] shadow-[0_0_5px_rgba(255,59,48,0.6)] group-hover:scale-110'}`} />
          </button>
          <button 
            {...getMultiTouchPressHandlers<HTMLButtonElement>(() => void toggleDeckPlayback('B'))}
            className={transportPlayButtonClassName}
          >
            <PlayPauseIcon />
          </button>
        </div>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={handleImportTracks}
      />
      <audio ref={audioRefA} preload="auto" src={trackA?.src} hidden />
      <audio ref={audioRefB} preload="auto" src={trackB?.src} hidden />
      <MusicLibraryModal
        deck={libraryDeck}
        isOpen={libraryDeck !== null}
        tracks={libraryTracks}
        currentTrackId={libraryDeck === 'A' ? trackA?.id ?? null : trackB?.id ?? null}
        importError={importError}
        onClose={closeLibrary}
        onAddTracks={openTrackFilePicker}
        onSelectTrack={(trackId) => {
          if (!libraryDeck) return;
          selectTrackForDeck(libraryDeck, trackId);
        }}
      />

    </div>
  );
}
