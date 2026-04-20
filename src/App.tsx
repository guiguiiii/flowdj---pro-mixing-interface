/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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

const PlayPauseIcon = ({ size = 26, color = "currentColor" }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
    {/* Two bars and a triangle for the specific DJ style play icon - Bolder as per play_2.png */}
    <rect x="2" y="4" width="3.5" height="16" rx="1.5" fill={color} />
    <rect x="7.5" y="4" width="3.5" height="16" rx="1.5" fill={color} />
    <path d="M14 4l9 8-9 8V4z" fill={color} />
  </svg>
);

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
  const startY = useRef(0);
  const startValue = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY;
    const sensitivity = 0.6;
    const newValue = Math.min(100, Math.max(0, startValue.current + deltaY * sensitivity));
    onChange(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col items-center gap-0 shrink-0">
      <div 
        className={`relative ${size === 'sm' ? 'w-11 h-11' : 'w-14 h-14'} flex items-center justify-center cursor-pointer active:scale-95 transition-all touch-none`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {variant === 'gear' ? (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center pointer-events-none"
            animate={{ rotate: (value - 50) * 2.4 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            {/* Entire Gear Body - Center shifted to 50,50 for perfect rotation */}
            <svg className="absolute inset-0 w-full h-full drop-shadow-[1.5px_2.5px_4px_rgba(0,0,0,0.35)]" viewBox="0 0 100 100">
              <path 
                d="M50,5 
                   C58,5 60,13 67,15 
                   C73,17 80,15 83,21 
                   C86,27 84,34 88,39 
                   C92,44 95,45 95,50 
                   C95,55 92,56 88,61 
                   C84,66 86,73 83,79 
                   C80,85 73,83 67,85 
                   C60,87 58,95 50,95 
                   C42,95 40,87 33,85 
                   C27,83 20,85 17,79 
                   C14,73 16,66 12,61 
                   C8,56 5,55 5,50 
                   C5,45 8,44 12,39 
                   C16,34 14,27 17,21 
                   C20,15 27,17 33,15 
                   C40,13 42,5 50,5Z" 
                fill="#D0D0D0" 
              />
              {/* Inner top face shading to create depth */}
              <circle cx="50" cy="50" r="32" fill="#D0D0D0" className="opacity-70" />
              
              {/* Engraved Ring Groove - Centered */}
              <circle 
                cx="50" cy="50" r="23" 
                fill="none" 
                stroke="#000000" 
                strokeOpacity="0.25" 
                strokeWidth="5" 
              />
              <circle 
                cx="50" cy="50" r="23" 
                fill="none" 
                stroke={color} 
                strokeOpacity="0.95" 
                strokeWidth="3.5" 
              />
  
              {/* Engraved Dot Groove - Shifted up to match new center */}
              <circle 
                cx="50" cy="37" r="5" 
                fill="#000000" 
                fillOpacity="0.18" 
              />
              <circle 
                cx="50" cy="37" r="3.2" 
                fill={color} 
                fillOpacity="1" 
              />
            </svg>
  
            {/* Subtle light reflections on the top surface */}
            <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-white/45 to-transparent pointer-events-none" />
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
      <span className="text-[8.5px] font-bold uppercase tracking-widest text-black/85 pointer-events-none">{label}</span>
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
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [faderMetrics, setFaderMetrics] = useState({ trackHeight: 0, handleHeight: 0 });

  useEffect(() => {
    const updateFaderMetrics = () => {
      setFaderMetrics({
        trackHeight: containerRef.current?.clientHeight ?? 0,
        handleHeight: handleRef.current?.offsetHeight ?? 0,
      });
    };

    updateFaderMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateFaderMetrics();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
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
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    onChange(
      getVerticalFaderValueFromPointer({
        pointerY: clientY,
        trackTop: rect.top,
        trackHeight: rect.height,
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
    trackHeight: faderMetrics.trackHeight,
    handleHeight: faderMetrics.handleHeight,
  });

  return (
    <div 
      ref={containerRef}
      className={`w-12 ${height} bg-black/30 rounded-xl relative flex justify-center py-4 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)] cursor-ns-resize touch-none`}
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
      
      <div className="w-[3px] h-full bg-black/40 rounded-full relative pointer-events-none shadow-inner">
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2 z-10"
          ref={handleRef}
          animate={{ bottom: handleBottom }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
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

const DeckDisplay = ({ color, active, bpm, time, title, artist }: { color: string, active: boolean, bpm: number, time: string, title: string, artist: string }) => (
  <div className="flex flex-col items-center justify-center gap-1 w-full h-full relative p-1 min-w-0">
    {/* Circular Data Meter - Enlarged by another 20% while keeping container height fixed */}
    <div className="relative w-[185px] h-[185px] rounded-full neu-convex border-[6px] border-[#D1D1D1] flex flex-col items-center justify-center shadow-xl overflow-hidden shrink-0">
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

      {/* Progress Ring & Needle - Moved to outermost edge with fixed concentric rotation */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
        {/* Background Track (Remaining Progress) - Moved further out */}
        <circle 
          cx="50" cy="50" r="48.5" 
          fill="none" stroke="#7B7B7B" strokeWidth="0.8" 
          strokeOpacity="0.2"
        />
        {/* Active Progress - Moved further out */}
        <motion.circle 
          cx="50" cy="50" r="48.5" 
          fill="none" stroke={color} strokeWidth="1.5" 
          strokeDasharray="304.7" 
          animate={{ strokeDashoffset: active ? 100 : 304.7 }}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
        {/* Needle Indicator - Moved to the absolute perimeter */}
        <motion.g
          animate={{ rotate: active ? 360 : 0 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          style={{ originX: "50%", originY: "50%" }}
        >
          <circle 
            cx="50" cy="1.5" r="2.5" 
            fill={color} 
            className="shadow-sm"
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          />
        </motion.g>
      </svg>
    </div>
  </div>
);

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
                  label="Hi" color="#95ed21" value={mixerA.hi} variant="gear" 
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
                  label="Hi" color="#95ed21" value={mixerB.hi} variant="gear" 
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
          <button className="w-full py-1 rounded-xl neu-button text-[9px] font-bold uppercase text-deck-a shrink-0">Sync</button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[10px] font-mono font-bold text-black/80">122.0</div>
            <div className="text-[7px] font-mono text-black/30">{(pitchA - 50).toFixed(1)}%</div>
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
          <button className="w-full py-1 rounded-xl neu-button text-[9px] font-bold uppercase text-deck-b shrink-0">Sync</button>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="text-[10px] font-mono font-bold text-black/80">120.0</div>
            <div className="text-[7px] font-mono text-black/30">{(pitchB - 50).toFixed(1)}%</div>
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
            className="w-14 h-10 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10"
          >
            <PlayPauseIcon color="#3C3C3C" />
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
            className="w-14 h-10 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_4px_#2a2a2a,-2px_-2px_4px_#4e4e4e] active:shadow-[inset_2px_2px_4px_#2a2a2a,inset_-2px_-2px_4px_#4e4e4e] active:scale-95 bg-[#D0D0D0] border border-white/10"
          >
            <PlayPauseIcon color="#3C3C3C" />
          </button>
        </div>
      </footer>

    </div>
  );
}
