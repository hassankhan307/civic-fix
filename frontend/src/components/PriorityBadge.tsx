import React from 'react';
import { cn } from '../lib/utils';

interface PriorityBadgeProps {
  score: number;
  level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  className?: string;
  showBar?: boolean;
}

export function PriorityBadge({
  score,
  level,
  className,
  showBar = false,
}: PriorityBadgeProps) {
  // Infer level from score if not passed
  let resolvedLevel = (level || '').toUpperCase();
  if (!resolvedLevel) {
    if (score >= 75) resolvedLevel = 'CRITICAL';
    else if (score >= 50) resolvedLevel = 'HIGH';
    else if (score >= 25) resolvedLevel = 'MEDIUM';
    else resolvedLevel = 'LOW';
  }

  const colorStyles: Record<string, { bg: string; text: string; bar: string }> = {
    LOW: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    MEDIUM: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
    HIGH: { bg: 'bg-orange-50 text-orange-800 border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
    CRITICAL: { bg: 'bg-red-50 text-red-800 border-red-300 font-bold', text: 'text-red-700', bar: 'bg-red-600' },
  };

  const style = colorStyles[resolvedLevel] || colorStyles.LOW;

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold',
          style.bg
        )}
      >
        <span>Score {Math.round(score)}</span>
        <span className="opacity-60">•</span>
        <span>{resolvedLevel}</span>
      </div>
      {showBar && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', style.bar)}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
    </div>
  );
}
