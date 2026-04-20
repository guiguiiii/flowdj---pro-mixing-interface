/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
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
import { MOCK_TRACKS, Track } from './types';
import {
  getCrossfaderHandleLeft,
  getCrossfaderValueFromPointer,
  getVerticalFaderHandleBottom,
  getVerticalFaderValueFromPointer,
} from './crossfader.js';
import { getKnobValueFromHorizontalDrag } from './knob.js';

const figmaPlayIconSrc = 'https://www.figma.com/api/mcp/asset/0ed6981b-0a24-4450-bc45-ed115813312b';
const PlayPauseIcon = ({ width = 28, height = 18 }: { width?: number; height?: number }) => (
  <img
    src={figmaPlayIconSrc}
    alt=""
    width={width}
    height={height}
    className="block object-contain select-none pointer-events-none"
    aria-hidden="true"
    draggable={false}
  />
);

const transportPlayButtonClassName =
  "w-14 h-10 rounded-[12px] flex items-center justify-center border border-white/10 bg-[#D0D0D0] shadow-[-2px_-2px_4px_rgba(78,78,78,0.12),2px_2px_4px_rgba(42,42,42,0.35)] transition-transform duration-150 hover:scale-[1.02] active:scale-95 active:shadow-[inset_-2px_-2px_4px_rgba(78,78,78,0.12),inset_2px_2px_4px_rgba(42,42,42,0.3)]";

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
          <motion.div 
            className="relative w-full h-full flex items-center justify-center pointer-events-none"
            animate={{ rotate: rotation }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
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
          </motion.div>
        ) : (
          <div className="w-full h-full rounded-full bg-[#D0D0D0] relative flex items-center justify-center shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.4)] pointer-events-none">
            {/* Center-aligned indicator container */}
            <motion.div 
              className="absolute inset-0 flex items-start justify-center pt-2.5"
              animate={{ rotate: (value - 50) * 2.4 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            </motion.div>
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

const HorizontalWaveform = ({ color, active }: { color: string, active: boolean }) => (
  <div className="h-8 w-full bg-black/40 rounded border border-white/5 overflow-hidden relative">
    <div className="absolute inset-0 flex items-center gap-0.5 px-1">
      {Array.from({ length: 100 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: active ? [4, Math.random() * 20 + 4, 4] : 4 }}
          transition={{ repeat: Infinity, duration: 0.5 + Math.random() }}
          className="w-0.5 rounded-full"
          style={{ backgroundColor: color, opacity: active ? 0.6 : 0.2 }}
        />
      ))}
    </div>
    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40 z-10" />
  </div>
);

const VerticalWaveform = ({ color, active, bpm }: { color: string, active: boolean, bpm: number }) => (
  <div className="flex-1 h-full relative bg-black/60 border-x border-white/5 overflow-hidden">
    {/* BPM Header */}
    <div className="absolute top-0 inset-x-0 h-6 bg-black/90 flex items-center justify-center border-b border-white/10 z-20">
      <span className="text-[9px] font-mono font-bold" style={{ color }}>{bpm} BPM</span>
    </div>
    
    {/* Beat Markers */}
    <div className="absolute inset-0 flex flex-col justify-around pointer-events-none opacity-10">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="w-full h-px bg-white" />
      ))}
    </div>

    {/* Multi-color Frequency Waveform */}
    <div className="absolute inset-0 flex flex-col items-center justify-around py-8">
      {Array.from({ length: 100 }).map((_, i) => {
        const freqColor = i % 5 === 0 ? '#ff3b30' : i % 3 === 0 ? '#4cd964' : color;
        return (
          <motion.div
            key={i}
            animate={{ width: active ? [2, Math.random() * 70 + 5, 2] : 4 }}
            transition={{ repeat: Infinity, duration: 0.2 + Math.random() * 0.4 }}
            className="h-0.5 rounded-full"
            style={{ backgroundColor: freqColor, opacity: active ? 0.9 : 0.2 }}
          />
        );
      })}
    </div>
  </div>
);

const DeckDisplay = ({ color, active, bpm, time, title, artist }: { color: string, active: boolean, bpm: number, time: string, title: string, artist: string }) => {
  const orbitSize = 214;
  const orbitDotSize = 18;
  const orbitStartAngle = 45;

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full relative p-1 min-w-0">
      {/* Circular Data Meter - Enlarged by another 20% while keeping container height fixed */}
      <div className="relative w-[185px] h-[185px] rounded-full neu-convex border-[6px] border-[#D1D1D1] flex flex-col items-center justify-center shadow-xl overflow-visible shrink-0">
      {/* Outer Orbit Track & Moving Dot */}
      <div
        className="absolute pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: orbitSize, height: orbitSize }}
      >
        <div className="absolute inset-0 rounded-full border-[2px]" style={{ borderColor: 'rgba(138, 138, 138, 0.5)' }} />
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: active ? 360 : 0 }}
          transition={{ repeat: active ? Infinity : 0, duration: 2, ease: 'linear' }}
          style={{ transformOrigin: '50% 50%' }}
        >
          <div
            className="absolute rounded-full left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: orbitDotSize,
              height: orbitDotSize,
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
              transform: `translate(-50%, -50%) rotate(${orbitStartAngle}deg)`,
            }}
          />
        </motion.div>
      </div>

      {/* Inner Shadow Ring */}
      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.15)] pointer-events-none" />
      
      {/* Main BPM Display */}
      <div className="text-[35px] font-mono font-bold leading-none tracking-tighter text-black/80">{bpm.toFixed(1)}</div>
      
      {/* Bottom Info Row (BPM Label, Pitch, Range) */}
      <div className="relative w-full flex items-center justify-center px-6 mb-2">
        <div className="absolute left-3 text-[12px] font-mono font-bold text-black/50">+0.0%</div>
        <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-black/40">BPM</div>
        <div className="absolute right-3 flex items-center gap-0.5 px-1 rounded bg-black/5 border border-black/10">
          <span className="text-[7px] font-bold text-black/40">±</span>
          <span className="text-[12px] font-mono font-bold text-black/60">8</span>
        </div>
      </div>
      
      {/* Time Display */}
      <div className="flex flex-col items-center w-28 mt-2">
        <div className="w-full h-[3px] rounded-full mb-2" style={{ backgroundColor: color }} />
        <div className="text-[17px] font-mono font-bold text-black/90 tracking-tight">{time}</div>
        <div className="text-[13px] font-mono font-bold text-black/50 leading-none">03:36.4</div>
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
          animate={{ strokeDashoffset: active ? 100 : 304.7 }}
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

// --- Main Application ---

export default function App() {
  const [trackA, setTrackA] = useState<Track | null>(MOCK_TRACKS[0]);
  const [trackB, setTrackB] = useState<Track | null>(MOCK_TRACKS[1]);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [crossfader, setCrossfader] = useState(50);
  const crossfaderRef = useRef<HTMLDivElement>(null);
  const crossfaderHandleRef = useRef<HTMLDivElement>(null);
  const [isCrossfaderDragging, setIsCrossfaderDragging] = useState(false);
  const [crossfaderMetrics, setCrossfaderMetrics] = useState({ trackWidth: 0, handleWidth: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  
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
  const crossfaderHandleLeft = getCrossfaderHandleLeft({
    value: crossfader,
    trackWidth: crossfaderMetrics.trackWidth,
    handleWidth: crossfaderMetrics.handleWidth,
  });

  const hotCues = [
    { name: 'Start', color: '#ff3b30' },
    { name: 'Intro', color: '#ff9500' },
    { name: 'Build', color: '#007aff' },
    { name: 'Drop', color: '#ffcc00' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-base-grey select-none overflow-hidden text-gray-900 font-sans">
      
      {/* 1. Header: Song Information & Global Controls - Further shrunk height and updated color */}
      <header className="h-16 grid grid-cols-[1fr_auto_1fr] bg-[#3C3C3C] shrink-0 z-50 border-b border-white/10">
        {/* Deck A Section */}
        <div className="flex bg-[#3C3C3C] relative overflow-hidden group border-r border-white/5">
          {/* Artwork - Flush with top and left */}
          <div className="h-full aspect-square relative shrink-0">
            <img src={trackA?.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Artwork A" />
            {/* Library Icon - Bottom Left of artwork */}
            <button className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 shadow-lg border border-white/10">
              <ListMusic size={12} />
            </button>
          </div>

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
              <div className="text-white text-[12px] font-mono font-bold tracking-tighter">-01:48</div>
            </div>
            
            {/* Artist Row */}
            <div className="mb-0.5">
              <p className="text-white/40 text-[8px] uppercase font-bold tracking-widest truncate">{trackA?.artist}</p>
            </div>
            
            {/* Waveform Area - Next to artwork */}
            <div className="flex-1 flex items-end">
              <div className="w-full h-5 opacity-90">
                <HorizontalWaveform color={orange} active={isPlayingA} />
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
          <div className="h-full aspect-square relative shrink-0">
            <img src={trackB?.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Artwork B" />
            {/* Library Icon - Bottom Right of artwork */}
            <button className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded bg-black/60 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 shadow-lg border border-white/10">
              <ListMusic size={12} />
            </button>
          </div>

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
              <div className="text-white text-[12px] font-mono font-bold tracking-tighter">-03:20</div>
            </div>
            
            {/* Artist Row */}
            <div className="mb-0.5">
              <p className="text-white/40 text-[8px] uppercase font-bold tracking-widest truncate">{trackB?.artist}</p>
            </div>
            
            {/* Waveform Area - Next to artwork */}
            <div className="flex-1 flex items-end">
              <div className="w-full h-5 opacity-90">
                <HorizontalWaveform color={blue} active={isPlayingB} />
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* 2 & 3. Middle & Bottom Sections: Unified Grid with Spanning Waveforms */}
      <div className="flex-1 grid grid-cols-[100px_1fr_160px_1fr_100px] grid-rows-2 gap-0 overflow-hidden">
        
        {/* Row 1: Side Panels, Deck Displays */}
        {/* Left Side Panel */}
        <div className="p-2 flex flex-col min-w-0 border-r border-black/5 border-b border-black/10 relative shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] overflow-hidden" style={{ backgroundColor: '#ADADAD' }}>
          {/* Mode Selector Header - Unified 2-Tier Layout */}
          <div className="flex flex-col border-b border-black/20 -mx-2 -mt-2 mb-1 bg-[#D0D0D0] overflow-hidden shrink-0">
            {/* Top Tier: Title (Fixed Height) */}
            <div className="h-7 flex items-center justify-center border-b border-black/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              <div className="text-[11px] font-bold uppercase tracking-widest text-black/80 whitespace-nowrap">{modeA}</div>
            </div>
            {/* Bottom Tier: Navigation Buttons (Fixed Height) */}
            <div className="h-7 flex">
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
          
          <div className="flex-1 flex flex-col justify-center gap-0.5 py-0 min-h-0">
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
                  value={levelA} color={orange} height="h-28" 
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
            bpm={122.0} 
            time="01:19.7" 
            title={trackA?.title || ""} 
            artist={trackA?.artist || ""} 
          />
        </div>

        {/* Central Vertical Waveforms & VU Meters - Spanning 2 rows */}
        <div className="row-span-2 opz-panel flex overflow-hidden relative p-1 gap-1 min-w-0 border-x border-black/5">
          <VerticalWaveform color={orange} active={isPlayingA} bpm={122.0} />
          <VUMeter color={orange} active={isPlayingA} />
          <VUMeter color={blue} active={isPlayingB} />
          <VerticalWaveform color={blue} active={isPlayingB} bpm={120.0} />
          <div className="absolute inset-x-0 top-1/2 h-1 bg-white z-30 rounded-full" />
        </div>

        {/* Deck Display B */}
        <div className="flex items-center justify-center relative overflow-hidden min-w-0 border-l border-black/5 border-b border-black/10 bg-[#D0D0D0] shadow-[1px_1px_2px_#b1b1b1,-1px_-1px_2px_#f1f1f1]">
          <DeckDisplay 
            color={blue} 
            active={isPlayingB} 
            bpm={120.0} 
            time="02:12.4" 
            title={trackB?.title || ""} 
            artist={trackB?.artist || ""} 
          />
        </div>

        {/* Right Side Panel */}
        <div className="p-2 flex flex-col min-w-0 border-l border-black/5 border-b border-black/10 relative shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] overflow-hidden" style={{ backgroundColor: '#ADADAD' }}>
          {/* Mode Selector Header - Unified 2-Tier Layout */}
          <div className="flex flex-col border-b border-black/20 -mx-2 -mt-2 mb-1 bg-[#D0D0D0] overflow-hidden shrink-0">
            {/* Top Tier: Title (Fixed Height) */}
            <div className="h-7 flex items-center justify-center border-b border-black/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              <div className="text-[11px] font-bold uppercase tracking-widest text-black/80 whitespace-nowrap">{modeB}</div>
            </div>
            {/* Bottom Tier: Navigation Buttons (Fixed Height) */}
            <div className="h-7 flex">
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

          <div className="flex-1 flex flex-col justify-center gap-0.5 py-0 min-h-0">
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
                  value={levelB} color={blue} height="h-28" 
                  onChange={setLevelB} 
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-black/70">Level</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Pitch, Hot Cues */}
        {/* Pitch A with Integrated Sync */}
        <div className="opz-panel p-2 flex flex-col items-center gap-1.5 min-w-0 border-r border-black/5" style={{ backgroundColor: '#ADADAD' }}>
          <button className="w-full py-1.5 rounded-xl neu-button text-[11px] font-bold uppercase text-deck-a shrink-0">Sync</button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[14px] font-mono font-bold text-black/80">122.0</div>
            <div className="text-[9px] font-mono font-semibold text-black/35">{(pitchA - 50).toFixed(1)}%</div>
          </div>
          <div className="flex-1 flex items-center min-h-0 py-2">
            <VerticalFader value={pitchA} color={orange} height="h-40" handleSize="sm" handleOrientation="horizontal" onChange={setPitchA} />
          </div>
        </div>

        {/* Named Hot Cues A */}
        <div className="opz-panel p-2 flex flex-col gap-1.5 min-w-0 border-r border-black/5">
          <div className="flex justify-between items-center shrink-0">
            <div className="flex gap-2 text-[8px] font-bold uppercase tracking-widest">
              <span className="text-deck-a border-b-2 border-deck-a">Hot Cue</span>
              <span className="text-black/20">Pad FX</span>
              <span className="text-black/20">Sample</span>
            </div>
            <div className="flex gap-1">
              {['1/8', '1/4', '1/2', '1'].map(l => (
                <button key={l} className="px-1 py-0.5 rounded-lg neu-button text-[7px] font-bold text-black/60">{l}</button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-4 gap-1 min-h-0">
            {hotCues.map((cue, i) => (
              <button key={i} className="rounded-lg neu-button flex flex-col items-center justify-center gap-0.5 min-h-0">
                <div className="w-1.5 h-1.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: cue.color }} />
                <span className="text-[6px] font-bold uppercase tracking-tighter text-black/50 truncate w-full px-0.5 text-center">{cue.name}</span>
              </button>
            ))}
          </div>

          {/* Neural Mix Quick Toggles */}
          <div className="grid grid-cols-4 gap-1 border-t border-black/5 pt-1 shrink-0">
            {['Vocal', 'Melody', 'Bass', 'Drums'].map((stem, i) => (
              <button key={stem} className={`py-0.5 rounded-lg neu-button text-[6px] font-bold uppercase ${i === 0 ? 'text-deck-a' : 'text-black/40'}`}>{stem}</button>
            ))}
          </div>
        </div>

        {/* Central Column is spanned by the row-span-2 div above */}

        {/* Named Hot Cues B */}
        <div className="opz-panel p-2 flex flex-col gap-1.5 min-w-0 border-l border-black/5">
          <div className="flex justify-between items-center shrink-0">
            <div className="flex gap-2 text-[8px] font-bold uppercase tracking-widest">
              <span className="text-deck-b border-b-2 border-deck-b">Hot Cue</span>
              <span className="text-black/20">Pad FX</span>
              <span className="text-black/20">Sample</span>
            </div>
            <div className="flex gap-1">
              {['1/8', '1/4', '1/2', '1'].map(l => (
                <button key={l} className="px-1 py-0.5 rounded-lg neu-button text-[7px] font-bold text-black/60">{l}</button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-4 gap-1 min-h-0">
            {hotCues.map((cue, i) => (
              <button key={i} className="rounded-lg neu-button flex flex-col items-center justify-center gap-0.5 min-h-0">
                <div className="w-1.5 h-1.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: cue.color }} />
                <span className="text-[6px] font-bold uppercase tracking-tighter text-black/50 truncate w-full px-0.5 text-center">{cue.name}</span>
              </button>
            ))}
          </div>

          {/* Neural Mix Quick Toggles */}
          <div className="grid grid-cols-4 gap-1 border-t border-black/5 pt-1 shrink-0">
            {['Vocal', 'Melody', 'Bass', 'Drums'].map((stem, i) => (
              <button key={stem} className={`py-0.5 rounded-lg neu-button text-[6px] font-bold uppercase ${i === 0 ? 'text-deck-b' : 'text-black/40'}`}>{stem}</button>
            ))}
          </div>
        </div>

        {/* Pitch B with Integrated Sync */}
        <div className="opz-panel p-2 flex flex-col items-center gap-1.5 min-w-0 border-l border-black/5" style={{ backgroundColor: '#ADADAD' }}>
          <button className="w-full py-1.5 rounded-xl neu-button text-[11px] font-bold uppercase text-deck-b shrink-0">Sync</button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[14px] font-mono font-bold text-black/80">120.0</div>
            <div className="text-[9px] font-mono font-semibold text-black/35">{(pitchB - 50).toFixed(1)}%</div>
          </div>
          <div className="flex-1 flex items-center min-h-0 py-2">
            <VerticalFader value={pitchB} color={blue} height="h-40" handleSize="sm" handleOrientation="horizontal" onChange={setPitchB} />
          </div>
        </div>
      </div>

    {/* 4. Footer: Transport Controls & Crossfader - Updated button styles and shortened range */}
    <footer className="h-20 grid grid-cols-[auto_1fr_auto] gap-0 items-center px-6 shrink-0 bg-[#3C3C3C] border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlayingA(!isPlayingA)} 
            className={transportPlayButtonClassName}
          >
            <PlayPauseIcon />
          </button>
          <button className="px-4 h-10 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10 group">
            <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full shadow-[0_0_10px_#FF3B30] group-hover:scale-110 transition-transform" />
          </button>
          <button className="px-4 h-10 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10">
            <span className="text-[10px] font-bold text-[#3C3C3C] tracking-widest">CUE</span>
          </button>
        </div>

        {/* Center Crossfader Section */}
        <div className="flex items-center justify-center px-8 relative h-full">
          <div className="flex items-center gap-3 w-full max-w-[280px] h-10 relative">
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
        <div className="flex items-center gap-3">
          <button className="px-4 h-10 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10">
            <span className="text-[10px] font-bold text-[#3C3C3C] tracking-widest">CUE</span>
          </button>
          <button className="px-4 h-10 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10 group">
            <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full shadow-[0_0_10px_#FF3B30] group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={() => setIsPlayingB(!isPlayingB)} 
            className={transportPlayButtonClassName}
          >
            <PlayPauseIcon />
          </button>
        </div>
      </footer>

    </div>
  );
}
