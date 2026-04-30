/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useRef, useState } from 'react';
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
  Pencil,
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
import { findTrackById, updateTrackInLibrary } from './library.js';
import { TRACK_LIBRARY } from './trackLibrary.js';
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
import { getDeckMixGains } from './mixer.js';
import { getSyncedPlaybackRate } from './sync.js';
import {
  getCrossfaderHandleLeft,
  getCrossfaderValueFromPointer,
  getVerticalFaderHandleBottom,
  getVerticalFaderValueFromPointer,
} from './crossfader.js';
import { getKnobValueFromHorizontalDrag } from './knob.js';

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
  "w-14 h-10 rounded-[12px] flex items-center justify-center border border-white/10 bg-[#D0D0D0] shadow-[-2px_-2px_4px_rgba(78,78,78,0.12),2px_2px_4px_rgba(42,42,42,0.35)] transition-transform duration-150 hover:scale-[1.02] active:scale-95 active:shadow-[inset_-2px_-2px_4px_rgba(78,78,78,0.12),inset_2px_2px_4px_rgba(42,42,42,0.3)]";
const orbitSpinClassName = 'motion-safe:animate-[spin_2s_linear_infinite]';
const defaultDeckAudioState = { currentTime: 0, duration: 0, error: null as string | null };
const defaultWaveformState = {
  peaks: EMPTY_WAVEFORM_PEAKS,
  displayPeaks: EMPTY_WAVEFORM_PEAKS,
  duration: 0,
  status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
};
const analysisWaveformPalette = {
  outer: '#1D6FFF',
  mid: '#C97A12',
  core: '#FFF5DD',
  spine: '#FFF9EA',
} as const;
const getBrowserStorage = () => (typeof window === 'undefined' ? undefined : window.localStorage);
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

const getVerticalWaveformBandGradientStops = (peaks: WaveformPoint[]) => {
  if (!peaks.length) {
    return [
      { offset: '0%', color: '#1D6FFF', opacity: 0.95 },
      { offset: '100%', color: '#1D6FFF', opacity: 0.95 },
    ];
  }

  return peaks.map((point, index) => {
    const offset = peaks.length === 1 ? '0%' : `${((index / (peaks.length - 1)) * 100).toFixed(2)}%`;
    const warmMix = Math.min(point.mid * 0.85 + point.high * 0.75, 1);
    const coolMix = Math.min(point.low * 1.15 + point.energy * 0.35, 1);
    const r = Math.round(25 + warmMix * 230);
    const g = Math.round(96 + point.energy * 90 + point.mid * 35);
    const b = Math.round(72 + coolMix * 175);
    const opacity = Number((0.74 + point.peak * 0.24).toFixed(3));

    return {
      offset,
      color: `rgb(${Math.min(r, 255)} ${Math.min(g, 255)} ${Math.min(b, 255)})`,
      opacity,
    };
  });
};

// --- UI Components ---

const Knob = ({ 
  label, 
  color = "white", 
  value = 50, 
  size = "sm", 
  variant = "standard", 
  onChange = (_val: number) => {} 
}: { 
  label: string; 
  color?: string; 
  value?: number; 
  size?: string; 
  variant?: string; 
  onChange?: (val: number) => void; 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startValue = useRef(0);
  const knobMetrics = size === 'sm'
    ? { shell: 46, labelClass: 'text-[8.5px]', dotOffsetY: 1.8 }
    : { shell: 58, labelClass: 'text-[9px]', dotOffsetY: 2.2 };
  const rotation = (value - 50) * 2.4;
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
    setIsDragging(true);
    startX.current = e.clientX;
    startValue.current = value;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    onChange(
      getKnobValueFromHorizontalDrag({
        startValue: startValue.current,
        startX: startX.current,
        currentX: e.clientX,
      }),
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDragging(false);
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
              className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.22)]"
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
          <div className="w-full h-full rounded-full bg-[#D0D0D0] relative flex items-center justify-center shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.4)] pointer-events-none">
            {/* Center-aligned indicator container */}
            <div
              className="absolute inset-0 flex items-start justify-center pt-2.5"
              style={{ transform: `rotate(${(value - 50) * 2.4}deg)` }}
            >
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
          </div>
        )}
      </div>
      <span className={`${knobMetrics.labelClass} font-bold uppercase tracking-widest text-black/85 pointer-events-none`}>{label}</span>
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
    <div className={`relative ${dims} bg-gradient-to-b from-[#F2F2F2] via-[#D0D0D0] to-[#B8B8B8] rounded-full border-[3px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden transition-transform active:scale-95`} style={{ borderColor: color }}>
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
}: { 
  value: number; 
  onChange?: (val: number) => void; 
  color?: string; 
  height?: string; 
  handleSize?: 'sm' | 'md' | 'lg';
  handleOrientation?: 'vertical' | 'horizontal';
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
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
    updateValueFromPointer(e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateValueFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);

    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
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
    >
      {/* Scale Lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-6 px-3 pointer-events-none opacity-10">
        {[...Array(11)].map((_, i) => (
          <div key={i} className={`w-full h-px ${i % 5 === 0 ? 'bg-white/40' : 'bg-white/20'}`} />
        ))}
      </div>
      
      <div ref={trackRef} className="w-[3px] h-full bg-black/40 rounded-full relative pointer-events-none shadow-inner">
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

const HorizontalWaveform = ({
  peaks,
  progress,
  isAnalyzing,
}: {
  peaks: WaveformPoint[],
  progress: number,
  isAnalyzing: boolean,
}) => {
  const width = 560;
  const height = 72;
  const basePolygon = `0,${height} ${buildWaveformPoints(peaks, 'peak', width, height, 0.035, 1.55)} ${width},${height}`;
  const innerPolygon = `0,${height} ${buildWaveformPoints(peaks, 'energy', width, height * 0.94, 0.015, 1.15)} ${width},${height}`;
  const spikePolyline = buildWaveformSpikePoints(peaks, width, height * 0.92);
  const playedWidth = Math.max(progress * width, 0);

  return (
    <div className="h-full w-full bg-black rounded-[3px] border border-white/10 overflow-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.24))]" />
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polygon points={basePolygon} fill={analysisWaveformPalette.outer} opacity="0.98" />
        <polygon points={innerPolygon} fill={analysisWaveformPalette.mid} opacity="0.92" />
        <polyline points={spikePolyline} fill="none" stroke={analysisWaveformPalette.core} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.98" />
      </svg>
      <div className="absolute top-0 bottom-0 w-[2px] bg-[#FF4A4A] z-10 shadow-[0_0_10px_rgba(255,74,74,0.45)]" style={{ left: `calc(${progress * 100}% - 1px)` }} />
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/45 bg-black/20">
          analyzing
        </div>
      )}
    </div>
  );
};

const VerticalWaveform = ({
  peaks,
  offset,
  isAnalyzing,
}: {
  peaks: WaveformPoint[],
  offset: number,
  isAnalyzing: boolean,
}) => {
  const rowStep = 10;
  const svgWidth = 164;
  const svgHeight = Math.max(peaks.length * rowStep, rowStep);
  const gradientUid = useId();
  const centerX = svgWidth / 2;
  const maxHalfWidth = svgWidth / 2;
  const splitIndex = Math.floor(peaks.length / 2);
  const playbackRowIndex = Math.min(splitIndex, Math.max(peaks.length - 1, 0));
  const pastPeaks = peaks.slice(0, playbackRowIndex + 1);
  const futurePeaks = peaks.slice(playbackRowIndex);
  const buildSegmentPaths = (segmentPeaks: WaveformPoint[]) => {
    const widths = segmentPeaks.map((point) => getWaveformBandWidths(point, maxHalfWidth));

    return {
      outer: buildVerticalWaveformLayerPath(widths.map((item) => item.outer), centerX, rowStep, 0.75),
      bass: buildVerticalWaveformLayerPath(widths.map((item) => Math.min(item.bass, item.outer * 0.34)), centerX, rowStep, 0.2),
      mid: buildVerticalWaveformLayerPath(widths.map((item) => Math.min(item.mid, item.outer * 0.72)), centerX, rowStep, 0.45),
      core: buildVerticalWaveformLayerPath(widths.map((item) => Math.min(item.core, item.mid * 0.58)), centerX, rowStep, 0.18),
    };
  };
  const pastPaths = buildSegmentPaths(pastPeaks);
  const futurePaths = buildSegmentPaths(futurePeaks);
  const spinePoints = peaks
    .map((point, index) => {
      const y = index * rowStep;
      const drift = (point.high - point.low) * (svgWidth * 0.028);
      return `${(svgWidth / 2 + drift).toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const gradientId = `vertical-waveform-${gradientUid.replace(/:/g, '')}`;
  const gradientStops = getVerticalWaveformBandGradientStops(peaks);
  const translateY = getVerticalWaveformTranslateY(playbackRowIndex, rowStep, offset);

  return (
    <div className="flex-1 h-full relative bg-black border-x border-white/5 overflow-hidden">
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none">
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#FF4A4A] shadow-[0_0_8px_rgba(255,74,74,0.35)]" />
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
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2={svgHeight} gradientUnits="userSpaceOnUse">
                {gradientStops.map((stop) => (
                  <stop
                    key={`${gradientId}-${stop.offset}`}
                    offset={stop.offset}
                    stopColor={stop.color}
                    stopOpacity={stop.opacity}
                  />
                ))}
              </linearGradient>
            </defs>
            <g>
              <path d={pastPaths.outer} fill={`url(#${gradientId})`} opacity="0.98" />
              <path d={pastPaths.bass} fill="#0D63FF" opacity="0.84" />
              <path d={pastPaths.mid} fill="#D58A18" opacity="0.94" />
              <path d={pastPaths.core} fill="#FFF4D9" opacity="0.99" />
            </g>
            <g transform={`translate(0 ${(playbackRowIndex * rowStep).toFixed(2)})`}>
              <path d={futurePaths.outer} fill={`url(#${gradientId})`} opacity="0.98" />
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
};

const DeckDisplay = ({
  color,
  active,
  bpm,
  time,
  duration,
  progress,
  title,
  artist,
}: {
  color: string,
  active: boolean,
  bpm: number,
  time: string,
  duration: string,
  progress: number,
  title: string,
  artist: string,
}) => {
  const orbitSize = 'clamp(172px, 21vw, 214px)';
  const orbitDotSize = 'clamp(14px, 1.8vw, 18px)';
  const orbitStartAngle = 45;
  const progressDashOffset = 304.7 * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full relative p-1 min-w-0">
      {/* Circular Data Meter - Enlarged by another 20% while keeping container height fixed */}
      <div className="relative w-[150px] h-[150px] md:w-[165px] md:h-[165px] xl:w-[185px] xl:h-[185px] rounded-full neu-convex border-[5px] xl:border-[6px] border-[#D1D1D1] flex flex-col items-center justify-center shadow-xl overflow-visible shrink-0">
      {/* Outer Orbit Track & Moving Dot */}
      <div
        className="absolute pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: orbitSize, height: orbitSize }}
      >
        <div className="absolute inset-0 rounded-full border-[2px]" style={{ borderColor: 'rgba(138, 138, 138, 0.5)' }} />
        <div
          className={`absolute inset-0 ${active ? orbitSpinClassName : ''}`}
          style={{ transformOrigin: '50% 50%' }}
        >
          <div
            className="absolute inset-0"
            style={{ transform: `rotate(${orbitStartAngle}deg)`, transformOrigin: '50% 50%' }}
          >
            <div
              className="absolute rounded-full left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: orbitDotSize,
                height: orbitDotSize,
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Inner Shadow Ring */}
      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.15)] pointer-events-none" />
      
      {/* Main BPM Display */}
      <div className="text-[28px] md:text-[32px] xl:text-[35px] font-mono font-bold leading-none tracking-tighter text-black/80">{bpm.toFixed(1)}</div>
      
      {/* Bottom Info Row (BPM Label, Pitch, Range) */}
      <div className="relative w-full flex items-center justify-center px-4 md:px-5 xl:px-6 mb-1 xl:mb-2">
        <div className="absolute left-2 md:left-3 text-[10px] md:text-[11px] xl:text-[12px] font-mono font-bold text-black/50">+0.0%</div>
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
        <motion.circle 
          cx="50" cy="50" r="48.5" 
          fill="none" stroke={color} strokeWidth="1.5" 
          strokeDasharray="304.7" 
          animate={{ strokeDashoffset: progressDashOffset }}
          strokeLinecap="round"
          className="transition-all duration-1000"
          style={{ rotate: -90, transformOrigin: '50% 50%' }}
        />
      </svg>
    </div>
    </div>
  );
};

const VUMeter = ({ color, active }: { color: string, active: boolean }) => (
  <div className="w-2 h-full bg-black/60 border-x border-white/5 relative overflow-hidden">
    <motion.div 
      className="absolute bottom-0 w-full"
      animate={{ height: active ? ["20%", "80%", "40%", "90%", "30%"] : "10%" }}
      transition={{ repeat: Infinity, duration: 0.2 }}
      style={{ 
        background: `linear-gradient(to top, #ff0000, ${color})`,
        boxShadow: active ? `0 0 10px ${color}` : 'none'
      }}
    />
  </div>
);

const MusicLibraryModal = ({
  deck,
  isOpen,
  tracks,
  currentTrackId,
  onClose,
  onSelectTrack,
}: {
  deck: 'A' | 'B' | null;
  isOpen: boolean;
  tracks: Track[];
  currentTrackId: string | null;
  onClose: () => void;
  onSelectTrack: (trackId: string) => void;
}) => {
  if (!isOpen || !deck) return null;

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#2E2E2E] shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#383838]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">Deck {deck}</div>
            <h2 className="text-white text-lg font-semibold">Music Library</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-full bg-white/8 text-white/75 text-xs font-bold uppercase tracking-[0.18em] hover:bg-white/12"
          >
            Close
          </button>
        </div>
        <div className="p-4 grid gap-3 max-h-[70vh] overflow-y-auto">
          {tracks.map((track) => {
            const isActive = currentTrackId === track.id;

            return (
              <button
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`w-full rounded-[22px] border text-left p-3 transition-all ${isActive ? 'border-white/50 bg-white/12' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-semibold truncate">{track.title}</div>
                        <div className="text-white/50 text-[11px] uppercase tracking-[0.16em] truncate">{track.artist}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-white/80 text-xs font-mono">{track.duration}</div>
                        <div className="text-white/35 text-[10px] font-bold uppercase tracking-[0.12em]">{track.bpm} BPM</div>
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
  const [libraryTracks, setLibraryTracks] = useState<Track[]>(() => hydrateTracksWithAnalysis(TRACK_LIBRARY, getInitialAnalysisCache()));
  const [trackAId, setTrackAId] = useState(TRACK_LIBRARY[0]?.id ?? '');
  const [trackBId, setTrackBId] = useState(TRACK_LIBRARY[1]?.id ?? TRACK_LIBRARY[0]?.id ?? '');
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [audioStateA, setAudioStateA] = useState(defaultDeckAudioState);
  const [audioStateB, setAudioStateB] = useState(defaultDeckAudioState);
  const [libraryDeck, setLibraryDeck] = useState<'A' | 'B' | null>(null);
  const [waveformLibrary, setWaveformLibrary] = useState<Record<string, typeof defaultWaveformState>>(getInitialWaveformLibrary);
  const [crossfader, setCrossfader] = useState(50);
  const [playbackRateA, setPlaybackRateA] = useState(1);
  const [playbackRateB, setPlaybackRateB] = useState(1);
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const crossfaderRef = useRef<HTMLDivElement>(null);
  const crossfaderHandleRef = useRef<HTMLDivElement>(null);
  const [isCrossfaderDragging, setIsCrossfaderDragging] = useState(false);
  const [crossfaderMetrics, setCrossfaderMetrics] = useState({ trackWidth: 0, handleWidth: 0 });
  const analyzedTrackIdsRef = useRef(new Set(Object.keys(getInitialAnalysisCache())));
  const [searchQuery, setSearchQuery] = useState('');
  const trackA = findTrackById(libraryTracks, trackAId);
  const trackB = findTrackById(libraryTracks, trackBId);
  
  const [modeA, setModeA] = useState('Mixer');
  const [modeB, setModeB] = useState('Mixer');
  const panelModes = ['FX', 'Mixer', 'Pads level'];

  // Mixer & FX States
  const [mixerA, setMixerA] = useState({ hi: 50, mid: 50, low: 50 });
  const [fxA, setFxA] = useState({ filter: 50, echo: 30, reverb: 60 });
  const [mixerB, setMixerB] = useState({ hi: 50, mid: 50, low: 50 });
  const [fxB, setFxB] = useState({ filter: 50, echo: 40, reverb: 20 });
  const [levelA, setLevelA] = useState(80);
  const [levelB, setLevelB] = useState(80);
  const [pitchA, setPitchA] = useState(50);
  const [pitchB, setPitchB] = useState(50);
  const [selectedHotCueA, setSelectedHotCueA] = useState(0);
  const [selectedHotCueB, setSelectedHotCueB] = useState(0);
  const [padModeA, setPadModeA] = useState<'hotCue' | 'padFx' | 'sample'>('hotCue');
  const [padModeB, setPadModeB] = useState<'hotCue' | 'padFx' | 'sample'>('hotCue');
  const [hotCueBankA, setHotCueBankA] = useState<'cue1' | 'cue2'>('cue1');
  const [hotCueBankB, setHotCueBankB] = useState<'cue1' | 'cue2'>('cue1');
  const [padFxBankA, setPadFxBankA] = useState<'fx1' | 'fx2'>('fx1');
  const [padFxBankB, setPadFxBankB] = useState<'fx1' | 'fx2'>('fx1');
  const [sampleBankA, setSampleBankA] = useState<'s1' | 's2'>('s1');
  const [sampleBankB, setSampleBankB] = useState<'s1' | 's2'>('s1');
  const [activePadFxA, setActivePadFxA] = useState<string | null>(null);
  const [activePadFxB, setActivePadFxB] = useState<string | null>(null);
  const [activeSampleA, setActiveSampleA] = useState<string | null>(null);
  const [activeSampleB, setActiveSampleB] = useState<string | null>(null);

  const cycleMode = (current: string, direction: number) => {
    const idx = panelModes.indexOf(current);
    const nextIdx = (idx + direction + panelModes.length) % panelModes.length;
    return panelModes[nextIdx];
  };

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
        const analysis = await analyzeTrackWaveform(track.src);
        const nextEntry = buildTrackAnalysisEntry(track, analysis);
        const displayPeaks = shapeWaveformForDisplay(analysis.peaks);

        setWaveformLibrary((prev) => ({
          ...prev,
          [track.id]: {
            peaks: analysis.peaks,
            displayPeaks,
            duration: analysis.duration,
            status: 'ready',
          },
        }));
        setLibraryTracks((prev) => updateTrackInLibrary(prev, track.id, {
          duration: formatClock(analysis.duration),
          bpm: analysis.bpm,
          key: analysis.key,
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

    libraryTracks.forEach((track) => {
      if (analyzedTrackIdsRef.current.has(track.id)) {
        return;
      }

      if (cachedAnalysis[track.id]) {
        analyzedTrackIdsRef.current.add(track.id);
        const peaks = normalizeWaveformPeaks(cachedAnalysis[track.id].peaks, EMPTY_WAVEFORM_PEAKS.length);
        setWaveformLibrary((prev) => ({
          ...prev,
          [track.id]: {
            peaks,
            displayPeaks: shapeWaveformForDisplay(peaks),
            duration: cachedAnalysis[track.id].duration ?? 0,
            status: 'ready',
          },
        }));
        return;
      }

      analyzedTrackIdsRef.current.add(track.id);
      void analyzeTrack(track);
    });
  }, [libraryTracks]);

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

    const tick = () => {
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

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const gains = getDeckMixGains({ crossfader, levelA, levelB });

    if (audioRefA.current) {
      audioRefA.current.volume = gains.deckA;
    }

    if (audioRefB.current) {
      audioRefB.current.volume = gains.deckB;
    }
  }, [crossfader, levelA, levelB, trackAId, trackBId]);

  useEffect(() => {
    if (audioRefA.current) {
      audioRefA.current.playbackRate = playbackRateA;
    }
  }, [playbackRateA, trackAId]);

  useEffect(() => {
    if (audioRefB.current) {
      audioRefB.current.playbackRate = playbackRateB;
    }
  }, [playbackRateB, trackBId]);

  const toggleDeckPlayback = async (deck: 'A' | 'B') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;

    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        if (deck === 'A') {
          setAudioStateA((prev) => ({ ...prev, error: 'Playback was blocked by the browser' }));
        } else {
          setAudioStateB((prev) => ({ ...prev, error: 'Playback was blocked by the browser' }));
        }
      }
      return;
    }

    audio.pause();
  };

  const openLibrary = (deck: 'A' | 'B') => {
    setLibraryDeck(deck);
  };

  const closeLibrary = () => {
    setLibraryDeck(null);
  };

  const selectTrackForDeck = (deck: 'A' | 'B', trackId: string) => {
    const selectedTrack = findTrackById(libraryTracks, trackId);

    if (!selectedTrack) return;

    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setAudioState = deck === 'A' ? setAudioStateA : setAudioStateB;
    const setIsPlaying = deck === 'A' ? setIsPlayingA : setIsPlayingB;
    const setTrackId = deck === 'A' ? setTrackAId : setTrackBId;
    const setPlaybackRate = deck === 'A' ? setPlaybackRateA : setPlaybackRateB;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = 1;
    }

    setTrackId(selectedTrack.id);
    setPlaybackRate(1);
    setAudioState({ ...defaultDeckAudioState });
    setIsPlaying(false);
    closeLibrary();
  };

  const syncDeckToOther = (targetDeck: 'A' | 'B') => {
    const sourceTrack = targetDeck === 'A' ? trackB : trackA;
    const targetTrack = targetDeck === 'A' ? trackA : trackB;
    const sourceIsPlaying = targetDeck === 'A' ? isPlayingB : isPlayingA;
    const sourceBpm = (targetDeck === 'A' ? effectiveBpmB : effectiveBpmA);
    const nextPlaybackRate = getSyncedPlaybackRate({
      sourceIsPlaying,
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
    updateCrossfaderFromPointer(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCrossfaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCrossfaderDragging) return;
    updateCrossfaderFromPointer(e.clientX);
  };

  const handleCrossfaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsCrossfaderDragging(false);

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
  const pitchPercentA = (playbackRateA - 1) * 100;
  const pitchPercentB = (playbackRateB - 1) * 100;
  const progressA = getWaveformProgress(audioStateA.currentTime, audioStateA.duration || waveformLibrary[trackA?.id ?? '']?.duration || 0);
  const progressB = getWaveformProgress(audioStateB.currentTime, audioStateB.duration || waveformLibrary[trackB?.id ?? '']?.duration || 0);
  const waveformA = trackA ? (waveformLibrary[trackA.id] ?? defaultWaveformState) : defaultWaveformState;
  const waveformB = trackB ? (waveformLibrary[trackB.id] ?? defaultWaveformState) : defaultWaveformState;
  const overviewPeaksA = getDisplayedWaveformPeaks(waveformA.displayPeaks, 120);
  const overviewPeaksB = getDisplayedWaveformPeaks(waveformB.displayPeaks, 120);
  const beatWindowSizeA = getWaveformBeatWindowSize(
    waveformA.peaks.length,
    audioStateA.duration || waveformA.duration,
    effectiveBpmA,
    8,
  );
  const beatWindowSizeB = getWaveformBeatWindowSize(
    waveformB.peaks.length,
    audioStateB.duration || waveformB.duration,
    effectiveBpmB,
    8,
  );
  const rawBeatWindowFrameA = getPlaybackLineWaveformFrame(
    waveformA.displayPeaks,
    progressA,
    beatWindowSizeA,
  );
  const rawBeatWindowFrameB = getPlaybackLineWaveformFrame(
    waveformB.displayPeaks,
    progressB,
    beatWindowSizeB,
  );
  const beatWindowFrameA = rawBeatWindowFrameA;
  const beatWindowFrameB = rawBeatWindowFrameB;
  const crossfaderHandleLeft = getCrossfaderHandleLeft({
    value: crossfader,
    trackWidth: crossfaderMetrics.trackWidth,
    handleWidth: crossfaderMetrics.handleWidth,
  });

  const hotCueBanks = {
    cue1: [
      { slot: 'A', name: 'Start', time: '00:03', color: '#FF3B7F', glow: 'rgba(255, 59, 127, 0.28)' },
      { slot: 'B', name: 'Intro', time: '00:20', color: '#2E8DFF', glow: 'rgba(46, 141, 255, 0.24)' },
      { slot: 'C', name: 'Build', time: '01:05', color: '#7ED321', glow: 'rgba(126, 211, 33, 0.24)' },
      { slot: 'D', name: 'Drop', time: '01:32', color: '#A86BFF', glow: 'rgba(168, 107, 255, 0.24)' },
    ],
    cue2: [
      { slot: 'E', name: 'Verse', time: '00:48', color: '#FF9457', glow: 'rgba(255, 148, 87, 0.28)' },
      { slot: 'F', name: 'Hook', time: '01:24', color: '#FFD24A', glow: 'rgba(255, 210, 74, 0.24)' },
      { slot: 'G', name: 'Break', time: '02:06', color: '#33D7FF', glow: 'rgba(51, 215, 255, 0.24)' },
      { slot: 'H', name: 'Outro', time: '03:12', color: '#47D61A', glow: 'rgba(71, 214, 26, 0.24)' },
    ],
  } as const;
  const padFxBanks = {
    fx1: [
      { id: 'roll-half', label: 'Roll', value: '1/2', accent: '#33D7FF' },
      { id: 'sweep-80', label: 'Sweep', value: '80', accent: '#31D8D0' },
      { id: 'flanger-16', label: 'Flanger', value: '16', accent: '#23D2C3' },
      { id: 'vbrake-three-quarter', label: 'V.Brake', value: '3/4', accent: '#2E5EFF' },
    ],
    fx2: [
      { id: 'echo-quarter', label: 'Echo', value: '1/4', accent: '#41B5FF' },
      { id: 'echo-half', label: 'Echo', value: '1/2', accent: '#3AA8FF' },
      { id: 'reverb-60', label: 'Reverb', value: '60', accent: '#47D61A' },
      { id: 'r-echo-half', label: 'R.Echo', value: '1/2', accent: '#3852FF' },
    ],
  } as const;
  const sampleBanks = {
    s1: [
      { id: 'kick', label: 'Kick', accent: '#FF9457' },
      { id: 'snare', label: 'Snare', accent: '#FF3B7F' },
      { id: 'clap', label: 'Clap', accent: '#2E8DFF' },
      { id: 'vox', label: 'Vox', accent: '#7ED321' },
    ],
    s2: [
      { id: 'hat', label: 'Hat', accent: '#FFD24A' },
      { id: 'perc', label: 'Perc', accent: '#33D7FF' },
      { id: 'ride', label: 'Ride', accent: '#A86BFF' },
      { id: 'bass', label: 'Bass', accent: '#47D61A' },
    ],
  } as const;
  const padFxButtonsA = padFxBanks[padFxBankA];
  const padFxButtonsB = padFxBanks[padFxBankB];
  const sampleButtonsA = sampleBanks[sampleBankA];
  const sampleButtonsB = sampleBanks[sampleBankB];
  const hotCuesA = hotCueBanks[hotCueBankA];
  const hotCuesB = hotCueBanks[hotCueBankB];

  return (
    <div className="h-screen [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-[100svh] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:min-h-[100svh] w-screen flex flex-col bg-base-grey select-none overflow-hidden text-gray-900 font-sans relative">
      
      {/* 1. Header: Song Information & Global Controls - Further shrunk height and updated color */}
      <header className="h-[72px] grid grid-cols-[1fr_auto_1fr] bg-[#3C3C3C] shrink-0 z-50 border-b border-white/10">
        {/* Deck A Section */}
        <div className="flex bg-[#3C3C3C] relative overflow-hidden group border-r border-white/5">
          {/* Artwork - Flush with top and left */}
          <button
            type="button"
            onClick={() => openLibrary('A')}
            className="h-full aspect-square relative shrink-0 cursor-pointer"
          >
            <img src={trackA?.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Artwork A" />
            {/* Library Icon - Bottom Left of artwork */}
            <span className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 shadow-lg border border-white/10">
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
                <HorizontalWaveform peaks={overviewPeaksA} progress={progressA} isAnalyzing={waveformA.status === 'loading'} />
              </div>
            </div>
          </div>
        </div>

        {/* Center Control Section */}
        <div className="flex flex-col items-center justify-center px-2 gap-1 bg-[#333] border-x border-white/10 relative">
          {/* Record Button */}
          <div className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer group transition-all bg-[#D0D0D0] shadow-[0_2px_6px_rgba(0,0,0,0.3)] border border-white/20">
            <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full shadow-[0_0_10px_#FF3B30] group-hover:scale-110 transition-transform" />
          </div>
          
          {/* Settings Button */}
          <button className="w-6 h-6 rounded-full flex items-center justify-center text-[#3C3C3C] hover:text-[#3C3C3C]/80 transition-all bg-[#D0D0D0] shadow-[0_2px_6px_rgba(0,0,0,0.3)] border border-white/20 active:scale-95">
            <Settings size={12} />
          </button>
        </div>

        {/* Deck B Section */}
        <div className="flex flex-row-reverse bg-[#3C3C3C] relative overflow-hidden group border-l border-white/5">
          {/* Artwork - Flush with top and right */}
          <button
            type="button"
            onClick={() => openLibrary('B')}
            className="h-full aspect-square relative shrink-0 cursor-pointer"
          >
            <img src={trackB?.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Artwork B" />
            {/* Library Icon - Bottom Right of artwork */}
            <span className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 shadow-lg border border-white/10">
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
                <HorizontalWaveform peaks={overviewPeaksB} progress={progressB} isAnalyzing={waveformB.status === 'loading'} />
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* 2 & 3. Middle & Bottom Sections: Unified Grid with Spanning Waveforms */}
      <div className="flex-1 grid grid-cols-[72px_minmax(0,1fr)_220px_minmax(0,1fr)_72px] md:grid-cols-[80px_minmax(0,1fr)_244px_minmax(0,1fr)_80px] xl:grid-cols-[98px_1fr_312px_1fr_98px] grid-rows-[minmax(0,1fr)_252px] md:grid-rows-[minmax(0,1fr)_276px] xl:grid-rows-[minmax(0,1fr)_320px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:grid-rows-[minmax(0,1fr)_224px] gap-0 overflow-hidden">
        
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
                onClick={() => setModeA(cycleMode(modeA, -1))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] border-r border-black/10 active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-black/60 border-b-[4px] border-b-transparent" />
              </button>
              <button 
                onClick={() => setModeA(cycleMode(modeA, 1))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/60 border-b-[4px] border-b-transparent" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-0 py-0 min-h-0 scale-[0.84] md:scale-[0.92] xl:scale-100 origin-center">
            {modeA === 'Mixer' && (
              <>
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
              </>
            )}
            {modeA === 'FX' && (
              <>
                <Knob 
                  label="Filter" color={orange} value={fxA.filter} variant="gear" 
                  onChange={(val) => setFxA(prev => ({ ...prev, filter: val }))} 
                />
                <Knob 
                  label="Echo" color={orange} value={fxA.echo} variant="gear" 
                  onChange={(val) => setFxA(prev => ({ ...prev, echo: val }))} 
                />
                <Knob 
                  label="Reverb" color={orange} value={fxA.reverb} variant="gear" 
                  onChange={(val) => setFxA(prev => ({ ...prev, reverb: val }))} 
                />
              </>
            )}
            {modeA === 'Pads level' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <VerticalFader 
                  value={levelA} color={orange} height="h-40" handleSize="sm" handleOrientation="horizontal"
                  onChange={setLevelA} 
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-black/70">Level</span>
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
            time={currentTimeA}
            duration={totalDurationA}
            progress={progressA}
            title={trackA?.title || ""} 
            artist={trackA?.artist || ""} 
          />
        </div>

        {/* Central Vertical Waveforms & VU Meters - Spanning 2 rows */}
        <div className="row-span-2 opz-panel flex overflow-hidden relative px-1.5 md:px-2 py-1 gap-1.5 md:gap-2.5 min-w-0 border-x border-black/5">
          <VerticalWaveform peaks={beatWindowFrameA.peaks} offset={beatWindowFrameA.offset} isAnalyzing={waveformA.status === 'loading'} />
          <VUMeter color={orange} active={isPlayingA} />
          <VUMeter color={blue} active={isPlayingB} />
          <VerticalWaveform peaks={beatWindowFrameB.peaks} offset={beatWindowFrameB.offset} isAnalyzing={waveformB.status === 'loading'} />
        </div>

        {/* Deck Display B */}
        <div className="flex items-center justify-center relative overflow-hidden min-w-0 border-l border-black/5 border-b border-black/10 bg-[#D0D0D0] shadow-[1px_1px_2px_#b1b1b1,-1px_-1px_2px_#f1f1f1]">
          <DeckDisplay 
            color={blue} 
            active={isPlayingB} 
            bpm={effectiveBpmB} 
            time={currentTimeB}
            duration={totalDurationB}
            progress={progressB}
            title={trackB?.title || ""} 
            artist={trackB?.artist || ""} 
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
                onClick={() => setModeB(cycleMode(modeB, -1))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] border-r border-black/10 active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-black/60 border-b-[4px] border-b-transparent" />
              </button>
              <button 
                onClick={() => setModeB(cycleMode(modeB, 1))}
                className="flex-1 flex items-center justify-center bg-[#D0D0D0] hover:bg-[#D8D8D8] active:shadow-inner transition-all"
              >
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/60 border-b-[4px] border-b-transparent" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-0 py-0 min-h-0 scale-[0.84] md:scale-[0.92] xl:scale-100 origin-center">
            {modeB === 'Mixer' && (
              <>
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
              </>
            )}
            {modeB === 'FX' && (
              <>
                <Knob 
                  label="Filter" color={blue} value={fxB.filter} variant="gear" 
                  onChange={(val) => setFxB(prev => ({ ...prev, filter: val }))} 
                />
                <Knob 
                  label="Echo" color={blue} value={fxB.echo} variant="gear" 
                  onChange={(val) => setFxB(prev => ({ ...prev, echo: val }))} 
                />
                <Knob 
                  label="Reverb" color={blue} value={fxB.reverb} variant="gear" 
                  onChange={(val) => setFxB(prev => ({ ...prev, reverb: val }))} 
                />
              </>
            )}
            {modeB === 'Pads level' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <VerticalFader 
                  value={levelB} color={blue} height="h-40" handleSize="sm" handleOrientation="horizontal"
                  onChange={setLevelB} 
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-black/70">Level</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Pitch, Hot Cues */}
        {/* Pitch A with Integrated Sync */}
        <div className="opz-panel p-2 md:p-2.5 xl:p-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex flex-col items-center justify-between gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 min-w-0 border-r border-black/5" style={{ backgroundColor: '#ADADAD' }}>
          <div className="w-full max-w-[72px] md:max-w-[78px] xl:max-w-[86px] flex flex-col items-center gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1">
          <button onClick={() => syncDeckToOther('A')} className="w-full py-1 md:py-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-xl neu-button text-[10px] xl:text-[11px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold uppercase text-deck-a shrink-0 tracking-[0.14em]">Sync</button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[14px] md:text-[15px] xl:text-[16px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[12px] font-mono font-bold text-black/80">{effectiveBpmA.toFixed(1)}</div>
            <div className="text-[9px] md:text-[9.5px] xl:text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-mono font-semibold text-black/35">{pitchPercentA.toFixed(1)}%</div>
          </div>
          </div>
          <div className="flex-1 flex items-center min-h-0 py-2 md:py-3 xl:py-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-1">
            <VerticalFader value={pitchA} color={orange} height="h-44 md:h-48 xl:h-56" handleSize="sm" handleOrientation="horizontal" onChange={setPitchA} />
          </div>
        </div>

        {/* Named Hot Cues A */}
        <div className="opz-panel p-1.5 md:p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1 flex flex-col gap-1 md:gap-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-0.5 min-w-0 border-r border-black/5" style={{ backgroundColor: '#6C6C6C' }}>
          <div className="flex justify-between items-center shrink-0 gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 text-[10px] md:text-[11px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold uppercase tracking-[0.14em] md:tracking-[0.16em] flex-1 max-w-[280px] xl:max-w-[320px]">
              <button
                onClick={() => setPadModeA('hotCue')}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeA === 'hotCue' ? 'text-white border-deck-a' : 'text-black/30 border-transparent'}`}
                style={padModeA === 'hotCue' ? { textShadow: '0 0 8px rgba(255, 148, 87, 0.85), 0 0 14px rgba(255, 148, 87, 0.45)' } : undefined}
              >
                Hot Cue
              </button>
              <button
                onClick={() => setPadModeA('padFx')}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeA === 'padFx' ? 'text-white border-deck-a' : 'text-black/30 border-transparent'}`}
                style={padModeA === 'padFx' ? { textShadow: '0 0 8px rgba(255, 148, 87, 0.85), 0 0 14px rgba(255, 148, 87, 0.45)' } : undefined}
              >
                Pad FX
              </button>
              <button
                onClick={() => setPadModeA('sample')}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeA === 'sample' ? 'text-white border-deck-a' : 'text-black/30 border-transparent'}`}
                style={padModeA === 'sample' ? { textShadow: '0 0 8px rgba(255, 148, 87, 0.85), 0 0 14px rgba(255, 148, 87, 0.45)' } : undefined}
              >
                Sample
              </button>
            </div>
            <div className="shrink-0 flex items-center gap-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-0.5">
              <button className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1.5 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-lg neu-button text-[9px] md:text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] text-black/65">
                <Pencil size={11} strokeWidth={2.2} />
                <span>Edit</span>
              </button>
              {padModeA === 'hotCue' && (
                <>
                  {(['cue1', 'cue2'] as const).map((bank) => (
                    <button
                      key={bank}
                      onClick={() => setHotCueBankA(bank)}
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
                      onClick={() => setPadFxBankA(bank)}
                      className={`px-1.5 md:px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-lg text-[8px] md:text-[9px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[7px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${padFxBankA === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {padModeA === 'sample' && (
                <>
                  {(['s1', 's2'] as const).map((bank) => (
                    <button
                      key={bank}
                      onClick={() => setSampleBankA(bank)}
                      className={`px-1.5 md:px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-lg text-[8px] md:text-[9px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[7px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${sampleBankA === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-4 gap-0.5 md:gap-1 min-h-0">
            {padModeA === 'hotCue' && hotCuesA.map((cue, i) => (
              <button
                key={i}
                onClick={() => setSelectedHotCueA(i)}
                className="relative rounded-xl min-h-0 overflow-hidden border-2 flex flex-col justify-between p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-150 active:scale-[0.98]"
                style={{
                  backgroundColor: selectedHotCueA === i ? '#D8D8D8' : '#D0D0D0',
                  borderColor: selectedHotCueA === i ? cue.color : '#D0D0D0',
                  boxShadow: selectedHotCueA === i
                    ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px ${cue.color}, 0 0 18px ${cue.glow}, 0 0 28px ${cue.glow}`
                    : `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(0,0,0,0.08), 0 0 14px ${cue.glow}`,
                  transform: selectedHotCueA === i ? 'translateY(-1px)' : 'translateY(0)',
                }}
              >
                <div
                  className="absolute left-1.5 top-1.5 rounded-md px-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-1.5 py-1 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 text-[12px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[10px] font-black leading-none transition-all duration-150"
                  style={{ backgroundColor: cue.color, color: '#111111' }}
                >
                  {cue.slot}
                </div>
                <div className="flex-1" />
                <div className="space-y-1">
                  <div className="text-[18px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[15px] font-mono font-semibold tracking-tight text-[#5B5B5B]">{cue.time}</div>
                  <div className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: selectedHotCueA === i ? cue.color : '#5B5B5B' }}>{cue.name}</div>
                </div>
              </button>
            ))}
            {padModeA === 'padFx' && padFxButtonsA.map((pad) => (
              <button
                key={pad.id}
                onPointerDown={() => setActivePadFxA(pad.id)}
                onPointerUp={() => setActivePadFxA(null)}
                onPointerLeave={() => setActivePadFxA(null)}
                onPointerCancel={() => setActivePadFxA(null)}
                className="rounded-xl min-h-0 border-2 p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex flex-col justify-between text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                style={{
                  backgroundColor: activePadFxA === pad.id ? '#DADADA' : '#D0D0D0',
                  borderColor: pad.accent,
                  boxShadow: activePadFxA === pad.id
                    ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${pad.accent}, 0 0 16px ${pad.accent}55, 0 0 24px ${pad.accent}33`
                    : `inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px rgba(0,0,0,0.08)`,
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
            {padModeA === 'sample' && sampleButtonsA.map((sample) => (
              <button
                key={sample.id}
                onPointerDown={() => setActiveSampleA(sample.id)}
                onPointerUp={() => setActiveSampleA(null)}
                onPointerLeave={() => setActiveSampleA(null)}
                onPointerCancel={() => setActiveSampleA(null)}
                className="rounded-xl min-h-0 border-2 p-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex items-end justify-start text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                style={{
                  backgroundColor: activeSampleA === sample.id ? '#DADADA' : '#D0D0D0',
                  borderColor: sample.accent,
                  boxShadow: activeSampleA === sample.id
                    ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${sample.accent}, 0 0 16px ${sample.accent}55, 0 0 24px ${sample.accent}33`
                    : `inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px rgba(0,0,0,0.08)`,
                  transform: activeSampleA === sample.id ? 'translateY(1px)' : 'translateY(0)',
                }}
              >
                <span className="text-[12px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: sample.accent }}>{sample.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Central Column is spanned by the row-span-2 div above */}

        {/* Named Hot Cues B */}
        <div className="opz-panel p-1.5 md:p-2 flex flex-col gap-1 md:gap-1.5 min-w-0 border-l border-black/5" style={{ backgroundColor: '#6C6C6C' }}>
          <div className="flex justify-between items-center shrink-0 gap-1.5 md:gap-2">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] md:tracking-[0.16em] flex-1 max-w-[280px] xl:max-w-[320px]">
              <button
                onClick={() => setPadModeB('hotCue')}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeB === 'hotCue' ? 'text-white border-deck-b' : 'text-black/30 border-transparent'}`}
                style={padModeB === 'hotCue' ? { textShadow: '0 0 8px rgba(46, 141, 255, 0.9), 0 0 14px rgba(46, 141, 255, 0.5)' } : undefined}
              >
                Hot Cue
              </button>
              <button
                onClick={() => setPadModeB('padFx')}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeB === 'padFx' ? 'text-white border-deck-b' : 'text-black/30 border-transparent'}`}
                style={padModeB === 'padFx' ? { textShadow: '0 0 8px rgba(46, 141, 255, 0.9), 0 0 14px rgba(46, 141, 255, 0.5)' } : undefined}
              >
                Pad FX
              </button>
              <button
                onClick={() => setPadModeB('sample')}
                className={`min-w-0 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 text-center border-b-2 transition-colors ${padModeB === 'sample' ? 'text-white border-deck-b' : 'text-black/30 border-transparent'}`}
                style={padModeB === 'sample' ? { textShadow: '0 0 8px rgba(46, 141, 255, 0.9), 0 0 14px rgba(46, 141, 255, 0.5)' } : undefined}
              >
                Sample
              </button>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              <button className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-lg neu-button text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] text-black/65">
                <Pencil size={11} strokeWidth={2.2} />
                <span>Edit</span>
              </button>
              {padModeB === 'hotCue' && (
                <>
                  {(['cue1', 'cue2'] as const).map((bank) => (
                    <button
                      key={bank}
                      onClick={() => setHotCueBankB(bank)}
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
                      onClick={() => setPadFxBankB(bank)}
                      className={`px-1.5 md:px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${padFxBankB === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {padModeB === 'sample' && (
                <>
                  {(['s1', 's2'] as const).map((bank) => (
                    <button
                      key={bank}
                      onClick={() => setSampleBankB(bank)}
                      className={`px-1.5 md:px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] md:tracking-[0.14em] transition-colors ${sampleBankB === bank ? 'neu-button text-black/80' : 'bg-white/20 text-black/45'}`}
                    >
                      {bank.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-4 gap-0.5 md:gap-1 min-h-0">
            {padModeB === 'hotCue' && hotCuesB.map((cue, i) => (
              <button
                key={i}
                onClick={() => setSelectedHotCueB(i)}
                className="relative rounded-xl min-h-0 overflow-hidden border-2 flex flex-col justify-between p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-150 active:scale-[0.98]"
                style={{
                  backgroundColor: selectedHotCueB === i ? '#D8D8D8' : '#D0D0D0',
                  borderColor: selectedHotCueB === i ? cue.color : '#D0D0D0',
                  boxShadow: selectedHotCueB === i
                    ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px ${cue.color}, 0 0 18px ${cue.glow}, 0 0 28px ${cue.glow}`
                    : `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(0,0,0,0.08), 0 0 14px ${cue.glow}`,
                  transform: selectedHotCueB === i ? 'translateY(-1px)' : 'translateY(0)',
                }}
              >
                <div
                  className="absolute left-1.5 top-1.5 rounded-md px-2 py-1 text-[12px] font-black leading-none transition-all duration-150"
                  style={{ backgroundColor: cue.color, color: '#111111' }}
                >
                  {cue.slot}
                </div>
                <div className="flex-1" />
                <div className="space-y-1">
                  <div className="text-[18px] font-mono font-semibold tracking-tight text-[#5B5B5B]">{cue.time}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: selectedHotCueB === i ? cue.color : '#5B5B5B' }}>{cue.name}</div>
                </div>
              </button>
            ))}
            {padModeB === 'padFx' && padFxButtonsB.map((pad) => (
              <button
                key={pad.id}
                onPointerDown={() => setActivePadFxB(pad.id)}
                onPointerUp={() => setActivePadFxB(null)}
                onPointerLeave={() => setActivePadFxB(null)}
                onPointerCancel={() => setActivePadFxB(null)}
                className="rounded-xl min-h-0 border-2 p-2 flex flex-col justify-between text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                style={{
                  backgroundColor: activePadFxB === pad.id ? '#DADADA' : '#D0D0D0',
                  borderColor: pad.accent,
                  boxShadow: activePadFxB === pad.id
                    ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${pad.accent}, 0 0 16px ${pad.accent}55, 0 0 24px ${pad.accent}33`
                    : `inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px rgba(0,0,0,0.08)`,
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
            {padModeB === 'sample' && sampleButtonsB.map((sample) => (
              <button
                key={sample.id}
                onPointerDown={() => setActiveSampleB(sample.id)}
                onPointerUp={() => setActiveSampleB(null)}
                onPointerLeave={() => setActiveSampleB(null)}
                onPointerCancel={() => setActiveSampleB(null)}
                className="rounded-xl min-h-0 border-2 p-2 flex items-end justify-start text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-75 active:scale-[0.97]"
                style={{
                  backgroundColor: activeSampleB === sample.id ? '#DADADA' : '#D0D0D0',
                  borderColor: sample.accent,
                  boxShadow: activeSampleB === sample.id
                    ? `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px ${sample.accent}, 0 0 16px ${sample.accent}55, 0 0 24px ${sample.accent}33`
                    : `inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px rgba(0,0,0,0.08)`,
                  transform: activeSampleB === sample.id ? 'translateY(1px)' : 'translateY(0)',
                }}
              >
                <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: sample.accent }}>{sample.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pitch B with Integrated Sync */}
        <div className="opz-panel p-2 md:p-2.5 xl:p-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:p-1.5 flex flex-col items-center justify-between gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1 min-w-0 border-l border-black/5" style={{ backgroundColor: '#ADADAD' }}>
          <div className="w-full max-w-[72px] md:max-w-[78px] xl:max-w-[86px] flex flex-col items-center gap-1.5 md:gap-2 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1">
          <button onClick={() => syncDeckToOther('B')} className="w-full py-1 md:py-1.5 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-0.5 rounded-xl neu-button text-[10px] xl:text-[11px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold uppercase text-deck-b shrink-0 tracking-[0.14em]">Sync</button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[14px] md:text-[15px] xl:text-[16px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[12px] font-mono font-bold text-black/80">{effectiveBpmB.toFixed(1)}</div>
            <div className="text-[9px] md:text-[9.5px] xl:text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[8px] font-mono font-semibold text-black/35">{pitchPercentB.toFixed(1)}%</div>
          </div>
          </div>
          <div className="flex-1 flex items-center min-h-0 py-2 md:py-3 xl:py-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:py-1">
            <VerticalFader value={pitchB} color={blue} height="h-44 md:h-48 xl:h-56" handleSize="sm" handleOrientation="horizontal" onChange={setPitchB} />
          </div>
        </div>
      </div>

    {/* 4. Footer: Transport Controls & Crossfader - Updated button styles and shortened range */}
    <footer className="h-20 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-[calc(84px+env(safe-area-inset-bottom))] grid grid-cols-[auto_1fr_auto] gap-0 items-center [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:items-start px-6 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-4 pt-0 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:pt-2 pb-[calc(env(safe-area-inset-bottom)+4px)] shrink-0 bg-[#3C3C3C] border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
        {/* Left Controls */}
        <div className="flex items-center gap-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-1.5">
          <button 
            onClick={() => void toggleDeckPlayback('A')} 
            className={transportPlayButtonClassName}
          >
            <PlayPauseIcon />
          </button>
          <button className="px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-3 h-10 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-9 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10 group">
            <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full shadow-[0_0_10px_#FF3B30] group-hover:scale-110 transition-transform" />
          </button>
          <button className="px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-3 h-10 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-9 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10">
            <span className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold text-[#3C3C3C] tracking-widest">CUE</span>
          </button>
        </div>

        {/* Center Crossfader Section */}
        <div className="flex items-center justify-center px-8 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:pt-1 relative h-full">
          <div className="flex items-center gap-3 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:gap-2 w-full max-w-[280px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:max-w-[220px] h-10 relative">
            {/* Left Arrow Icon */}
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-white/20 border-b-[4px] border-b-transparent shrink-0" />
            
            {/* Inner Draggable Area */}
            <div
              ref={crossfaderRef}
              className="flex-1 h-full relative flex items-center touch-none cursor-ew-resize"
              onPointerDown={handleCrossfaderPointerDown}
              onPointerMove={handleCrossfaderPointerMove}
              onPointerUp={handleCrossfaderPointerUp}
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
          <button className="px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-3 h-10 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-9 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10">
            <span className="text-[10px] [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:text-[9px] font-bold text-[#3C3C3C] tracking-widest">CUE</span>
          </button>
          <button className="px-4 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:px-3 h-10 [@media(hover:none)_and_(pointer:coarse)_and_(min-width:820px)_and_(max-width:1180px)_and_(max-height:900px)]:h-9 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10 group">
            <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full shadow-[0_0_10px_#FF3B30] group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={() => void toggleDeckPlayback('B')} 
            className={transportPlayButtonClassName}
          >
            <PlayPauseIcon />
          </button>
        </div>
      </footer>

      <audio ref={audioRefA} preload="metadata" src={trackA?.src} hidden />
      <audio ref={audioRefB} preload="metadata" src={trackB?.src} hidden />
      <MusicLibraryModal
        deck={libraryDeck}
        isOpen={libraryDeck !== null}
        tracks={libraryTracks}
        currentTrackId={libraryDeck === 'A' ? trackA?.id ?? null : trackB?.id ?? null}
        onClose={closeLibrary}
        onSelectTrack={(trackId) => {
          if (!libraryDeck) return;
          selectTrackForDeck(libraryDeck, trackId);
        }}
      />

    </div>
  );
}
