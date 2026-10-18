/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Minus, Plus, Edit2, Check } from 'lucide-react';

interface ModernSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  helperText?: string;
  accentColor?: 'blue' | 'amber' | 'teal' | 'purple' | 'emerald';
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
}

export const ModernSlider: React.FC<ModernSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  helperText,
  accentColor = 'blue',
  onChange,
  formatValue,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempInput, setTempInput] = useState(value.toString());

  useEffect(() => {
    setTempInput(value.toString());
  }, [value]);

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleDecrement = () => {
    const next = Math.max(min, Number((value - step).toFixed(3)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((value + step).toFixed(3)));
    onChange(next);
  };

  const handleInputSubmit = () => {
    const parsed = parseFloat(tempInput);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(Number(clamped.toFixed(3)));
    } else {
      setTempInput(value.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setTempInput(value.toString());
      setIsEditing(false);
    }
  };

  const colorConfig = {
    blue: {
      gradient: 'from-blue-600 to-indigo-600',
      thumbBorder: 'border-blue-600',
      thumbGlow: 'shadow-[0_0_8px_rgba(37,99,235,0.4)]',
      badge: 'bg-blue-50/90 text-blue-700 border-blue-200 hover:border-blue-300',
      button: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600',
      ring: 'focus:ring-blue-500',
    },
    amber: {
      gradient: 'from-amber-500 to-orange-600',
      thumbBorder: 'border-amber-600',
      thumbGlow: 'shadow-[0_0_8px_rgba(217,119,6,0.4)]',
      badge: 'bg-amber-50/90 text-amber-800 border-amber-200 hover:border-amber-300',
      button: 'hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 text-slate-600',
      ring: 'focus:ring-amber-500',
    },
    teal: {
      gradient: 'from-teal-500 to-emerald-600',
      thumbBorder: 'border-teal-600',
      thumbGlow: 'shadow-[0_0_8px_rgba(13,148,136,0.4)]',
      badge: 'bg-teal-50/90 text-teal-800 border-teal-200 hover:border-teal-300',
      button: 'hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 text-slate-600',
      ring: 'focus:ring-teal-500',
    },
    purple: {
      gradient: 'from-purple-500 to-violet-600',
      thumbBorder: 'border-purple-600',
      thumbGlow: 'shadow-[0_0_8px_rgba(147,51,234,0.4)]',
      badge: 'bg-purple-50/90 text-purple-800 border-purple-200 hover:border-purple-300',
      button: 'hover:bg-purple-50 hover:text-purple-800 hover:border-purple-200 text-slate-600',
      ring: 'focus:ring-purple-500',
    },
    emerald: {
      gradient: 'from-emerald-500 to-teal-600',
      thumbBorder: 'border-emerald-600',
      thumbGlow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]',
      badge: 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:border-emerald-300',
      button: 'hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 text-slate-600',
      ring: 'focus:ring-emerald-500',
    },
  }[accentColor] || {
    gradient: 'from-blue-600 to-indigo-600',
    thumbBorder: 'border-blue-600',
    thumbGlow: 'shadow-[0_0_8px_rgba(37,99,235,0.4)]',
    badge: 'bg-blue-50/90 text-blue-700 border-blue-200 hover:border-blue-300',
    button: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600',
    ring: 'focus:ring-blue-500',
  };

  const displayVal = formatValue ? formatValue(value) : `${value} ${unit}`.trim();

  return (
    <div className="space-y-1.5 select-none">
      {/* Header: Label and Direct-Input/Badge */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-semibold text-slate-800 text-[11px] truncate">
          {label}
        </label>

        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={tempInput}
              min={min}
              max={max}
              step={step}
              autoFocus
              onChange={(e) => setTempInput(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleKeyDown}
              className={`w-16 px-1.5 py-0.5 text-[11px] font-mono text-center font-bold bg-white border rounded shadow-inner outline-hidden ${colorConfig.ring}`}
            />
            <button
              type="button"
              onClick={handleInputSubmit}
              className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
              title="Apply value"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Click to edit value directly"
            className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border shadow-2xs transition-all cursor-text ${colorConfig.badge}`}
          >
            <span>{displayVal}</span>
            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}
      </div>

      {/* Modern High-Precision Slider Track */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          aria-label={`Decrease ${label}`}
          title={`Decrease by ${step}`}
          className={`w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 transition-all active:scale-95 shrink-0 shadow-2xs ${colorConfig.button}`}
        >
          <Minus className="w-3 h-3" />
        </button>

        <div className="relative flex-1 flex items-center h-6 group">
          {/* Track background */}
          <div className="w-full h-2 bg-slate-100 rounded-full border border-slate-200/80 relative overflow-hidden">
            {/* Active filled gradient bar */}
            <div
              className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${colorConfig.gradient} rounded-full transition-all duration-75`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Precision Native Input Slider positioned over the track */}
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* Modern Visual Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 ${colorConfig.thumbBorder} ${colorConfig.thumbGlow} pointer-events-none transition-transform group-hover:scale-110 active:scale-125 z-10 flex items-center justify-center`}
            style={{ left: `${percentage}%` }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${colorConfig.gradient.replace('from-', 'bg-').split(' ')[0]}`} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          aria-label={`Increase ${label}`}
          title={`Increase by ${step}`}
          className={`w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 transition-all active:scale-95 shrink-0 shadow-2xs ${colorConfig.button}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Helper text with limits */}
      {helperText && (
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
          <span className="truncate max-w-[70%]">{helperText}</span>
          <span className="shrink-0">{min}{unit}–{max}{unit}</span>
        </div>
      )}
    </div>
  );
};
